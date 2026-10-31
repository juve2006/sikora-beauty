import { describe, expect, it } from 'vitest';

import { findProducts, spellings, words } from '@/lib/search';
import type { SearchDoc } from '@/types';

const docs: SearchDoc[] = [
  {
    id: 1,
    name: 'Очищувальне молочко',
    texts: ['Очищувальне молочко', 'Cleansing milk', 'Dr.Spiller', 'Пантенол'],
  },
  {
    id: 2,
    name: 'Сироватка з ніацинамідом',
    texts: [
      'Сироватка з ніацинамідом',
      'Niacinamide serum',
      'Glymed+',
      'Ніацинамід',
      'Niacinamide',
    ],
  },
  {
    id: 3,
    name: 'Крем для обличчя',
    texts: ['Крем для обличчя', 'Face cream', 'Dr.Spiller'],
  },
  {
    id: 4,
    name: 'Крем-маска',
    texts: ['Крем-маска', 'Cream mask', 'Institutum'],
  },
  {
    id: 5,
    name: 'Сироватка з вітаміном C',
    texts: ['Сироватка з вітаміном C', 'Vitamin C serum', 'Institutum'],
  },
];
const synonyms = [
  ['Dr.Spiller', 'доктор шпіллер', 'др шпіллер'],
  ['Glymed+', 'глімед'],
];
const find = (query: string, groups = synonyms) =>
  findProducts(docs, query, groups);

describe('words', () => {
  it('meets Latin and Cyrillic in one transliteration, in lower case', () => {
    expect(words('Dr.Spiller')).toEqual(['dr', 'spiller']);
    expect(words('ШПІЛЛЕР')).toEqual(['shpiller']);
    expect(words('Їжак йде')).toEqual(['yizhak', 'yde']);
  });

  it('drops apostrophes and Latin diacritics, keeps й and ї', () => {
    expect(words("м'ята м’ята")).toEqual(['miata', 'miata']);
    expect(words('Crème Sérum')).toEqual(['creme', 'serum']);
    expect(words('Мий')).toEqual(['myi']);
  });

  it('reads Russian letters as their Ukrainian neighbours', () => {
    expect(words('Сыворотка')).toEqual(words('Сиворотка'));
  });
});

describe('spellings', () => {
  it('reads a synonym group one spelling per line', () => {
    expect(spellings('Dr.Spiller\n  доктор шпіллер \n\n')).toEqual([
      'Dr.Spiller',
      'доктор шпіллер',
    ]);
    expect(spellings(null)).toEqual([]);
  });
});

describe('findProducts', () => {
  it('finds by name in either language, by brand and by active', () => {
    expect(find('молочко')).toEqual([1]);
    expect(find('milk')).toEqual([1]);
    expect(find('spiller')).toEqual([3, 1]);
    expect(find('ніацинамід')).toEqual([2]);
    expect(find('niacinamide')).toEqual([2]);
  });

  it('forgives a typo and the other alphabet', () => {
    expect(find('spiler')).toEqual([3, 1]);
    expect(find('шпіллер')).toEqual([3, 1]);
    expect(find('drspiller')).toEqual([3, 1]);
  });

  it('finds what a word begins with, as a shopper types', () => {
    expect(find('spi')).toEqual([3, 1]);
    expect(find('сирова')).toEqual([5, 2]);
  });

  it('takes a synonym where the spelling is too far', () => {
    expect(find('доктор шпіллер', [])).toEqual([]);
    expect(find('доктор шпіллер')).toEqual([3, 1]);
    expect(find('глімед', [])).toEqual([]);
    expect(find('глімед')).toEqual([2]);
  });

  it('wants every word of the query', () => {
    expect(find('крем')).toEqual([3, 4]);
    expect(find('крем шпіллер')).toEqual([3]);
    expect(find('крем glymed')).toEqual([]);
  });

  it('skips one-letter words', () => {
    expect(find('вітамін c')).toEqual([5]);
    expect(find('c')).toEqual([]);
  });

  it('puts the whole word before a longer one it begins', () => {
    const serums: SearchDoc[] = [
      { id: 1, name: 'Serumix', texts: ['Serumix'] },
      { id: 2, name: 'Serum', texts: ['Serum'] },
    ];
    expect(findProducts(serums, 'serum', [])).toEqual([2, 1]);
  });

  it('orders equally close products by name', () => {
    const creams: SearchDoc[] = [
      { id: 1, name: 'Нічний крем', texts: ['Нічний крем'] },
      { id: 2, name: 'Денний крем', texts: ['Денний крем'] },
    ];
    expect(findProducts(creams, 'крем', [])).toEqual([2, 1]);
  });

  it('finds nothing for what the store does not sell', () => {
    expect(find('парфуми')).toEqual([]);
    expect(find('  ')).toEqual([]);
  });
});
