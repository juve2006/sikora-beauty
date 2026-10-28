import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.url(),
  PAYLOAD_SECRET: z.string().min(32),
})

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
