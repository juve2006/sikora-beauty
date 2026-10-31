import type { SearchDoc } from '@/types';
import { slugify } from '@/lib/utils';

// Search over the published products, in memory, as the catalog's lists filter (adr-20261031-search-in-memory):
// the query and every text of a product are brought to one form, then compared word by word by
// trigrams, as Postgres's pg_trgm does — without depending on the database's locale.

// A word of the query must come this close to a word of the product; every word must.
const THRESHOLD = 0.4;
// A product's word that begins with the query's — the shopper is still typing — ranks below the
// whole word.
const BEGINS = 0.9;

// Russian letters a shopper may type, to their Ukrainian neighbours.
const russian: Record<string, string> = { ы: 'и', э: 'е', ё: 'е', ъ: '' };

// A text as search compares it: lower case, without apostrophes or Latin diacritics, Cyrillic
// transliterated as slugs are — so «Шпіллер» and «Spiller» meet as `shpiller` and `spiller`.
export const words = (text: string) =>
  slugify(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/([a-z])[̀-ͯ]+/g, '$1')
      .normalize('NFC')
      .replace(/[ыэёъ]/g, (letter) => russian[letter]),
  )
    .split('-')
    .filter(Boolean);

// A synonym group as the admin keeps it: one spelling per line.
export const spellings = (text: string | null | undefined) =>
  (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

type Word = { text: string; trigrams: Set<string> };

const word = (text: string): Word => {
  const padded = `  ${text} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++)
    trigrams.add(padded.slice(i, i + 3));
  return { text, trigrams };
};

const similarity = (query: Word, other: Word) => {
  if (other.text === query.text) return 1;
  if (other.text.startsWith(query.text)) return BEGINS;
  let common = 0;
  for (const trigram of query.trigrams)
    if (other.trigrams.has(trigram)) common++;
  return common / (query.trigrams.size + other.trigrams.size - common);
};

// The query in every spelling its synonyms give: «доктор шпіллер» is also «dr spiller».
function variants(query: string, synonyms: string[][]) {
  const phrase = ` ${words(query).join(' ')} `;
  const found = [phrase];
  for (const group of synonyms) {
    const spelled = group.map((spelling) => ` ${words(spelling).join(' ')} `);
    const used = spelled.find(
      (spelling) => spelling.trim() && phrase.includes(spelling),
    );
    if (used)
      for (const other of spelled)
        if (other !== used && other.trim())
          found.push(phrase.replace(used, other));
  }
  // A one-letter word («вітамін C») says too little to be asked for.
  return found
    .map((variant) =>
      variant
        .split(' ')
        .filter((text) => text.length > 1)
        .map(word),
    )
    .filter((variant) => variant.length > 0);
}

// The ids of the products that match every word of the query, the closest first, then by name.
export function findProducts(
  docs: SearchDoc[],
  query: string,
  synonyms: string[][],
) {
  const queries = variants(query, synonyms);
  if (queries.length === 0) return [];
  return docs
    .map((doc) => {
      const own = [...new Set(doc.texts.flatMap(words))].map(word);
      const scores = queries.map((variant) => {
        const best = variant.map((query) =>
          Math.max(0, ...own.map((other) => similarity(query, other))),
        );
        return best.every((score) => score >= THRESHOLD)
          ? best.reduce((sum, score) => sum + score, 0) / best.length
          : 0;
      });
      return { id: doc.id, name: doc.name, score: Math.max(...scores) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map(({ id }) => id);
}
