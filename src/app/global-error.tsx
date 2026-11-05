'use client';

import { captureException } from '@sentry/browser';
import DefaultGlobalError from 'next/dist/client/components/builtin/global-error';
import { useEffect } from 'react';

// Next's own page with its reload button, as before this file: only the report is added. A root
// layout may be what failed, so no messages are at hand for a page of our own.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return <DefaultGlobalError error={error} />;
}
