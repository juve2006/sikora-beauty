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

// Search's first synonyms: what search cannot reach by transliteration or a typo alone — a brand as
// shoppers write it in Cyrillic, an active by its other name. One spelling per line in the admin.
export const synonyms = [
  ['Dr.Spiller', 'доктор шпіллер', 'др шпіллер', 'доктор шпиллер'],
  ['Glymed+', 'глімед', 'глаймед', 'глимед'],
  ['Innoaesthetics', 'інноестетікс', 'інно естетікс', 'іноестетікс'],
  ['Me line', 'мі лайн', 'ме лайн', 'meline'],
  ['вітамін C', 'vitamin C', 'аскорбінова кислота', 'ascorbic acid'],
  ['гіалуронова кислота', 'гіалуронка', 'hyaluronic acid'],
  ['ніацинамід', 'niacinamide', 'вітамін B3', 'vitamin B3'],
];

// The care finder's first draft, off until the cosmetologist has rewritten it (task `care-finder`):
// cosmetic wording only, no medical claims. An answer names the vocabulary's slugs it means; one
// that names none means nothing. A step takes its category's products.
type FinderAnswerSeed = {
  uk: string;
  en: string;
  types?: string[];
  conditions?: string[];
  concerns?: string[];
};
type FinderQuestionSeed = {
  uk: string;
  en: string;
  hint?: { uk: string; en: string };
  multiple: boolean;
  answers: FinderAnswerSeed[];
};

const none = { uk: 'Нічого з цього', en: 'None of these' };

export const finderQuestions: FinderQuestionSeed[] = [
  {
    uk: 'Який у вас тип шкіри?',
    en: 'What is your skin type?',
    hint: {
      uk: 'Якщо не впевнені, оберіть «Не знаю».',
      en: 'Not sure? Choose “I don’t know”.',
    },
    multiple: false,
    answers: [
      ...skinTypes.map(({ slug, uk, en }) => ({ uk, en, types: [slug] })),
      { uk: 'Не знаю', en: 'I don’t know' },
    ],
  },
  {
    uk: 'Що з цього вам знайомо?',
    en: 'Which of these sound familiar?',
    multiple: true,
    answers: [
      {
        uk: 'Стягнутість після вмивання',
        en: 'Tightness after cleansing',
        conditions: ['dehydrated'],
      },
      {
        uk: 'Легко червоніє, реагує на нові засоби',
        en: 'Reddens easily, reacts to new products',
        conditions: ['sensitive', 'redness-prone'],
      },
      {
        uk: 'Час від часу висипання',
        en: 'Breakouts now and then',
        conditions: ['breakout-prone'],
      },
      {
        uk: 'Печіння, лущення',
        en: 'Stinging, flaking',
        conditions: ['impaired-barrier'],
      },
      none,
    ],
  },
  {
    uk: 'Що хочете покращити насамперед?',
    en: 'What would you like to improve first?',
    multiple: true,
    answers: skinConcerns.map(({ slug, uk, en }) => ({
      uk,
      en,
      concerns: [slug],
    })),
  },
  {
    uk: 'Скільки вам років?',
    en: 'How old are you?',
    multiple: false,
    answers: [
      { uk: 'До 25', en: 'Under 25' },
      { uk: '25–34', en: '25–34' },
      { uk: '35 і більше', en: '35 or older', concerns: ['early-ageing'] },
    ],
  },
];

export const finderSteps = [
  { category: 'face-cleansing', uk: 'Очищення', en: 'Cleansing' },
  { category: 'face-toning', uk: 'Тонізація', en: 'Toning' },
  { category: 'face-serums', uk: 'Сироватка', en: 'Serum' },
  { category: 'face-creams', uk: 'Крем', en: 'Cream' },
  { category: 'face-spf', uk: 'SPF', en: 'SPF' },
];
