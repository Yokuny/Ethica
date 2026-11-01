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
  // Datajud Public API (CNJ): key published by CNJ in the API
  // documentation, sent as `Authorization: APIKey <key>`. Without it, the prospecting
  // search answers `datajud_not_configured` and the rest of the app works.
  DATAJUD_API_KEY: optionalSecret,
  DATAJUD_BASE_URL: z.string().default('https://api-publica.datajud.cnj.jus.br'),
  // Field map geocoding (AD-131): public Nominatim by default.
  GEOCODER_URL: z.string().default('https://nominatim.openstreetmap.org'),
  GEOCODER_USER_AGENT: z.string().default('Ethica/1.0 (gestao de pericias)'),
  // PDF (AD-119): system Chromium (Debian `chromium` package in Dockerfile.dev).
  CHROMIUM_PATH: z.string().default('/usr/bin/chromium'),
  // Tenant files (AD-120). Without a bucket, the logo upload answers `storage_not_configured`.
  S3_ENDPOINT: optionalSecret,
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: optionalSecret,
  S3_ACCESS_KEY_ID: optionalSecret,
  S3_SECRET_ACCESS_KEY: optionalSecret,
});

export type Env = z.infer<typeof envSchema>;

// safeParse (not parse): controls the failure message to NAME the missing
// variable instead of exposing the raw Zod error.
export const parseEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variável(is) de ambiente ausente(s) ou inválida(s): ${missing}`);
  }
  return result.data;
};

// Validated when the module is imported — a failure here brings the boot down before any
// traffic is accepted.
export const env = parseEnv(process.env);
