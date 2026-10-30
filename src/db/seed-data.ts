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

// The home and the about page's first blocks, drafts for the owner to rewrite in the admin. `uk`
// creates a block; `en` holds its English texts.
export const pages = [
  {
    slug: 'home',
    uk: 'Головна',
    en: 'Home',
    blocks: [
      {
        uk: {
          blockType: 'hero',
          title: 'Професійний догляд за шкірою',
          text: `Засоби брендів, з якими працюють косметологи: ${brands.map(({ name }) => name).join(', ')}. Підберіть догляд за зоною, типом шкіри чи її потребою — або запитайте косметолога.`,
          buttonLabel: 'Перейти до каталогу',
          buttonLink: '/catalog/face',
        },
        en: {
          title: 'Professional skincare',
          text: `Products from the brands cosmetologists work with: ${brands.map(({ name }) => name).join(', ')}. Find your care by zone, skin type or concern — or ask the cosmetologist.`,
          buttonLabel: 'Go to the catalog',
        },
      },
      {
        uk: {
          blockType: 'products',
          title: 'Новинки',
          collection: 'new',
          limit: 4,
        },
        en: { title: 'New arrivals' },
      },
      {
        uk: { blockType: 'tiles', title: 'Догляд за зоною', source: 'zones' },
        en: { title: 'Care by zone' },
      },
      {
        uk: {
          blockType: 'products',
          title: 'Бестселери',
          collection: 'bestsellers',
          limit: 4,
        },
        en: { title: 'Bestsellers' },
      },
      {
        uk: {
          blockType: 'consultation',
          title: 'Не впевнені, що підійде вашій шкірі?',
          text: "Залиште ім'я й телефон — косметолог зв'яжеться з вами й допоможе підібрати догляд.",
        },
        en: {
          title: 'Not sure what suits your skin?',
          text: 'Leave your name and phone — the cosmetologist will get in touch and help you choose your care.',
        },
      },
    ],
  },
  {
    slug: 'about',
    uk: 'Про Sikora Beauty',
    en: 'About Sikora Beauty',
    blocks: [
      {
        uk: {
          blockType: 'hero',
          title: 'Про Sikora Beauty',
          text: 'Інтернет-магазин професійної косметики для догляду за шкірою.',
        },
        en: {
          title: 'About Sikora Beauty',
          text: 'An online store of professional skincare.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Що ми робимо',
          text: 'Ми продаємо засоби брендів, з якими працюють косметологи, і допомагаємо підібрати догляд: за зоною, типом і станом шкіри, її потребами.\n\nЯкщо не знаєте, з чого почати, — запитайте косметолога: кнопка «Консультація» є на кожній сторінці.',
        },
        en: {
          title: 'What we do',
          text: 'We sell products from the brands cosmetologists work with and help you choose your care: by zone, skin type and condition, and what your skin needs.\n\nNot sure where to start? Ask the cosmetologist: the “Consultation” button is on every page.',
        },
      },
    ],
  },
];
