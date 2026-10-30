import type { SignIn } from '@ethica/contracts';
import { post } from '@/lib/api/client.api.js';

export function signIn(data: SignIn) {
  return post('/auth/signin', data);
}
