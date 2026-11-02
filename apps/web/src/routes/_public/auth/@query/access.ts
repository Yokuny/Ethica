import type { AccessKeyRequest, AccessKeyVerify, PasswordAccess, Signup } from '@ethica/contracts';
import { post } from '@/lib/api/client.api.js';
import type { AccessVerifyResult } from '../@interface/auth.interface.js';

export function requestAccessKey(data: AccessKeyRequest) {
  return post('/auth/access-key', data);
}

export function verifyAccessKey(data: AccessKeyVerify) {
  return post<AccessVerifyResult>('/auth/access-key/verify', data);
}

// AD-157: test sign-up — same answer as the key (session or office ticket).
export function passwordAccess(data: PasswordAccess) {
  return post<AccessVerifyResult>('/auth/password', data);
}

export function signup(data: Signup) {
  return post('/auth/signup', data);
}
