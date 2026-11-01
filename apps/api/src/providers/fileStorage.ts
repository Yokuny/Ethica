import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Tenant files in a private S3-compatible bucket (AD-120): RustFS in local docker,
// S3 or R2 in production. Nothing is public; the API reads and returns the bytes.
export type FileStorage = {
  put: (key: string, body: Buffer, contentType: string) => Promise<void>;
  get: (key: string) => Promise<Buffer | null>;
  remove: (key: string) => Promise<void>;
};

export const createS3FileStorage = (config: {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): FileStorage => {
  const client = new S3Client({
    region: config.region,
    // Custom endpoint (RustFS/R2) uses the bucket in the path, not the subdomain.
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    ...(config.accessKeyId && config.secretAccessKey
      ? { credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }
      : {}),
  });
  const Bucket = config.bucket;

  return {
    put: async (key, body, contentType) => {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },
    get: async (key) => {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return result.Body ? Buffer.from(await result.Body.transformToByteArray()) : null;
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
    remove: async (key) => {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
};
