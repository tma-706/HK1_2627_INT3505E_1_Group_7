import type { FastifyInstance, FastifyReply } from 'fastify';
import { isRegistrationPassword, isVerificationToken, normalizeEmail, type IdentityService } from './service.js';

const api = '/api/v1';
const problems = {
  invalid: [400, 'invalid-request', 'INVALID_REQUEST', 'Tham số hoặc dữ liệu gửi lên không hợp lệ.'],
  missing: [404, 'resource-not-found', 'RESOURCE_NOT_FOUND', 'Tài nguyên không tồn tại hoặc nằm ngoài phạm vi người gọi được xem.'],
  gone: [410, 'link-no-longer-valid', 'LINK_NO_LONGER_VALID', 'Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.'],
  limited: [429, 'verification-resend-limit', 'VERIFICATION_RESEND_LIMIT', 'Đã đạt hạn mức gửi lại.'],
  unavailable: [503, 'service-unavailable', 'SERVICE_UNAVAILABLE', 'Dịch vụ hoặc phụ thuộc tạm thời không khả dụng.'],
} as const;

function problem(reply: FastifyReply, key: keyof typeof problems) {
  const [status, type, code, title] = problems[key];
  return reply.code(status).type('application/problem+json').send({
    type: `urn:campus-lost-found:problem:${type}`, status, code, title,
  });
}

function fields<T extends string>(value: unknown, expected: readonly T[]) {
  if (typeof value !== 'object' || !value || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== expected.length || !expected.every(key => Object.hasOwn(value, key))) return null;
  return value as Record<T, unknown>;
}

function accepted(reply: FastifyReply, receipt: { requestId: string }) {
  return reply.code(202).header('Location', `${api}/email-request-status/${receipt.requestId}`).send(receipt);
}

export async function registerIdentityRoutes(app: FastifyInstance, identity: IdentityService) {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) return problem(reply, 'invalid');
    request.log.error('Identity operation did not complete');
    return problem(reply, 'unavailable');
  });

  app.post(`${api}/accounts`, { bodyLimit: 8 * 1024 }, async (request, reply) => {
    const input = fields(request.body, ['email', 'password']);
    const email = normalizeEmail(input?.email);
    if (!email || !isRegistrationPassword(input?.password)) return problem(reply, 'invalid');
    return accepted(reply, await identity.register(email, input.password));
  });

  app.get<{ Params: { requestId: string } }>(`${api}/email-request-status/:requestId`, async (request, reply) => {
    const receipt = await identity.getReceipt(request.params.requestId);
    return receipt ? reply.send(receipt) : problem(reply, 'missing');
  });

  app.post(`${api}/email-verifications`, { bodyLimit: 8 * 1024 }, async (request, reply) => {
    const token = fields(request.body, ['token'])?.token;
    if (!isVerificationToken(token)) return problem(reply, 'invalid');
    const result = await identity.verify(token);
    if (result === 'verified') return reply.code(204).send();
    return problem(reply, result);
  });

  app.post(`${api}/email-verification-requests`, { bodyLimit: 8 * 1024 }, async (request, reply) => {
    const email = normalizeEmail(fields(request.body, ['email'])?.email);
    if (!email) return problem(reply, 'invalid');
    const result = await identity.resend(email);
    if ('retryAfter' in result) {
      reply.header('Retry-After', String(result.retryAfter));
      return problem(reply, 'limited');
    }
    return accepted(reply, result.receipt);
  });
}
