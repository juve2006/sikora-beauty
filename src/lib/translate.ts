import type { ProductTexts } from '@/types';

// What «Перекласти з української» fills in a product's other locale: each text still empty there
// whose Ukrainian text exists. What someone already wrote is never overwritten.
const texts = [
  'name',
  'shortDescription',
  'purpose',
  'howToUse',
  'warnings',
] as const;

// Actives rows are shared by the locales, only their texts are not: rows match by id.
export function toTranslate(
  uk: ProductTexts,
  other: ProductTexts,
): { path: string; text: string }[] {
  const pairs: [path: string, from?: string | null, to?: string | null][] =
    texts.map((field) => [field, uk[field], other[field]]);
  const ukActives = Array.isArray(uk.actives) ? uk.actives : [];
  const otherActives = Array.isArray(other.actives) ? other.actives : [];
  otherActives.forEach((active, row) => {
    const source = ukActives.find(({ id }) => id === active.id);
    for (const field of ['name', 'role'] as const)
      pairs.push([`actives.${row}.${field}`, source?.[field], active[field]]);
  });
  return pairs.flatMap(([path, from, to]) =>
    from?.trim() && !to?.trim() ? [{ path, text: from }] : [],
  );
}

// The translation takes a while: by the time it arrives someone may have typed into a field, or
// moved an actives row. Only what `toTranslate` still names, for the same Ukrainian text, is filled.
export function stillEmpty<Job extends { path: string; text: string }>(
  jobs: Job[],
  uk: ProductTexts,
  other: ProductTexts,
) {
  const now = new Set(
    toTranslate(uk, other).map(({ path, text }) => `${path}\n${text}`),
  );
  return jobs.filter(({ path, text }) => now.has(`${path}\n${text}`));
}
