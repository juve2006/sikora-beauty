import { z } from 'zod';

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
    // Consultation requests in the owner's Telegram group; without them the request is only stored.
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),
    // Cloudflare Turnstile on the consultation form; without them the form has no check.
    TURNSTILE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    // Nova Poshta's search at the checkout; without the key it asks with an empty one, and when
    // that is refused the shopper types the address. The URL is for the e2e tests' stub only.
    NOVA_POSHTA_API_KEY: z.string().optional(),
    NOVA_POSHTA_API_URL: z.url().optional(),
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
  // A pair or nothing: a secret without the widget refuses every request, a widget without the
  // secret checks nothing, a token without a chat sends nowhere.
  .refine(
    (env) => !env.TURNSTILE_SECRET_KEY === !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    { path: ['TURNSTILE_SECRET_KEY'] },
  )
  .refine((env) => !env.TELEGRAM_BOT_TOKEN === !env.TELEGRAM_CHAT_ID, {
    path: ['TELEGRAM_BOT_TOKEN'],
  })
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
