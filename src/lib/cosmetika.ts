import {
  cosmetikaOffer,
  cosmetikaProduct,
  cosmetikaUrl,
  kopiyky,
} from '@/lib/validators';
import type {
  CosmetikaProduct,
  Imported,
  ImportedOffer,
  ImportedTexts,
  VolumeUnit,
} from '@/types';
import { slugify } from '@/lib/utils';

// Our three brands there, by its spelling, to our brands' slugs (seed-data.ts).
const brands: Record<string, string> = {
  'Dr. Spiller': 'dr-spiller',
  Instytutum: 'institutum',
  Braderm: 'braderm',
};
export const brandSlugs = Object.values(brands);

// Its categories to ours (seed-data.ts). The brands are categories there too.
const categories: Record<string, string> = {
  'Креми, гелі для обличчя': 'face-creams',
  'Маски для обличчя': 'face-masks',
  'Тоніки, тонери, лосйони для обличчя': 'face-toning',
  'Сироватки для обличчя': 'face-serums',
  'Ампули, концентрати для обличчя': 'face-serums',
  'Гелі, пінки, емульсії, мило для вмивання': 'face-cleansing',
  'Гідрофільна олія': 'face-cleansing',
  'Міцелярна вода': 'face-cleansing',
  'Догляд за шкірою навколо очей': 'face-eye-care',
  'SPF засоби для обличчя': 'face-spf',
  'Пілінги, скраби для обличчя': 'face-peels',
  'Догляд за губами': 'face-lip-care',
};
const sets = 'Набори для догляду за обличчям';
const brandCategories = new Set(['Dr.Spiller', 'Instytutum', 'Braderm']);

// A product's terms of one taxonomy, by their names there.
const termsOf = (
  { _embedded }: Pick<CosmetikaProduct, '_embedded'>,
  taxonomy: string,
) =>
  _embedded['wp:term']
    .flat()
    .filter((term) => term.taxonomy === taxonomy)
    .map((term) => decode(term.name));

// Our brand's slug for one of its products, read before the whole product is checked: the other
// brands' products are not ours and are not errors.
export function brandOf(item: unknown): string | undefined {
  const parsed = cosmetikaProduct.pick({ _embedded: true }).safeParse(item);
  return parsed.success
    ? termsOf(parsed.data, 'product_brand')
        .map((brand) => brands[brand])
        .find(Boolean)
    : undefined;
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

export function decode(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code[0] !== '#') return entities[code.toLowerCase()] ?? entity;
      return String.fromCodePoint(
        code[1].toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16)
          : Number(code.slice(1)),
      );
    },
  );
}

