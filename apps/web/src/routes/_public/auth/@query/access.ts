import type { AccessKeyRequest, AccessKeyVerify, Signup } from '@ethica/contracts';
import { post } from '@/lib/api/client.api.js';
import type { AccessVerifyResult } from '../@interface/auth.interface.js';

export function requestAccessKey(data: AccessKeyRequest) {
  return post('/auth/access-key', data);
}

export function verifyAccessKey(data: AccessKeyVerify) {
  return post<AccessVerifyResult>('/auth/access-key/verify', data);
}

export function signup(data: Signup) {
  return post<{ passkeyToken: string }>('/auth/signup', data);
}
