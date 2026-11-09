import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';

// Tenant files in a private S3-compatible bucket (AD-120): RustFS in local docker, S3 in production.
// Nothing is public; the API reads and returns the bytes. Every key starts with tenants/<tenantId>/ (AD-146).
// With roleArn (production, AD-202) each tenant gets its own client on a role session tagged with its
// tenantId, so AWS itself only lets that client reach tenants/<tenantId>/.
export type FileStorage = {
  put: (key: string, body: Buffer, contentType: string) => Promise<void>;
  get: (key: string) => Promise<Buffer | null>;
  remove: (key: string) => Promise<void>;
};

const TENANT_KEY = /^tenants\/([^/]+)\//;

export const createS3FileStorage = (config: {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
}): FileStorage => {
  const { roleArn, region } = config;
  const Bucket = config.bucket;
  const credentials =
    config.accessKeyId && config.secretAccessKey
      ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
      : undefined;
  // Custom endpoint (RustFS) uses the bucket in the path, not the subdomain.
  const clientConfig = { region, ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}) };
  const sharedClient = new S3Client({ ...clientConfig, ...(credentials ? { credentials } : {}) });
  const tenantClients = new Map<string, S3Client>();

  const clientFor = (key: string): S3Client => {
    const tenantId = TENANT_KEY.exec(key)?.[1];
    if (!tenantId) throw new Error(`File key outside a tenant folder: ${key}`);
    if (!roleArn) return sharedClient;
    let client = tenantClients.get(tenantId);
    if (!client) {
      // The SDK caches the temporary credentials and renews them before they expire (1 hour).
      client = new S3Client({
        ...clientConfig,
        credentials: fromTemporaryCredentials({
          masterCredentials: credentials,
          clientConfig: { region },
          params: {
            RoleArn: roleArn,
            RoleSessionName: `tenant-${tenantId}`,
            Tags: [{ Key: 'tenantId', Value: tenantId }],
          },
        }),
      });
      tenantClients.set(tenantId, client);
    }
    return client;
  };

  return {
    put: async (key, body, contentType) => {
      await clientFor(key).send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },
    get: async (key) => {
      try {
        const result = await clientFor(key).send(new GetObjectCommand({ Bucket, Key: key }));
        return result.Body ? Buffer.from(await result.Body.transformToByteArray()) : null;
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
    remove: async (key) => {
      await clientFor(key).send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
};
