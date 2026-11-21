import type { ContactMessage } from '@ethica/contracts';
import { post } from '@/lib/api/client.api.js';

export function sendContactMessage(data: ContactMessage) {
  return post<{ sent: boolean }>('/contact', data);
}
