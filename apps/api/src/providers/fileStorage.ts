import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Arquivos do tenant num bucket privado compatível com S3 (AD-120): RustFS no docker local,
// S3 ou R2 em produção. Nada é público; a API lê e devolve os bytes.
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
    // Endpoint próprio (RustFS/R2) usa o bucket no caminho, não no subdomínio.
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
