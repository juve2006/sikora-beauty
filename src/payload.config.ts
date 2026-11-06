import { postgresAdapter } from '@payloadcms/db-postgres';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { uk } from '@payloadcms/translations/languages/uk';
import { captureException } from '@sentry/nextjs';
import path from 'path';
import { buildConfig, defaultLoggerOptions } from 'payload';
import { fileURLToPath } from 'url';

import { collections } from './collections';
import { Users } from '@/collections/users';
import { CareFinder } from '@/globals/care-finder';
import { Contacts } from '@/globals/contacts';
import { closeOwnCollections } from '@/lib/access';
import { keepPasswordChanges } from '@/lib/auth-writes';
import { emailAdapter } from '@/lib/email';
import { parseEnv } from '@/lib/env';
import { payloadLoggerOptions } from '@/lib/server-log';

const env = parseEnv(process.env);
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    dateFormat: 'dd.MM.yyyy HH:mm',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // The owner's «Імпорт» page: products from cosmetika.com.ua and prices in CSV.
    components: {
      providers: ['/components/admin/back-to-top'],
      views: {
        import: {
          Component: '/components/admin/import-view',
          path: '/import',
          meta: { title: 'Імпорт' },
        },
      },
      actions: ['/components/admin/site-link', '/components/admin/canvas-link'],
      afterNavLinks: ['/components/admin/import-nav-link'],
    },
  },
  collections,
  email: emailAdapter(env),
  globals: [CareFinder, Contacts],
  hooks: {
    // Payload answers its own errors, so `onRequestError` never hears of them. A refusal, under 500,
    // is no failure; GraphQL keeps its status on the error it wraps.
    afterError: [
      ({ error }) => {
        const { status, originalError } = error as {
          status?: number;
          originalError?: { status?: number };
        };
        if ((status ?? originalError?.status ?? 500) >= 500) {
          captureException(error);
        }
      },
    ],
  },
  i18n: {
    supportedLanguages: { uk },
    fallbackLanguage: 'uk',
  },
  localization: {
    locales: ['uk', 'en'],
    defaultLocale: 'uk',
    fallback: true,
  },
  // Payload's usual output, with no value of a failed query in it.
  logger: { options: payloadLoggerOptions, destination: defaultLoggerOptions },
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(env.BLOB_READ_WRITE_TOKEN),
      // A photo's url is its public Blob URL, not /api/media/file/…: next/image fetches it without
      // the site password, which the proxy would ask that path for (adr-20261029-site-password).
      collections: { media: { disablePayloadAccessControl: true } },
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
  db: keepPasswordChanges(
    postgresAdapter({
      pool: {
        connectionString: env.DATABASE_URL,
        // `pg` waits for a client for ever. Payload's forgot-password holds one and asks for another,
        // so as many at once as the pool has clients would stop the store until a restart.
        connectionTimeoutMillis: 10_000,
      },
    }),
  ),
}).then(closeOwnCollections);
