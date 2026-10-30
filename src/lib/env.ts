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
  });

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
