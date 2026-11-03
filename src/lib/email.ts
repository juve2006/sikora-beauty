import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import type { EmailAdapter } from 'payload';

import { SITE_URL } from '@/lib/constants';
import type { Env } from '@/lib/env';
import en from '../../messages/en.json';
import uk from '../../messages/uk.json';

const texts = { uk: uk.Email, en: en.Email };

// One action and its link: no name or other typed text goes in, so nothing here needs escaping.
const letter = (
  subject: string,
  text: string,
  action: string,
  ignore: string,
  path: string,
) => ({
  subject,
  html: `<p>${text}</p><p><a href="${new URL(path, SITE_URL)}">${action}</a></p><p>${ignore}</p>`,
});

const prefix = (locale: unknown) => (locale === 'en' ? '/en' : '');
const inLanguage = (locale: unknown) => texts[locale === 'en' ? 'en' : 'uk'];

// The store's own pages, in the language the shopper registered in, never Payload's admin.
export const verifyLetter = (token: string, locale: unknown) => {
  const t = inLanguage(locale);
  return letter(
    t.verifySubject,
    t.verifyText,
    t.verifyAction,
    t.ignore,
    `${prefix(locale)}/account/verify?token=${token}`,
  );
};
export const resetLetter = (token: string, locale: unknown) => {
  const t = inLanguage(locale);
  return letter(
    t.resetSubject,
    t.resetText,
    t.resetAction,
    t.ignore,
    `${prefix(locale)}/account/reset?token=${token}`,
  );
};
// Staff reset their password in the admin, which is in Ukrainian.
export const staffResetLetter = (token: string) => {
  const t = inLanguage('uk');
  return letter(
    t.resetSubject,
    t.resetText,
    t.resetAction,
    t.ignore,
    `/admin/reset/${token}`,
  );
};

const noEmail: EmailAdapter = () => ({
  name: 'none',
  defaultFromAddress: 'noreply@sikora-beauty.local',
  defaultFromName: 'Sikora Beauty',
  sendEmail: async () => undefined,
});

// Gmail by SMTP until there is a domain (adr-20261103-customer-accounts). Without the variables —
// locally, in CI, on a Preview — nothing is sent and nothing logged: Payload's default adapter would
// write the shopper's address to the log.
export const emailAdapter = (env: Env) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) return noEmail;
  return nodemailerAdapter({
    defaultFromAddress: SMTP_FROM,
    defaultFromName: 'Sikora Beauty',
    // Checking the connection would hold every cold start; a failed send says so itself.
    skipVerify: true,
    transportOptions: {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      // Payload sends inside its transaction, holding a pool client and the row: a server that stops
      // answering must not hold them for nodemailer's default ten minutes.
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    },
  });
};
