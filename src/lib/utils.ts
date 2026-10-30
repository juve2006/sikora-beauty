export { cn } from 'cn';

// Prices are stored as integer kopiyky (RULES.md); people read and type hryvnias.

export function formatHryvnias(kopiyky: number): string {
  const hryvnias = Math.trunc(kopiyky / 100);
  const rest = kopiyky % 100;
  return rest === 0
    ? String(hryvnias)
    : `${hryvnias},${String(rest).padStart(2, '0')}`;
}

// schema.org's price: a dot and two decimals, still from integers — 124550 → "1245.50".
export function offerPrice(kopiyky: number): string {
  return `${Math.trunc(kopiyky / 100)}.${String(kopiyky % 100).padStart(2, '0')}`;
}

// "1245", "1 245,5", "1245.50" → 124550; anything else → null.
export function parseHryvnias(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.replace(/\s/g, ''));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

// Ukrainian national transliteration (2010); є ї й ю я are written differently at the start of a word.
const letters: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
};
const wordStart: Record<string, string> = {
  є: 'ye',
  ї: 'yi',
  й: 'y',
  ю: 'yu',
  я: 'ya',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’ʼ`]/g, '')
    .replace(/зг/g, 'zgh')
    .replace(
      /(^|[^а-яґєії])([єїйюя])/g,
      (_, before: string, letter: string) => before + wordStart[letter],
    )
    .replace(/[а-яґєії]/g, (letter) => letters[letter] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
