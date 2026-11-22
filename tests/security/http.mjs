import { request } from 'node:https';
import { STATUS_CODES as statusCodes } from 'node:http';
import { performance } from 'node:perf_hooks';

const harHeaders = (headers) => Object.entries(headers).flatMap(([name, value]) =>
  (Array.isArray(value) ? value : [value]).map((entry) => ({ name, value: String(entry) })),
);
export const sentinelPath = '/api/_security_tool_selfcheck';
export const sentinelRule = '10010';

function harEntry(url, method, headers, body, status, responseHeaders, responseBody, startedDateTime, time) {
  const target = new URL(url);
  const httpVersion = 'HTTP/1.1';
  return {
    startedDateTime, time,
    request: {
      method, url, httpVersion, cookies: [], headers: harHeaders(headers),
      queryString: Array.from(target.searchParams, ([name, value]) => ({ name, value })),
      headersSize: -1, bodySize: Buffer.byteLength(body),
      ...(body && { postData: { mimeType: 'application/json', text: body } }),
    },
    response: {
      status, statusText: statusCodes[status] ?? '', httpVersion, cookies: [], headers: harHeaders(responseHeaders),
      redirectURL: '', headersSize: -1, bodySize: Buffer.byteLength(responseBody),
      content: { size: Buffer.byteLength(responseBody), mimeType: responseHeaders['content-type'] ?? 'text/plain', text: responseBody },
    },
    cache: {}, timings: { send: 0, wait: time, receive: 0 },
  };
}

export function recordedClient(origin, ca, operations) {
  const exchanges = [];
  async function send(caseId, step, operation, { token, data, query = {} } = {}) {
    const { method, path } = operations.get(operation);
    const target = new URL(path, origin);
    for (const [name, value] of Object.entries(query)) target.searchParams.set(name, value);
    const body = data ? JSON.stringify(data) : '';
    const headers = {
      host: target.host,
      ...(token && { authorization: `Bearer ${token}` }),
      ...(data && { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }),
    };
    const startedDateTime = new Date().toISOString();
    const started = performance.now();
    const response = await new Promise((resolve, reject) => {
      const req = request(target, { method, headers, ca, rejectUnauthorized: true, signal: AbortSignal.timeout(10_000) }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      });
      req.on('error', reject);
      req.end(body);
    });
    const har = harEntry(target.href, method, headers, body, response.status, response.headers, response.body,
      startedDateTime, Math.round(performance.now() - started));
    exchanges.push({ caseId, step, operation, method, path, status: response.status, har });
    return response;
  }
  return { exchanges, send };
}

export function makeHar(exchanges, origin) {
  const sentinel = harEntry(origin + sentinelPath, 'GET', {}, '', 200, {
    'content-type': 'text/plain',
    'set-cookie': 'security_tool_selfcheck=synthetic; Secure; SameSite=Strict',
  }, 'synthetic passive-scanner control', new Date().toISOString(), 0);
  return { log: { version: '1.2', creator: { name: 'Lost & Found fixture', version: '1' },
    entries: [...exchanges.map(({ har }) => har), sentinel] } };
}
