import { z } from 'zod'

const schema = z
  .object({
    DATABASE_URL: z.url(),
    PAYLOAD_SECRET: z.string().min(32),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    VERCEL: z.string().optional(),
  })
  // Without the token the Blob adapter turns itself off and photos go to a disk Vercel throws
  // away; on Vercel that must fail the build instead. Locally the disk is fine.
  .refine((env) => !env.VERCEL || env.BLOB_READ_WRITE_TOKEN, { path: ['BLOB_READ_WRITE_TOKEN'] })

export type Env = z.infer<typeof schema>

// Names only: a value in an error message ends up in build logs.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source)
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
    throw new Error(`Invalid environment variables: ${names.join(', ')}`)
  }
  return result.data
}
