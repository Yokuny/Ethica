import { S3Client } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createS3FileStorage } from './fileStorage.js';

const roleSessions = vi.hoisted(() => [] as unknown[]);
vi.mock('@aws-sdk/credential-providers', () => ({
  fromTemporaryCredentials: (options: unknown) => {
    roleSessions.push(options);
    return async () => ({ accessKeyId: 'temp', secretAccessKey: 'temp' });
  },
}));

const base = { region: 'us-east-2', bucket: 'files', accessKeyId: 'key', secretAccessKey: 'secret' };
const roleArn = 'arn:aws:iam::123456789012:role/files-tenant';

describe('createS3FileStorage', () => {
  beforeEach(() => {
    roleSessions.length = 0;
    vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('recusa chave fora da pasta de um escritório, sem chamar o S3', async () => {
    const storage = createS3FileStorage({ ...base, roleArn });
    await expect(storage.put('logo.png', Buffer.from('x'), 'image/png')).rejects.toThrow('outside a tenant folder');
    await expect(storage.get('tenants//logo.png')).rejects.toThrow('outside a tenant folder');
    expect(S3Client.prototype.send).not.toHaveBeenCalled();
  });

  it('com papel, assume uma sessão por escritório, etiquetada com o escritório da chave', async () => {
    const storage = createS3FileStorage({ ...base, roleArn });
    await storage.put('tenants/t1/expert-cases/c1/a.pdf', Buffer.from('x'), 'application/pdf');
    await storage.remove('tenants/t1/expert-cases/c1/a.pdf');
    await storage.put('tenants/t2/logo/1.png', Buffer.from('x'), 'image/png');

    expect(roleSessions).toEqual([
      expect.objectContaining({
        masterCredentials: { accessKeyId: 'key', secretAccessKey: 'secret' },
        params: { RoleArn: roleArn, RoleSessionName: 'tenant-t1', Tags: [{ Key: 'tenantId', Value: 't1' }] },
      }),
      expect.objectContaining({
        params: { RoleArn: roleArn, RoleSessionName: 'tenant-t2', Tags: [{ Key: 'tenantId', Value: 't2' }] },
      }),
    ]);
    expect(S3Client.prototype.send).toHaveBeenCalledTimes(3);
  });

  it('sem papel (RustFS local), usa a chave direto e não assume sessão', async () => {
    const storage = createS3FileStorage({ ...base, endpoint: 'http://localhost:19000' });
    await storage.put('tenants/t1/logo/1.png', Buffer.from('x'), 'image/png');
    expect(roleSessions).toEqual([]);
    expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
  });
});
