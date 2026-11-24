import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

function resolveReference(spec, value) {
  const visited = new Set();
  while (value?.$ref) {
    const reference = value.$ref;
    if (!reference.startsWith('#/') || visited.has(reference)) {
      throw new Error('Cannot resolve mock reference: ' + reference);
    }
    visited.add(reference);
    value = decodeURIComponent(reference.slice(2)).split('/').reduce((node, key) => {
      return node?.[key.replaceAll('~1', '/').replaceAll('~0', '~')];
    }, spec);
    if (!value) throw new Error('Missing mock reference: ' + reference);
  }
  return value;
}

function responseExample(spec, media) {
  if (!media) return undefined;
  if (Object.hasOwn(media, 'example')) return media.example;
  const examples = Object.values(media.examples ?? {});
  if (examples.length) return resolveReference(spec, examples[0]).value;
  const schema = resolveReference(spec, media.schema);
  return schema?.examples?.[0] ?? schema?.example;
}

function writeResponse(res, status, headers = {}, body) {
  res.writeHead(status, headers);
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function problem(res, status, code, title, headers = {}) {
  writeResponse(res, status, { ...headers, 'content-type': 'application/problem+json' }, {
    type: 'urn:campus-lost-found:problem:' + code.toLowerCase().replaceAll('_', '-'),
    title,
    status,
    code,
  });
}

function buildRoutes(spec) {
  const prefix = spec.servers?.[0]?.url;
  if (!prefix?.startsWith('/') || prefix.startsWith('//')) {
    throw new Error('The contract must use a relative server path, such as /api/v1.');
  }

  return Object.entries(spec.paths).map(([path, definition]) => {
    const item = resolveReference(spec, definition);
    const segments = (prefix.replace(/\/$/, '') + path).split('/');
    const methods = Object.keys(item).filter(method => httpMethods.has(method));
    return { segments, item, methods };
  }).sort((a, b) => {
    for (let index = 0; index < Math.min(a.segments.length, b.segments.length); index++) {
      const difference = Number(a.segments[index].startsWith('{')) - Number(b.segments[index].startsWith('{'));
      if (difference) return difference;
    }
    return b.segments.length - a.segments.length;
  });
}

function match(route, segments) {
  return route.segments.length === segments.length && route.segments.every((part, index) => {
    return part.startsWith('{') ? Boolean(segments[index]) : part === segments[index];
  });
}

function responseHeaders(spec, definition, route, segments, body) {
  const pathValues = Object.fromEntries(route.segments.flatMap((part, index) => {
    return part.startsWith('{') ? [[part.slice(1, -1), segments[index]]] : [];
  }));
  const headers = {};

  for (const [name, value] of Object.entries(definition.headers ?? {})) {
    const header = resolveReference(spec, value);
    const schema = resolveReference(spec, header.schema);
    const example = header.example ?? schema?.example ?? schema?.examples?.[0] ?? schema?.const;
    if (example !== undefined) {
      headers[name] = String(example);
    } else if (name.toLowerCase() === 'location') {
      // The v1 contract documents Location templates in the header description.
      const template = header.description?.match(/\/api\/v1\/[\w/{}-]+/)?.[0];
      if (template) {
        headers[name] = template.replace(/\{([^}]+)\}/g, (_, key) => {
          return pathValues[key] ?? encodeURIComponent(body?.[key] ?? 'item-123');
        });
      }
    }
  }

  return headers;
}

export function createMockHandler(spec) {
  const routes = buildRoutes(spec);
  return (req, res) => {
    req.resume();
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'Authorization, Content-Type, Idempotency-Key, Prefer');
    res.setHeader('access-control-expose-headers', 'Location, Preference-Applied, Retry-After, WWW-Authenticate');
    const segments = req.url.split('?')[0].split('/');
    const route = routes.find(candidate => match(candidate, segments));
    if (!route) return problem(res, 404, 'RESOURCE_NOT_FOUND', 'Mock route not found.');

    if (req.method === 'OPTIONS') {
      const allowed = [...route.methods.map(method => method.toUpperCase()), 'OPTIONS'];
      return writeResponse(res, 204, { 'access-control-allow-methods': allowed.join(', ') });
    }

    const method = req.method.toLowerCase();
    if (!route.methods.includes(method)) {
      return problem(res, 405, 'METHOD_NOT_ALLOWED', 'Method not declared for this route.', {
        allow: route.methods.map(name => name.toUpperCase()).join(', '),
      });
    }

    const operation = route.item[method];
    const security = operation.security ?? spec.security ?? [];
    const needsBearer = security.length > 0 && security.every(requirement => Object.keys(requirement).length > 0);
    const successCodes = Object.keys(operation.responses).filter(code => /^2\d\d$/.test(code));
    const createdOrAccepted = method === 'post' && successCodes.find(code => code === '201' || code === '202');
    const defaultStatus = createdOrAccepted || successCodes[0];
    const preferred = req.headers.prefer?.match(/(?:^|[,;]\s*)code=(\d{3})(?=[,;\s]|$)/i)?.[1];
    if (preferred && !Object.hasOwn(operation.responses, preferred)) {
      return problem(res, 400, 'INVALID_REQUEST', 'Prefer requests a status absent from this operation.');
    }

    const missingBearer = needsBearer && !/^Bearer\s+\S+$/i.test(req.headers.authorization ?? '');
    const status = missingBearer ? '401' : (preferred ?? defaultStatus);
    const response = resolveReference(spec, operation.responses[status]);
    if (!response) {
      return problem(res, 500, 'MOCK_FIXTURE_MISSING', 'The operation has no matching mock response.');
    }
    const mediaType = Object.keys(response.content ?? {})[0];
    const body = responseExample(spec, response.content?.[mediaType]);
    const headers = responseHeaders(spec, response, route, segments, body);
    if (mediaType && body === undefined) {
      return problem(res, 500, 'MOCK_FIXTURE_MISSING', 'The response has no mock example.');
    }
    if (mediaType) headers['content-type'] = mediaType;
    if (preferred && !missingBearer) headers['preference-applied'] = 'code=' + preferred;
    return writeResponse(res, Number(status), headers, body);
  };
}

const [, , contract, port = '4010'] = process.argv;
if (!contract || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error('Usage: node docs/api/core/v1/mock.mjs <bundled-openapi.json> [port]');
  process.exitCode = 1;
} else {
  const spec = JSON.parse(readFileSync(contract, 'utf8').replace(/^\uFEFF/, ''));
  const mock = createMockHandler(spec);
  const swaggerPage = readFileSync(new URL('./swagger-ui.html', import.meta.url));
  createServer((req, res) => {
    const path = req.url.split('?')[0];
    if (req.method === 'GET' && path === '/docs') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(swaggerPage);
      return;
    }
    if (req.method === 'GET' && path === '/openapi.json') {
      writeResponse(res, 200, { 'content-type': 'application/json; charset=utf-8' }, spec);
      return;
    }
    mock(req, res);
  }).listen(Number(port), '127.0.0.1', () => {
    console.log('Campus Lost & Found mock: http://127.0.0.1:' + port + spec.servers[0].url);
    console.log('Swagger UI: http://127.0.0.1:' + port + '/docs');
  });
}
