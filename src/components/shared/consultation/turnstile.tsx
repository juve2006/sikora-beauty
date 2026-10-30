'use client';

import { useLocale } from 'next-intl';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: object) => string;
      remove: (id: string) => void;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Waits, at most 30 seconds, until the widget in the form `read` reads has its token: Cloudflare
// checks while the shopper types, and one who submits sooner (autofill) waits for it rather than
// sending none.
// ponytail: polls the hidden field; a `callback` promise if the 200 ms ever matter.
export const turnstileToken = async (read: () => FormData) => {
  for (let waited = 0; siteKey && waited < 30_000; waited += 200) {
    if (read().get('cf-turnstile-response')) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

// Cloudflare's check inside a form: the widget adds the hidden `cf-turnstile-response` itself and
// shows only when it needs the shopper. A token is checked once, so each new `attempt` renders a
// fresh widget. Without the site key there is no check (src/lib/env.ts).
const Turnstile = ({ attempt }: { attempt: unknown }) => {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const locale = useLocale();

  useEffect(() => {
    if (!ready || !siteKey || !container.current || !window.turnstile) return;
    const id = window.turnstile.render(container.current, {
      sitekey: siteKey,
      language: locale,
      // The storefront's theme is a class, not the system's.
      theme: document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light',
      size: 'flexible',
      appearance: 'interaction-only',
    });
    return () => window.turnstile?.remove(id);
  }, [ready, locale, attempt]);

  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={container} />
    </>
  );
};

export default Turnstile;
