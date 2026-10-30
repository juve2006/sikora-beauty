import type { TextField } from 'payload'

// Ukrainian national transliteration (2010); є ї й ю я are written differently at the start of a word.
const letters: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y',
  і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
}
const wordStart: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’ʼ`]/g, '')
    .replace(/зг/g, 'zgh')
    .replace(/(^|[^а-яґєії])([єїйюя])/g, (_, before: string, letter: string) => before + wordStart[letter])
    .replace(/[а-яґєії]/g, (letter) => letters[letter] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Latin, unique, one for both locales: a lookup by a localized slug has no fallback. A typed slug
// goes through slugify too: a list's URL carries slugs unencoded, comma-joined.
export function slugField(from: string): TextField {
  return {
    name: 'slug',
    type: 'text',
    label: 'Адреса (slug)',
    unique: true,
    index: true,
    admin: { position: 'sidebar', description: 'Латиницею. Порожнє — створиться з назви.' },
    hooks: {
      beforeValidate: [
        ({ value, siblingData }) => slugify(String(value || siblingData[from] || '')) || undefined,
      ],
    },
  }
}
