import { createHash, timingSafeEqual } from 'node:crypto';

// Whether a request carries the cron's secret. Compared as digests, in constant time whatever its
// length; no secret on the server refuses everyone.
export const fromCron = (authorization: string | null) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;
  const [sent, expected] = [authorization, `Bearer ${secret}`].map((value) =>
    createHash('sha256').update(value).digest(),
  );
  return timingSafeEqual(sent, expected);
};
