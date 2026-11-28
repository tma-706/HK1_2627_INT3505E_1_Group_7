import { setTimeout } from 'node:timers/promises';
import { GetBucketVersioningCommand, PutBucketLifecycleConfigurationCommand, PutBucketVersioningCommand, S3Client } from '@aws-sdk/client-s3';

const { LF_S3_BUCKET: Bucket, LF_S3_ENDPOINT: endpoint, LF_S3_ADMIN_ACCESS_KEY: accessKeyId,
  LF_S3_ADMIN_SECRET_KEY: secretAccessKey } = process.env;
if (!Bucket || !endpoint || !accessKeyId || !secretAccessKey) throw new Error('Missing S3 provisioning configuration');

const s3 = new S3Client({
  endpoint, credentials: { accessKeyId, secretAccessKey }, region: 'us-east-1',
  forcePathStyle: true, maxAttempts: 1,
});

try {
  for (let attempts = 1; ; attempts++) {
    try {
      const versioning = await s3.send(new GetBucketVersioningCommand({ Bucket }), {
        abortSignal: AbortSignal.timeout(1500),
      });
      if (versioning.Status !== 'Enabled') {
        await s3.send(new PutBucketVersioningCommand({ Bucket, VersioningConfiguration: { Status: 'Enabled' } }), {
          abortSignal: AbortSignal.timeout(3000),
        });
      }
      await s3.send(new PutBucketLifecycleConfigurationCommand({
        Bucket,
        LifecycleConfiguration: { Rules: [{
          ID: 'expire-temporary-uploads', Status: 'Enabled', Filter: { Prefix: 'uploads/' },
          Expiration: { Days: 1 }, NoncurrentVersionExpiration: { NoncurrentDays: 1 },
        }] },
      }), { abortSignal: AbortSignal.timeout(3000) });
      console.log('Private media bucket is ready');
      break;
    } catch (error) {
      if (attempts === 30) throw error;
      await setTimeout(1000);
    }
  }
} finally {
  s3.destroy();
}
