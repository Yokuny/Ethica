import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Ported from DentalEase-BackEnd/src/helpers/crypto.helper.ts (same
// algorithm/format — design.md Tech Decisions). Secret encrypted at rest
// (AES-256-GCM). The three fields are base64. `authTag` ensures
// integrity/authenticity — decrypting fails if tampered with. Used by the
// Channel token (`CHANNEL_ENC_KEY` key, AIG-01).
export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const KEY_LENGTH = 32; // 256 bits

const resolveKey = (base64Key: string): Buffer => {
  if (!base64Key) throw new Error('CHANNEL_ENC_KEY não configurada');
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== KEY_LENGTH) throw new Error('CHANNEL_ENC_KEY deve ter 32 bytes (base64)');
  return key;
};

export const encrypt = (plaintext: string, base64Key: string): EncryptedSecret => {
  const key = resolveKey(base64Key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
};

export const decrypt = (payload: EncryptedSecret, base64Key: string): string => {
  const key = resolveKey(base64Key);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
};

/** Masks a secret exposing only the last 4 characters (e.g. "****d407"). */
export const maskSecret = (secret: string): string => {
  if (!secret || secret.length <= 4) return '****';
  return `****${secret.slice(-4)}`;
};

/** Hash SHA-256 (hex). */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
