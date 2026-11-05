import {
  dedupeIntegration,
  globalHandlersIntegration,
  httpContextIntegration,
  init,
  linkedErrorsIntegration,
} from '@sentry/browser';

import { sentryOptions } from '@/lib/sentry';

// @sentry/browser rather than @sentry/nextjs, which brings its tracing to every page, and only the
// integrations an error needs: the default ones add sessions, which pass no `beforeSend`.
if (sentryOptions.dsn) {
  init({
    ...sentryOptions,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    defaultIntegrations: false,
    integrations: [
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      httpContextIntegration(),
    ],
  });
}
