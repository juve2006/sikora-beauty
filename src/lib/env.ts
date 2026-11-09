import { z } from 'zod';

const smtp = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
] as const;

const schema = z
  .object({
    DATABASE_URL: z.url(),
    PAYLOAD_SECRET: z.string().min(32),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    VERCEL: z.string().optional(),
    VERCEL_ENV: z.string().optional(),
    // Nothing limits the attempts at it: long enough not to be guessed.
    SITE_PASSWORD: z.string().min(12).optional(),
    // «Заповнити з AI»; without it, or empty as in .env.example, the button says so.
    ANTHROPIC_API_KEY: z.string().optional(),
    // Orders and consultation requests in the owner's Telegram group; without them they are only
    // stored.
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),
    // Cloudflare Turnstile on the consultation form, the checkout and a shopper's account: registration,
    // letters, whatever tries a number. Without them none of these has a check.
    TURNSTILE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    // Nova Poshta's search at the checkout; without the key it asks with an empty one, and when
    // that is refused the shopper types the address. The URL is for the e2e tests' stub only.
    NOVA_POSHTA_API_KEY: z.string().optional(),
    NOVA_POSHTA_API_URL: z.url().optional(),
    // A card paid on the site through monobank; without the token the checkout offers no card. The
    // URL is for the e2e tests' stub only.
    MONO_TOKEN: z.string().optional(),
    MONO_API_URL: z.url().optional(),
    // What the daily reconciliation of mono's invoices is called with; Vercel sends it by itself.
    CRON_SECRET: z.string().min(16).optional(),
    // Signing in with Google; without them its button leads to a message. The URL is for the e2e
    // tests' stub only.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_STUB_URL: z.url().optional(),
    // The letters a shopper's account needs; without them nothing is sent (src/lib/email.ts).
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    // Errors in Sentry (src/lib/sentry.ts); without the DSN nothing is sent. The token only uploads
    // source maps during a build.
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  })
  // Without the token the Blob adapter turns itself off and photos go to a disk Vercel throws
  // away; on Vercel that must fail the build instead. Locally the disk is fine.
  .refine((env) => !env.VERCEL || env.BLOB_READ_WRITE_TOKEN, {
    path: ['BLOB_READ_WRITE_TOKEN'],
  })
  // Vercel no longer guards the production domain: without the site password (src/proxy.ts) the
  // build would open the store, so it fails instead.
  .refine((env) => env.VERCEL_ENV !== 'production' || env.SITE_PASSWORD, {
    path: ['SITE_PASSWORD'],
  })
  // Without it the cron would be refused every night, and a lost webhook would stay lost unseen.
  .refine(
    (env) =>
      env.VERCEL_ENV !== 'production' || !env.MONO_TOKEN || env.CRON_SECRET,
    { path: ['CRON_SECRET'] },
  )
  // A pair or nothing: a secret without the widget refuses every request, a widget without the
  // secret checks nothing, a token without a chat sends nowhere, half of Google's keys fails every
  // sign-in.
  .refine(
    (env) => !env.TURNSTILE_SECRET_KEY === !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    { path: ['TURNSTILE_SECRET_KEY'] },
  )
  .refine((env) => !env.TELEGRAM_BOT_TOKEN === !env.TELEGRAM_CHAT_ID, {
    path: ['TELEGRAM_BOT_TOKEN'],
  })
  .refine((env) => !env.GOOGLE_CLIENT_ID === !env.GOOGLE_CLIENT_SECRET, {
    path: ['GOOGLE_CLIENT_ID'],
  })
  // All or nothing, and all on Production: an account there that gets no letter can never sign in.
  .refine(
    (env) => {
      const set = smtp.filter((name) => env[name]).length;
      return (
        set === smtp.length || (set === 0 && env.VERCEL_ENV !== 'production')
      );
    },
    { path: ['SMTP_HOST'] },
  )
  // Behind the site password nobody but the owner and the cosmetologist reaches the form; once
  // `launch readiness` removes it, Production does not build without Turnstile.
  .refine(
    (env) =>
      env.VERCEL_ENV !== 'production' ||
      env.SITE_PASSWORD ||
      env.TURNSTILE_SECRET_KEY,
    { path: ['TURNSTILE_SECRET_KEY'] },
  );

export type Env = z.infer<typeof schema>;

// Names only: a value in an error message ends up in build logs.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment variables: ${names.join(', ')}`);
  }
  return result.data;
}
