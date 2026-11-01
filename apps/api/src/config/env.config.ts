import { z } from 'zod';

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value : undefined));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória'),
  API_PORT: z.string().min(1, 'API_PORT é obrigatória'),
  SESSION_JWT_SECRET: z.string().min(1, 'SESSION_JWT_SECRET é obrigatória'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN é obrigatória'),
  MAIL_PROVIDER: z.enum(['log', 'nodemailer']).default('log'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // API Pública do Datajud (CNJ): chave publicada pelo CNJ na documentação da
  // API, enviada como `Authorization: APIKey <chave>`. Sem ela, a busca de
  // prospecção responde `datajud_not_configured` e o resto do app funciona.
  DATAJUD_API_KEY: optionalSecret,
  DATAJUD_BASE_URL: z.string().default('https://api-publica.datajud.cnj.jus.br'),
  // Geocodificação do mapa de campo (AD-131): Nominatim público por padrão.
  GEOCODER_URL: z.string().default('https://nominatim.openstreetmap.org'),
  GEOCODER_USER_AGENT: z.string().default('Ethica/1.0 (gestao de pericias)'),
  // PDF (AD-119): Chromium do sistema (pacote `chromium` do Debian no Dockerfile.dev).
  CHROMIUM_PATH: z.string().default('/usr/bin/chromium'),
  // Arquivos do tenant (AD-120). Sem bucket, o envio do logo responde `storage_not_configured`.
  S3_ENDPOINT: optionalSecret,
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: optionalSecret,
  S3_ACCESS_KEY_ID: optionalSecret,
  S3_SECRET_ACCESS_KEY: optionalSecret,
});

export type Env = z.infer<typeof envSchema>;

// safeParse (não parse): controla a mensagem de falha para NOMEAR a variável
// ausente, em vez de expor o erro cru do Zod.
export const parseEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variável(is) de ambiente ausente(s) ou inválida(s): ${missing}`);
  }
  return result.data;
};

// Validado no import do módulo — falha aqui derruba o boot antes de qualquer
// tráfego ser aceito.
export const env = parseEnv(process.env);
