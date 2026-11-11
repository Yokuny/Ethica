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
  // `resend` (AD-219) sends over HTTPS — Railway blocks SMTP. MAIL_FROM is the sender for both real providers.
  MAIL_PROVIDER: z.enum(['log', 'nodemailer', 'resend']).default('log'),
  MAIL_FROM: z.string().optional(),
  RESEND_API_KEY: optionalSecret,
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
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
  // Production (AD-202): role assumed per tenant with the session tag tenantId. Empty in dev (RustFS has no STS).
  S3_ROLE_ARN: optionalSecret,
});

export type Env = z.infer<typeof envSchema>;

// AD-156/AD-219: access is by e-mail key only (AD-155) — in production, without a real provider nobody gets in.
const productionMailIssues = (env: Env): string[] => {
  if (env.NODE_ENV !== 'production') return [];
  const from = env.MAIL_FROM ? [] : ['MAIL_FROM'];
  if (env.MAIL_PROVIDER === 'resend') return [...(env.RESEND_API_KEY ? [] : ['RESEND_API_KEY']), ...from];
  if (env.MAIL_PROVIDER === 'nodemailer') return [...(env.SMTP_HOST ? [] : ['SMTP_HOST']), ...from];
  return ['MAIL_PROVIDER', ...from];
};

// safeParse (not parse): controls the failure message to NAME the missing
// variable instead of exposing the raw Zod error.
// PORT (injected by Railway, AD-153) wins over API_PORT, whatever start command runs the API.
export const parseEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse({ ...source, API_PORT: source.PORT ?? source.API_PORT });
  const missing = result.success
    ? productionMailIssues(result.data)
    : result.error.issues.map((issue) => issue.path.join('.'));
  if (!result.success || missing.length > 0) {
    throw new Error(`Variável(is) de ambiente ausente(s) ou inválida(s): ${missing.join(', ')}`);
  }
  return result.data;
};

// Validated when the module is imported — a failure here brings the boot down before any
// traffic is accepted.
export const env = parseEnv(process.env);
