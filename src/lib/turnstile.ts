import 'server-only';

import { turnstileAnswer } from '@/lib/validators';

// Cloudflare Turnstile's answer for a form's token. Without the secret there is no check — locally,
// on a Preview, behind the site password (src/lib/env.ts keeps it so until the launch). A network
// error or an answer we cannot read is a failed check: the shopper tries again.
export async function verifyTurnstile(token: string | undefined) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    return turnstileAnswer.parse(await response.json()).success;
  } catch (error) {
    console.error('Turnstile:', error);
    return false;
  }
}
