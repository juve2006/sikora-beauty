import * as Sentry from '@sentry/nextjs';

import { keepWhatFailed, sentryOptions } from '@/lib/sentry';

type VercelContext = {
  get?: () => { waitUntil?: (task: Promise<unknown>) => void } | undefined;
};

// Node only: `proxy.ts` runs there on Next 16, and no route asks for the edge.
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !sentryOptions.dsn) return;
  Sentry.init({
    ...sentryOptions,
    // No stack from the server: its parser reads the lines of a message too, a failed query's params are
    // among them, and a frame made of a shopper's row cannot be told from a real one (ADR).
    stackParser: () => [],
    // A server action that caught its error only logs it, so the log is what is reported; RULES.md
    // keeps a shopper's data out of logs. Sessions, of the process and of requests, pass no
    // `beforeSend`.
    integrations: (defaults) => [
      ...defaults.filter(({ name }) => name !== 'ProcessSession'),
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
      Sentry.httpIntegration({
        sessions: false,
        disableIncomingRequestSpans: true,
      }),
    ],
    // Vercel freezes a function once it answers, with the event still on its way. The SDK's own
    // `vercelWaitUntil` holds it only on the edge, so the context is read here the way it reads it.
    // Off Vercel there is none, and nothing waits.
    beforeSend(event) {
      const vercel: VercelContext | undefined = Reflect.get(
        globalThis,
        Symbol.for('@vercel/request-context'),
      );
      vercel?.get?.()?.waitUntil?.(Sentry.flush(2000));
      return keepWhatFailed(event);
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
