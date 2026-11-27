import { createHash } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface ImageObject {
  object_key: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(name + ' is required for private media');
  return value;
}

export function createMediaStorage() {
  const bucket = required('LF_S3_BUCKET');
  const endpoint = required('LF_S3_ENDPOINT');
  const publicEndpoint = new URL(required('LF_S3_PUBLIC_ENDPOINT'));
  if (publicEndpoint.protocol !== 'https:' || publicEndpoint.href !== publicEndpoint.origin + '/') {
    throw new Error('LF_S3_PUBLIC_ENDPOINT must be an HTTPS origin');
  }
  const uploadSeconds = Number(process.env.LF_MEDIA_UPLOAD_SECONDS ?? 300);
  if (!Number.isInteger(uploadSeconds) || uploadSeconds < 1 || uploadSeconds > 300) {
    throw new Error('LF_MEDIA_UPLOAD_SECONDS must be an integer between 1 and 300');
  }
  const config = {
    credentials: {
      accessKeyId: required('LF_S3_ACCESS_KEY'),
      secretAccessKey: required('LF_S3_SECRET_KEY'),
    },
    region: process.env.LF_S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    maxAttempts: 1,
  };
  const internal = new S3Client({ ...config, endpoint });
  const external = new S3Client({ ...config, endpoint: publicEndpoint.href });

  return {
    close() {
      internal.destroy();
      external.destroy();
    },
    async ready() {
      await internal.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'uploads/', MaxKeys: 1 }), { abortSignal: AbortSignal.timeout(1500) });
    },
    async upload(image: ImageObject, availableUntil: Date) {
      const expires = Math.min(uploadSeconds, Math.floor((+availableUntil - Date.now()) / 1000));
      if (expires < 1) return null;
      const post = await createPresignedPost(external, {
        Bucket: bucket,
        Key: image.object_key,
        Expires: expires,
        Fields: { 'Content-Type': image.content_type, 'x-amz-meta-sha256': image.sha256 },
        Conditions: [['content-length-range', image.size_bytes, image.size_bytes]],
      });
      const { expiration } = JSON.parse(Buffer.from(post.fields.Policy, 'base64').toString('utf8'));
      return { fields: post.fields, url: post.url, expiration: new Date(expiration as string) };
    },
    async preview(image: ImageObject, availableUntil: Date) {
      const object = { Bucket: bucket, Key: image.object_key };
      const options = { abortSignal: AbortSignal.timeout(4000) };
      try {
        const head = await internal.send(new HeadObjectCommand(object), options);
        if (!head.VersionId || head.VersionId === 'null' || head.ContentLength !== image.size_bytes ||
            head.ContentType !== image.content_type || head.Metadata?.sha256 !== image.sha256) return null;

        // Validate and sign one immutable version even when the POST is replayed.
        const version = { ...object, VersionId: head.VersionId };
        const { Body } = await internal.send(new GetObjectCommand(version), options);
        if (!Body || !('destroy' in Body)) throw new Error('Expected a Node.js object stream');
        const hash = createHash('sha256');
        let bytes = 0;
        for await (const chunk of Body) {
          bytes += chunk.length;
          if (bytes > image.size_bytes) return null;
          hash.update(chunk);
        }
        if (bytes !== image.size_bytes || hash.digest('hex') !== image.sha256) return null;

        const expiresIn = Math.min(60, Math.floor((+availableUntil - Date.now()) / 1000));
        if (expiresIn < 1) return null;
        return getSignedUrl(external, new GetObjectCommand({
          ...version, ResponseCacheControl: 'private, no-store',
          ResponseContentType: image.content_type,
        }), { expiresIn });
      } catch (error) {
        if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null;
        throw error;
      }
    },
  };
}
