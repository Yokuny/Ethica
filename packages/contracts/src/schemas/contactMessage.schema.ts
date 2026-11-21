import { z } from 'zod';

// AD-249: what a visitor sends from the Contact page; it goes by e-mail to the Ethica, it is not stored.
export const CONTACT_SUBJECTS = ['plans', 'support', 'suggestion', 'partnership'] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const contactMessageSchema = z
  .object({
    name: z.string().trim().min(1, 'informe o nome').max(120),
    email: z.string().trim().toLowerCase().email('e-mail inválido'),
    phone: z.string().trim().min(8, 'telefone inválido').max(30),
    subject: z.enum(CONTACT_SUBJECTS),
    message: z.string().trim().min(1, 'escreva a mensagem').max(5000),
  })
  .strict();
export type ContactMessage = z.infer<typeof contactMessageSchema>;
