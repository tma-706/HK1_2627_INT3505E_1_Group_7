import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { createMediaStorage, ImageObject } from './storage.js';

interface Session {
  member_id: string;
  expires_at: Date;
  email_verified: boolean;
  locked: boolean;
}

interface Upload extends ImageObject {
  upload_id: string;
  purpose: 'avatar';
  form_fields: Record<string, string>;
  created_at: Date;
  upload_expires_at: Date;
  confirmation_expires_at: Date;
}

const problems = {
  400: ['invalid-request', 'Tham số hoặc dữ liệu gửi lên không hợp lệ.'],
  401: ['session-invalid', 'Phiên Bearer không hợp lệ.'],
  403: ['forbidden', 'Phiên có hiệu lực nhưng thiếu quyền thực hiện thao tác.'],
  404: ['resource-not-found', 'Tài nguyên không tồn tại hoặc nằm ngoài phạm vi người gọi được xem.'],
  409: ['upload-grant-conflict', 'Trạng thái hoặc dữ liệu hiện hành xung đột với thao tác.'],
  422: ['business-rule-violation', 'Dữ liệu không đạt điều kiện nghiệp vụ của thao tác.'],
  503: ['service-unavailable', 'Dịch vụ hoặc phụ thuộc tạm thời không khả dụng.'],
} as const;

function problem(reply: FastifyReply, status: keyof typeof problems) {
  const [slug, title] = problems[status];
  if (status === 401) reply.header('WWW-Authenticate', 'Bearer');
  return reply.code(status).type('application/problem+json').send({
    type: 'urn:campus-lost-found:problem:' + slug,
    title, status, code: slug.toUpperCase().replaceAll('-', '_'),
  });
}

type AvatarRequest = { purpose: 'avatar'; contentType: string; sizeBytes: number; sha256: string };

function avatarRequest(body: unknown): body is AvatarRequest {
  if (!body || typeof body !== 'object' || Object.keys(body).length !== 4) return false;
  const { purpose, contentType, sizeBytes, sha256 } = body as Partial<AvatarRequest>;
  return purpose === 'avatar' && typeof contentType === 'string' &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(contentType) &&
    typeof sizeBytes === 'number' && Number.isSafeInteger(sizeBytes) && sizeBytes > 0 &&
    typeof sha256 === 'string' && /^[A-Fa-f0-9]{64}$/.test(sha256);
}

export async function registerMedia(app: FastifyInstance, db: Pool, storage: ReturnType<typeof createMediaStorage>) {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });
  app.setErrorHandler((error, request, reply) => {
    if (error && typeof error === 'object' && 'statusCode' in error &&
        typeof error.statusCode === 'number' && error.statusCode < 500) return problem(reply, 400);
    request.log.error('Private media dependency failed');
    return problem(reply, 503);
  });

  async function member(request: FastifyRequest, reply: FastifyReply) {
    const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(request.headers.authorization ?? '')?.[1];
    const session = token && (await db.query<Session>(`
      SELECT member.member_id, member.email_verified, member.locked, session.expires_at
      FROM public.media_sessions AS session JOIN public.media_members AS member USING (member_id)
      WHERE session.token_hash = $1 AND session.revoked_at IS NULL AND session.expires_at > now()
    `, [createHash('sha256').update(token).digest('hex')])).rows[0];
    if (!session) problem(reply, 401);
    else if (!session.email_verified || session.locked) problem(reply, 403);
    else return session;
  }

  app.post('/api/v1/me/uploads', { bodyLimit: 8192 }, async (request, reply) => {
    const session = await member(request, reply);
    if (!session) return;

    const body = request.body;
    const idempotencyKey = request.headers['idempotency-key'];
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 1 || idempotencyKey.length > 128) {
      return problem(reply, 400);
    }
    if (!avatarRequest(body)) {
      if (body && typeof body === 'object' && 'purpose' in body &&
          (body.purpose === 'finderResponsePhoto' || body.purpose === 'appealEvidence')) return problem(reply, 422);
      return problem(reply, 400);
    }
    if (body.sizeBytes > 10000000) return problem(reply, 422);

    const uploadId = randomUUID();
    const image = {
      object_key: 'uploads/avatar/' + uploadId,
      content_type: body.contentType,
      size_bytes: body.sizeBytes,
      sha256: body.sha256.toLowerCase(),
    };
    const signed = await storage.upload(image, session.expires_at);
    if (!signed) return problem(reply, 401);

    const inserted = await db.query<Upload>(`
      INSERT INTO public.media_uploads
        (upload_id, owner_id, idempotency_key, purpose, content_type, size_bytes, sha256, object_key,
         form_fields, upload_expires_at, confirmation_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10::timestamptz + interval '10 minutes')
      ON CONFLICT (owner_id, idempotency_key) DO NOTHING
      RETURNING *
    `, [uploadId, session.member_id, idempotencyKey, body.purpose, image.content_type,
      image.size_bytes, image.sha256, image.object_key, JSON.stringify(signed.fields), signed.expiration]);
    const upload = inserted.rows[0] ?? (await db.query<Upload>(`
      SELECT * FROM public.media_uploads WHERE owner_id = $1 AND idempotency_key = $2
    `, [session.member_id, idempotencyKey])).rows[0];
    if (upload.purpose !== body.purpose || upload.content_type !== image.content_type ||
        upload.size_bytes !== image.size_bytes || upload.sha256 !== image.sha256) return problem(reply, 409);

    return reply.code(201).header('Location', '/api/v1/uploads/' + upload.upload_id).send({
      uploadId: upload.upload_id,
      method: 'POST',
      uploadUrl: signed.url,
      formFields: upload.form_fields,
      uploadExpiresAt: upload.upload_expires_at,
      confirmationExpiresAt: upload.confirmation_expires_at,
    });
  });

  app.get<{ Params: { uploadId: string } }>('/api/v1/uploads/:uploadId', async (request, reply) => {
    const session = await member(request, reply);
    if (!session) return;
    const { uploadId } = request.params;
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uploadId)) return problem(reply, 404);
    const { rows: [upload] } = await db.query<Upload>(`
      SELECT * FROM public.media_uploads WHERE upload_id = $1 AND owner_id = $2
    `, [uploadId, session.member_id]);
    if (!upload) return problem(reply, 404);

    const expired = +upload.confirmation_expires_at <= Date.now();
    const availableUntil = new Date(Math.min(+session.expires_at, +upload.confirmation_expires_at));
    return {
      uploadId: upload.upload_id,
      status: expired ? 'expired' : 'pendingUpload',
      updatedAt: expired ? upload.confirmation_expires_at : upload.created_at,
      redactionMode: null,
      failureCode: null,
      previewUrl: expired ? null : await storage.preview(upload, availableUntil),
    };
  });
}