// The admin's text areas hold plain text: paragraphs and headings on lines of their own, list items
// as «— …».
export function toText(html: string): string {
  const text = html
    .replace(/\s+/g, ' ')
    .replace(/<li[^>]*>/gi, '— ')
    .replace(/<br\s*\/?>|<\/li>/gi, '\n')
    .replace(/<\/(p|h[1-6]|ul|ol|div|table|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  return decode(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A heading there is an <h2>–<h6> or a paragraph of bold text alone («<p><strong>Повний склад
// (INCI)</strong></p>», most of the INCI).
const headings =
  /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>\s*<(?:strong|b)>[^<]*<\/(?:strong|b)>\s*<\/p>)/i;

// Instytutum labels the paragraph instead: «<p><strong>СКЛАД</strong>: AQUA, …</p>». Dr. Spiller's
// plain «Склад: …» lists the actives, which is not INCI, and stays in the purpose.
const labelledInci =
  /<p[^>]*>\s*<(strong|b)>\s*склад\s*(?::\s*<\/\1>|<\/\1>\s*:)/i;

// The description's headings differ from product to product; two are worth a field of their own.
// The rest is the purpose, headings included, for the cosmetologist to sort out.
function splitTexts(html: string): ImportedTexts {
  const sections: Record<keyof ImportedTexts, string> = {
    purpose: '',
    howToUse: '',
    inci: '',
  };
  let current: keyof ImportedTexts = 'purpose';
  // split() with a group puts every heading at an odd index.
  const marked = html.replace(labelledInci, '<h2>Склад (INCI)</h2><p>');
  marked.split(headings).forEach((part, index) => {
    if (index % 2 === 0) {
      sections[current] += part;
      return;
    }
    const heading = toText(part);
    current = /спосіб застосування/i.test(heading)
      ? 'howToUse'
      : /склад\s*\(inci\)/i.test(heading)
        ? 'inci'
        : 'purpose';
    if (current === 'purpose') sections.purpose += part;
  });
  const texts = Object.entries(sections).map(([field, section]) => [
    field,
    toText(section) || undefined,
  ]);
  return Object.fromEntries(texts);
}

const units: Record<string, VolumeUnit> = {
  мл: 'ml',
  ml: 'ml',
  г: 'g',
  g: 'g',
  шт: 'pcs',
};

// "…, 50 мл", "… 250 ml", "20мл": the last number with a unit in the name.
export function volumeOf(
  name: string,
): { volume: number; volumeUnit: VolumeUnit } | undefined {
  const match = [
    ...name.matchAll(/(\d+(?:[.,]\d+)?)\s*(мл|ml|г|g|шт)(?![\p{L}\d])/giu),
  ].at(-1);
  return (
    match && {
      volume: Number(match[1].replace(',', '.')),
      volumeUnit: units[match[2].toLowerCase()],
    }
  );
}

// One of our brands' products, as our draft would hold it. Availability stays empty: cosmetika's
// stock is not ours, and the owner sets ours before publishing.
export function toProduct(source: CosmetikaProduct): Imported {
  const name = decode(source.title.rendered).trim();
  const warnings: string[] = [];
  const texts = splitTexts(source.content.rendered);
  const ours = new Set<string>();
  const productCategories = termsOf(source, 'product_cat');
  for (const category of productCategories) {
    if (categories[category]) ours.add(categories[category]);
    else if (category !== sets && !brandCategories.has(category))
      warnings.push(`Категорію «${category}» не зіставлено`);
  }
  if (!ours.size) warnings.push('Без категорії: оберіть її вручну');
  const volume = volumeOf(name);
  if (!volume) warnings.push("Об'єму немає в назві");
  if (!texts.purpose && !texts.howToUse && !texts.inci)
    warnings.push('Без опису');
  return {
    name,
    slug: slugify(name),
    brand: brandOf(source) ?? '',
    categories: [...ours],
    isSet: productCategories.includes(sets),
    page: source.link,
    ...volume,
    ...texts,
    // INCI is copied, never generated, and keeps where it was copied from (RULES.md).
    inciSource: texts.inci && source.link,
    warnings,
  };
}

const jsonLd = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;

// The page's JSON-LD nodes; a block that is not JSON belongs to some plugin and says nothing of the
// product.
function nodesOf(html: string): unknown[] {
  return [...html.matchAll(jsonLd)].flatMap(([, block]) => {
    try {
      const parsed = JSON.parse(block);
      return parsed['@graph'] ?? [parsed];
    } catch {
      return [];
    }
  });
}

// What the list of products does not say: today's price, a sale's if there is one, and the gallery.
// A price is `1650.00`, so dropping its point gives kopiyky without a float.
export function offerOf(html: string): ImportedOffer {
  const price = nodesOf(html)
    .flatMap((node) => {
      const offer = cosmetikaOffer.safeParse(node);
      return offer.success ? offer.data.offers[0].priceSpecification : [];
    })
    .find((specification) => !specification.priceType)?.price;
  if (!price) throw new Error('ціну не прочитано');
  const images = [...html.matchAll(/data-large_image="([^"]+)"/g)].map(
    ([, src]) => decode(src),
  );
  if (!images.every((src) => cosmetikaUrl.safeParse(src).success))
    throw new Error('незрозуміла адреса фото');
  return {
    price: kopiyky.parse(Number(price.replace('.', ''))),
    images: [...new Set(images)],
  };
}
