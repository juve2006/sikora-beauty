import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { uk } from '@payloadcms/translations/languages/uk'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { collections } from './collections'
import { Users } from './collections/Users'
import { parseEnv } from './env'

const env = parseEnv(process.env)
const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections,
  i18n: {
    supportedLanguages: { uk },
    fallbackLanguage: 'uk',
  },
  localization: {
    locales: ['uk', 'en'],
    defaultLocale: 'uk',
    fallback: true,
  },
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: env.BLOB_READ_WRITE_TOKEN,
      // Uploads through a Vercel function stop at 4.5 MB; the browser sends the file to Blob itself.
      clientUploads: true,
      // The same schema with and without the token (CI and local runs have none).
      alwaysInsertFields: true,
    }),
  ],
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
})
