// The catalog's starting vocabulary, in the owner's order (spec `sikora-beauty`, the requirements).
// English titles are drafts for the cosmetologist to correct in the admin.

type Term = { slug: string; uk: string; en: string };
type Zone = Term & { categories: Term[] };

export const zones: Zone[] = [
  {
    slug: 'face',
    uk: 'Обличчя',
    en: 'Face',
    categories: [
      { slug: 'face-cleansing', uk: 'Очищення', en: 'Cleansing' },
      { slug: 'face-toning', uk: 'Тонізація', en: 'Toning' },
      { slug: 'face-serums', uk: 'Сироватки', en: 'Serums' },
      { slug: 'face-creams', uk: 'Креми', en: 'Creams' },
      { slug: 'face-masks', uk: 'Маски', en: 'Masks' },
      {
        slug: 'face-peels',
        uk: 'Пілінги та ексфоліанти',
        en: 'Peels and exfoliants',
      },
      {
        slug: 'face-eye-care',
        uk: 'Догляд за шкірою навколо очей',
        en: 'Eye care',
      },
      { slug: 'face-spf', uk: 'SPF', en: 'SPF' },
      { slug: 'face-lip-care', uk: 'Догляд за губами', en: 'Lip care' },
    ],
  },
  {
    slug: 'body',
    uk: 'Тіло',
    en: 'Body',
    categories: [
      { slug: 'body-cleansing', uk: 'Очищення', en: 'Cleansing' },
      {
        slug: 'body-moisturising',
        uk: 'Зволоження та живлення',
        en: 'Moisturising and nourishing',
      },
      { slug: 'body-exfoliation', uk: 'Відлущування', en: 'Exfoliation' },
    ],
  },
  {
    slug: 'hair',
    uk: 'Волосся та шкіра голови',
    en: 'Hair and scalp',
    categories: [
      { slug: 'hair-shampoos', uk: 'Шампуні', en: 'Shampoos' },
      { slug: 'hair-conditioners', uk: 'Кондиціонери', en: 'Conditioners' },
      { slug: 'hair-masks', uk: 'Маски', en: 'Masks' },
      { slug: 'hair-leave-in', uk: 'Незмивний догляд', en: 'Leave-in care' },
      {
        slug: 'hair-scalp-serums',
        uk: 'Сироватки для шкіри голови',
        en: 'Scalp serums',
      },
      {
        slug: 'hair-scalp-peels',
        uk: 'Пілінги для шкіри голови',
        en: 'Scalp peels',
      },
    ],
  },
];

export const skinTypes: Term[] = [
  { slug: 'normal', uk: 'Нормальна', en: 'Normal' },
  { slug: 'dry', uk: 'Суха', en: 'Dry' },
  { slug: 'oily', uk: 'Жирна', en: 'Oily' },
  { slug: 'combination', uk: 'Комбінована', en: 'Combination' },
];

export const skinConditions: Term[] = [
  { slug: 'dehydrated', uk: 'Зневоднена', en: 'Dehydrated' },
  { slug: 'sensitive', uk: 'Чутлива', en: 'Sensitive' },
  {
    slug: 'redness-prone',
    uk: 'Схильна до почервоніння',
    en: 'Prone to redness',
  },
  {
    slug: 'breakout-prone',
    uk: 'Схильна до висипань',
    en: 'Prone to breakouts',
  },
  {
    slug: 'impaired-barrier',
    uk: "З порушеним захисним бар'єром",
    en: 'Impaired barrier',
  },
];

export const skinConcerns: Term[] = [
  { slug: 'acne', uk: 'Акне та висипання', en: 'Acne and breakouts' },
  { slug: 'pigmentation', uk: 'Пігментація', en: 'Pigmentation' },
  { slug: 'dehydration', uk: 'Зневоднення', en: 'Dehydration' },
  {
    slug: 'sensitivity-redness',
    uk: 'Чутливість і почервоніння',
    en: 'Sensitivity and redness',
  },
  { slug: 'barrier', uk: "Підтримка шкірного бар'єра", en: 'Barrier support' },
  {
    slug: 'early-ageing',
    uk: 'Перші ознаки вікових змін',
    en: 'First signs of ageing',
  },
];

export const brands = [
  { slug: 'dr-spiller', name: 'Dr.Spiller' },
  { slug: 'glymed-plus', name: 'Glymed+' },
  { slug: 'innoaesthetics', name: 'Innoaesthetics' },
  { slug: 'me-line', name: 'Me line' },
  { slug: 'dermafirm', name: 'Dermafirm' },
  { slug: 'braderm', name: 'Braderm' },
  { slug: 'institutum', name: 'Institutum' },
];
