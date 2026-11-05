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
  // The shopper's pages, in the shape of sisters.co.ua's: returns inside payment and delivery, the
  // public offer as the terms of use. Drafts no lawyer has read, with the seller's details in brackets
  // for the owner to fill in, until `launch readiness` opens the store.
  {
    slug: 'delivery',
    uk: 'Оплата та доставка',
    en: 'Payment and delivery',
    blocks: [
      {
        uk: {
          blockType: 'text',
          title: 'Оплата',
          text: 'Ціни на сайті вказані в гривнях.\n\nПри отриманні: оплачуєте замовлення у відділенні Нової Пошти, коли забираєте посилку. Комісію за переказ коштів встановлює Нова Пошта.\n\nКарткою за посиланням: менеджер надішле посилання на оплату, коли підтвердить замовлення. Дані вашої картки магазин не бачить і не зберігає.',
        },
        en: {
          title: 'Payment',
          text: 'Prices on the site are in hryvnias.\n\nOn receipt: you pay for the order at the Nova Poshta branch when you collect the parcel. Nova Poshta sets the fee for the money transfer.\n\nBy card through a link: the manager sends you a payment link once they confirm the order. The store neither sees nor keeps your card details.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Доставка',
          text: 'Доставляємо Новою Поштою у відділення або поштомат по всій Україні. Вартість доставки визначають тарифи Нової Пошти, її ви оплачуєте при отриманні.\n\nПісля оформлення менеджер зателефонує, щоб підтвердити замовлення й доставку. Відправляємо після підтвердження. Якщо товар під замовлення, строк відправлення вказаний на його сторінці.\n\nЗабираючи посилку, перевірте її у відділенні. Якщо бачите пошкодження, зверніться до працівника Нової Пошти й повідомте нам.',
        },
        en: {
          title: 'Delivery',
          text: 'We deliver by Nova Poshta to a branch or parcel locker across Ukraine. Nova Poshta’s rates set the delivery cost, which you pay on receipt.\n\nAfter you place an order, the manager calls to confirm the order and delivery. We send it once it is confirmed. If a product is made to order, its page states when it ships.\n\nWhen you collect the parcel, check it at the branch. If you see damage, speak to the Nova Poshta staff and let us know.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Повернення та обмін',
          text: 'Запечатаний товар: упродовж 2 днів з дня отримання можна повернути або обміняти товар у цілій заводській упаковці, без слідів використання. Доставку повернення оплачує покупець.\n\nРозпакований товар належної якості ми не приймаємо: так дозволяє законодавство України, і це питання гігієни.\n\nБрак або помилка магазину: якщо товар пошкоджений, прострочений, неякісний або не той, що ви замовили, ми замінимо його або повернемо гроші. Доставку в цьому разі оплачує магазин.\n\nСкасування: замовлення можна скасувати, поки його не відправлено.\n\nЯк повернути: зв’яжіться з нами за контактами внизу сторінки й назвіть номер замовлення. Гроші повертаємо після того, як отримаємо й перевіримо товар.',
        },
        en: {
          title: 'Returns and exchanges',
          text: 'Sealed products: within 2 days of receipt you can return or exchange a product in its intact factory packaging, with no signs of use. The shopper pays for the return delivery.\n\nWe do not take back opened products of proper quality: Ukrainian law allows this, and it is a matter of hygiene.\n\nDefects and the store’s mistakes: if a product is damaged, expired, faulty or not what you ordered, we replace it or refund you. In that case the store pays for the delivery.\n\nCancelling: you can cancel an order until it is sent.\n\nHow to return: contact us through the details at the bottom of the page and give the order number. We refund you once we have received and checked the product.',
        },
      },
    ],
  },
  {
    slug: 'terms',
    uk: 'Умови використання сайту',
    en: 'Terms of use',
    blocks: [
      {
        uk: {
          blockType: 'text',
          title: 'Публічна оферта',
          text: 'Ці умови є публічною офертою: пропозицією укласти договір купівлі-продажу на однакових умовах з кожним покупцем. Оформлюючи замовлення, ви приймаєте їх.\n\nПродавець: ФОП Сікора Ярина Романівна, РНОКПП [вписати], адреса [вписати]. Контакти вказані внизу сторінки.',
        },
        en: {
          title: 'Public offer',
          text: 'These terms are a public offer: a proposal to conclude a sales contract on the same conditions with every shopper. By placing an order you accept them.\n\nSeller: sole proprietor Yaryna Romanivna Sikora, tax number [to fill in], address [to fill in]. The contacts are at the bottom of the page.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Терміни',
          text: 'Продавець: особа, названа вище.\n\nПокупець: людина, яка оформлює замовлення на сайті.\n\nТовар: косметичний засіб із каталогу сайту.\n\nЗамовлення: запит покупця на купівлю вибраних товарів, надісланий через сайт.',
        },
        en: {
          title: 'Definitions',
          text: 'Seller: the person named above.\n\nShopper: a person who places an order on the site.\n\nProduct: a cosmetic product from the site’s catalog.\n\nOrder: a shopper’s request to buy the chosen products, sent through the site.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Замовлення і ціна',
          text: 'Договір укладено, коли менеджер підтвердив замовлення. Якщо товару немає або на сайті помилка в ціні, менеджер скаже про це до відправлення, і ви вирішите, чи лишати замовлення.\n\nДіє ціна на момент оформлення замовлення.\n\nОплату, доставку й повернення описано на сторінці «Оплата та доставка».',
        },
        en: {
          title: 'Orders and prices',
          text: 'The contract is concluded when the manager confirms the order. If a product is unavailable or the site shows a wrong price, the manager tells you before sending, and you decide whether to keep the order.\n\nThe price at the moment of placing the order applies.\n\nPayment, delivery and returns are described on the “Payment and delivery” page.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Обов’язки сторін',
          text: 'Продавець передає товар належної якості. Термін придатності вказаний на упаковці.\n\nПокупець дає правильні дані для доставки, оплачує замовлення й перевіряє посилку при отриманні.',
        },
        en: {
          title: 'Obligations of the parties',
          text: 'The seller hands over a product of proper quality. Its expiry date is on the packaging.\n\nThe shopper gives correct delivery details, pays for the order and checks the parcel on receipt.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Інші положення',
          text: 'Оформлення упаковки може відрізнятися від фото на сайті, і це не вважається браком.\n\nПоради косметолога й підбір догляду не замінюють консультацію лікаря. Перед застосуванням прочитайте склад і застереження.\n\nТексти й зображення сайту не можна використовувати без згоди продавця, крім випадків, дозволених законом.\n\nСторони не відповідають за невиконання умов через обставини непереборної сили. Суперечки вирішуємо переговорами, а якщо не вдалося, то за законодавством України.\n\nПро те, як ми поводимося з вашими даними, читайте в політиці конфіденційності. Ми можемо змінювати ці умови: до вже оформленого замовлення застосовуються умови, чинні на момент його оформлення.\n\nОновлено 05.11.2026.',
        },
        en: {
          title: 'Other provisions',
          text: 'Packaging design may differ from the photos on the site, which is not considered a defect.\n\nThe cosmetologist’s advice and the care finder do not replace a doctor’s consultation. Read the ingredients and warnings before use.\n\nThe site’s texts and images may not be used without the seller’s consent, except where the law allows it.\n\nThe parties are not liable for failing to meet these terms because of force majeure. We settle disputes by negotiation and, failing that, under the law of Ukraine.\n\nThe privacy policy describes how we treat your data. We may change these terms: an order already placed stays under the terms in force when it was placed.\n\nUpdated 05.11.2026.',
        },
      },
    ],
  },
  {
    slug: 'privacy',
    uk: 'Політика конфіденційності',
    en: 'Privacy policy',
    blocks: [
      {
        uk: {
          blockType: 'text',
          title: 'Хто ми',
          text: 'Цей сайт веде магазин Sikora Beauty, продавець ФОП Сікора Ярина Романівна. З питаннями про свої дані звертайтеся за контактами внизу сторінки.',
        },
        en: {
          title: 'Who we are',
          text: 'This site is run by the Sikora Beauty store; the seller is sole proprietor Yaryna Romanivna Sikora. For questions about your data, use the contacts at the bottom of the page.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Які дані ми збираємо і навіщо',
          text: "Замовлення: ім'я, прізвище, телефон, населений пункт і відділення Нової Пошти, коментар і склад замовлення. Вони потрібні, щоб виконати й доставити замовлення.\n\nЗапит на консультацію: ім'я, телефон, ваше повідомлення, а також товар і відповіді з підбору догляду, якщо вони були. Вони потрібні, щоб зв'язатися з вами.\n\nАкаунт: ім'я, прізвище, пошта, телефон, мова сайту й історія замовлень. Вони потрібні, щоб вести ваш кабінет. Для входу ви використовуєте пошту або номер телефону. Пароль ми зберігаємо лише у вигляді хешу, тож прочитати його не можемо.",
        },
        en: {
          title: 'What we collect and why',
          text: 'Orders: first and last name, phone, town and Nova Poshta branch, comment and the order’s contents. We need them to fulfil and deliver the order.\n\nConsultation requests: name, phone, your message, and the product and care finder answers if there were any. We need them to contact you.\n\nAccounts: first and last name, email, phone, the site’s language and order history. We need them to run your account. You sign in with your email or phone number. We keep your password only as a hash, so we cannot read it.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Вхід через Google',
          text: "Якщо ви входите через Google, ми отримуємо від Google ваше ім'я, прізвище, адресу пошти й ідентифікатор акаунта Google. Вони потрібні лише для того, щоб створити акаунт і впустити вас. Ми не отримуємо ваш пароль від Google, не читаємо вашу пошту й нічого не публікуємо від вашого імені.",
        },
        en: {
          title: 'Signing in with Google',
          text: 'If you sign in with Google, Google gives us your first and last name, email address and Google account identifier. We use them only to create your account and sign you in. We do not receive your Google password, do not read your mail and do not post anything on your behalf.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Кому ми передаємо дані',
          text: 'Telegram: нові замовлення й запити на консультацію надходять у групу магазину.\n\nНова Пошта: дані одержувача, коли ми відправляємо посилку.\n\nGoogle (Gmail): надсилає листи вашого акаунта, зокрема для підтвердження пошти й відновлення пароля.\n\nVercel і Neon: хостинг сайту й база даних.\n\nCloudflare Turnstile: може перевіряти, що форму надсилає людина.\n\nЦі сервіси можуть обробляти дані за межами України. Ми не продаємо ваші дані.',
        },
        en: {
          title: 'Who we share data with',
          text: 'Telegram: new orders and consultation requests arrive in the store’s group.\n\nNova Poshta: the recipient’s details, when we send a parcel.\n\nGoogle (Gmail): sends your account’s letters, including email confirmation and password reset.\n\nVercel and Neon: the site’s hosting and database.\n\nCloudflare Turnstile: may check that a form is sent by a person.\n\nThese services may process data outside Ukraine. We do not sell your data.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Cookie і дані у браузері',
          text: "Cookie потрібні лише для того, щоб ви лишалися в акаунті після входу, щоб завершити вхід через Google і щоб запам'ятати мову. Кошик, обране й тема зберігаються у вашому браузері, а не в нас.\n\nАналітики й реклами на сайті зараз немає. Якщо вони з'являться, ми попросимо вашу згоду й оновимо цю сторінку.",
        },
        en: {
          title: 'Cookies and data in your browser',
          text: 'We use cookies only to keep you signed in, to complete a Google sign-in and to remember your language. Your cart, favourites and theme are kept in your browser, not with us.\n\nThe site has no analytics or advertising at the moment. If that changes, we will ask for your consent and update this page.',
        },
      },
      {
        uk: {
          blockType: 'text',
          title: 'Скільки ми зберігаємо дані та ваші права',
          text: 'Окремого строку зберігання немає: дані лишаються в нас, доки ви не попросите їх видалити. Ви можете попросити показати, виправити або видалити свої дані, скориставшись контактами внизу сторінки. Дані профілю можна змінити й самостійно в кабінеті.\n\nНа ваш запит ми видаляємо акаунт, запити на консультацію й повідомлення в Telegram. Записи замовлень після видалення акаунта лишаються в нашому обліку.\n\nЦі права дає Закон України «Про захист персональних даних». Скаргу можна подати Уповноваженому Верховної Ради України з прав людини.\n\nОновлено 05.11.2026.',
        },
        en: {
          title: 'How long we keep data and your rights',
          text: 'There is no fixed retention period: data stays with us until you ask us to delete it. You can ask us to show, correct or delete your data through the contacts at the bottom of the page. You can also change your profile yourself in your account.\n\nOn request we delete your account, consultation requests and the messages in Telegram. Order records stay in our books after an account is deleted.\n\nThese rights come from the Law of Ukraine on Personal Data Protection. You can file a complaint with the Ukrainian Parliament Commissioner for Human Rights.\n\nUpdated 05.11.2026.',
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
