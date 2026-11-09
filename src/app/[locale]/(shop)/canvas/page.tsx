import { cn } from 'cn';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type {
  Listing as ListingResult,
  CardProduct,
  FinderQuestion,
  Menu,
} from '@/types';
import type { Media } from '@/payload-types';
import { routing } from '@/i18n/routing';
import { isStaff } from '@/lib/access';
import { ORDER_STATUSES } from '@/lib/constants';
import { sessionUser } from '@/lib/actions/customer.actions';
import { listingParams } from '@/lib/validators';
import FilterPanel from '@/components/shared/catalog/filter-panel';
import FiltersSheet from '@/components/shared/catalog/filters-sheet';
import CategoryNav from '@/app/[locale]/(shop)/catalog/[slug]/category-nav';
import Listing from '@/components/shared/catalog/listing';
import ListingEmpty from '@/components/shared/catalog/listing-empty';
import ListingPagination from '@/components/shared/catalog/listing-pagination';
import SortSelect from '@/components/shared/catalog/sort-select';
import LanguageSwitcher from '@/components/shared/header/language-switcher';
import Logo from '@/components/shared/header/logo';
import AddToCart from '@/app/[locale]/(shop)/product/[slug]/add-to-cart';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import ConsultationForm from '@/components/shared/consultation/consultation-form';
import SearchDialog from '@/components/shared/search/search-dialog';
import SearchSuggestions from '@/components/shared/search/search-suggestions';
import SearchEmpty from '@/app/[locale]/(shop)/search/search-empty';
import Availability from '@/components/shared/product/availability';
import DeliveryPayment from '@/app/[locale]/(shop)/product/[slug]/delivery-payment';
import ProductCard from '@/components/shared/product/product-card';
import ProductGallery from '@/app/[locale]/(shop)/product/[slug]/product-gallery';
import ProductPrice from '@/components/shared/product/product-price';
import FavoriteButton from '@/components/shared/product/favorite-button';
import FavoritesView from '@/app/[locale]/(shop)/favorites/favorites-view';
import CartView from '@/app/[locale]/(shop)/cart/cart-view';
import CheckoutForm from '@/app/[locale]/(shop)/cart/checkout-form';
import DeliveryFields from '@/app/[locale]/(shop)/cart/delivery-fields';
import OrderPlaced from '@/app/[locale]/(shop)/cart/thanks/order-placed';
import RetryForm from '@/app/[locale]/(shop)/cart/thanks/retry-form';
import FinderQuestions from '@/app/[locale]/(shop)/care-finder/finder-questions';
import Routine from '@/app/[locale]/(shop)/care-finder/routine';
import NewPasswordForm from '@/app/[locale]/(shop)/account/new-password-form';
import OrderHistory from '@/app/[locale]/(shop)/account/order-history';
import ProfileForm from '@/app/[locale]/(shop)/account/profile-form';
import RequestResetForm from '@/app/[locale]/(shop)/account/request-reset-form';
import AccountDialog from '@/components/shared/account/account-dialog';
import RegisterForm from '@/components/shared/account/register-form';
import ResendForm from '@/components/shared/account/resend-form';
import SignInForm from '@/components/shared/account/sign-in-form';
import AccountLink from '@/components/shared/header/account-link';
import AdminLink from '@/components/shared/header/admin-link';
import CartLink from '@/components/shared/header/cart-link';
import FavoritesLink from '@/components/shared/header/favorites-link';
import FooterContent from '@/components/shared/footer/footer-content';
import MainMenu from '@/components/shared/header/main-menu';
import MobileMenu from '@/components/shared/header/mobile-menu';
import ThemeToggle from '@/components/shared/header/theme-toggle';
import ConsultationBlock from '@/components/shared/blocks/consultation-block';
import Hero from '@/components/shared/blocks/hero';
import PageBlocks from '@/components/shared/blocks/page-blocks';
import ProductGrid from '@/components/shared/blocks/product-grid';
import TextBlock from '@/components/shared/blocks/text-block';
import TileGrid from '@/components/shared/blocks/tile-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Every storefront component in every variant and state (RULES.md): a component a task adds
// gets a section here in the same pull request.

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md).
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('Canvas');
  return { title: t('title'), robots: { index: false, follow: false } };
}

// In production only the owner or the cosmetologist sees the canvas; a shopper's session is a
// session too, and it opens nothing here. Locally anyone does.
async function requireAdminUser() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!isStaff(await sessionUser())) notFound();
}

const colors = [
  ['background', 'bg-background'],
  ['foreground', 'bg-foreground'],
  ['card', 'bg-card'],
  ['primary', 'bg-primary'],
  ['primary-foreground', 'bg-primary-foreground'],
  ['secondary', 'bg-secondary'],
  ['muted', 'bg-muted'],
  ['muted-foreground', 'bg-muted-foreground'],
  ['accent', 'bg-accent'],
  ['accent-foreground', 'bg-accent-foreground'],
  ['destructive', 'bg-destructive'],
  ['border', 'bg-border'],
  ['input', 'bg-input'],
  ['ring', 'bg-ring'],
] as const;

const textSizes = [
  'text-5xl',
  'text-4xl',
  'text-3xl',
  'text-2xl',
  'text-xl',
  'text-lg',
] as const;

const variants = ['default', 'secondary', 'outline', 'ghost', 'link'] as const;

const sizes = ['sm', 'default', 'lg'] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t py-8">
      <h2 className="mb-6 text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const samples = [
  '/samples/bottle.svg',
  '/samples/jar.svg',
  '/samples/tube.svg',
];

const madeToOrderDays = [1, 3, 5];

type Props = { params: Promise<{ locale: string }> };

const CanvasPage = async ({ params }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await requireAdminUser();
  const t = await getTranslations('Canvas');
  const consultation = await getTranslations('Consultation');
  const nav = await getTranslations('Nav');
  const sampleProduct = { id: 0, name: t('sampleName') };
  const sampleCustomer = {
    firstName: t('sampleFirstName'),
    lastName: t('sampleLastName'),
    phone: '+380671234567',
    email: 'name@example.com',
  };
  const photos = samples.map((url) => ({ url, alt: t('sampleAlt') }));
  const image: Media = {
    id: 0,
    alt: t('sampleAlt'),
    url: samples[1],
    updatedAt: '',
    createdAt: '',
  };
  // No product has this id: a heart pressed here leaves the favorites when /favorites asks for it.
  const card = (overrides: Partial<CardProduct>): CardProduct => ({
    id: 900001,
    slug: 'sample',
    name: t('sampleName'),
    brand: t('sampleBrand'),
    price: 124550,
    volume: 30,
    volumeUnit: 'ml',
    availability: 'in_stock',
    photo: photos[0],
    ...overrides,
  });
  const zone = { slug: 'face', title: t('sampleZone') };
  const categories = [
    { slug: 'face-serums', title: t('sampleCategory') },
    { slug: 'face-creams', title: t('sampleCategory2') },
  ];
  const menu: Menu = {
    zones: [{ ...zone, categories }],
    concerns: [{ slug: 'dehydration', title: t('sampleConcern') }],
  };
  // The care finder's questionnaire as its admin writes it; a routine shows terms by their titles.
  const answer = (id: string, label: string) => ({
    id,
    label,
    terms: { type: [], condition: [], concern: [] },
  });
  const questions: FinderQuestion[] = [
    {
      id: 'q1',
      question: t('sampleQuestion'),
      hint: t('sampleHint'),
      multiple: false,
      answers: [
        answer('a1', t('sampleSkin')),
        answer('a2', t('sampleOily')),
        answer('a3', t('sampleUnknown')),
      ],
    },
    {
      id: 'q2',
      question: t('sampleQuestion2'),
      multiple: true,
      answers: [
        answer('a4', t('sampleTight')),
        answer('a5', t('sampleRedness')),
        answer('a6', t('sampleNone')),
      ],
    },
    {
      id: 'q3',
      question: t('sampleQuestion3'),
      multiple: false,
      answers: [answer('a7', t('sampleYes')), answer('a8', t('sampleNo'))],
    },
  ];
  const skin = {
    type: [{ slug: 'dry', title: t('sampleSkin') }],
    condition: [],
    concern: [{ slug: 'dehydration', title: t('sampleConcern') }],
  };
  const noSkin = { type: [], condition: [], concern: [] };
  const step = (id: string, title: string, products: CardProduct[]) => ({
    id,
    title,
    categories: [],
    products: products.map((product) => ({ card: product })),
  });
  const noFilters = listingParams.parse({});
  const filtered = listingParams.parse({ type: 'dry', concern: 'dehydration' });
  // Counts as a list shows them; a chosen value with nothing left stays, at 0.
  const facets = (chosen: string[]): ListingResult['facets'] => [
    {
      key: 'type',
      values: [
        {
          slug: 'dry',
          title: t('sampleSkin'),
          count: 3,
          selected: chosen.includes('dry'),
        },
        { slug: 'oily', title: t('sampleOily'), count: 5, selected: false },
      ],
    },
    {
      key: 'concern',
      values: [
        {
          slug: 'dehydration',
          title: t('sampleConcern'),
          count: chosen.includes('dehydration') ? 0 : 4,
          selected: chosen.includes('dehydration'),
        },
      ],
    },
    {
      key: 'brand',
      values: [
        {
          slug: 'dr-spiller',
          title: t('sampleBrand'),
          count: 12,
          selected: false,
        },
      ],
    },
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-page px-4 pb-16 sm:px-6">
        <div className="pt-8 pb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <Section title={t('colors')}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {colors.map(([name, className]) => (
              <li key={name} className="flex flex-col gap-2">
                <span className={cn('h-14 rounded-lg border', className)} />
                <span className="text-xs break-all text-muted-foreground">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('typography')}>
          <div className="flex flex-col gap-5">
            {textSizes.map((size) => (
              <Specimen key={size} label={size}>
                <p
                  className={cn(
                    size,
                    'leading-tight font-semibold tracking-tight',
                  )}
                >
                  {t('heading')}
                </p>
              </Specimen>
            ))}
            <Specimen label="text-base">
              <p className="max-w-[65ch] leading-relaxed">{t('body')}</p>
            </Specimen>
            <Specimen label="text-sm text-muted-foreground">
              <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                {t('body')}
              </p>
            </Specimen>
            <Specimen label="font-light / font-normal / font-medium / font-semibold">
              <p className="text-2xl font-light">{t('glyphs')}</p>
              <p className="text-2xl font-normal">{t('glyphs')}</p>
              <p className="text-2xl font-medium">{t('glyphs')}</p>
              <p className="text-2xl font-semibold">{t('glyphs')}</p>
            </Specimen>
          </div>
        </Section>

        <Section title="Logo">
          <div className="flex flex-col gap-5">
            <Specimen label="size=sm">
              <Logo size="sm" />
            </Specimen>
            <Specimen label="size=md">
              <Logo size="md" />
            </Specimen>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-col gap-6">
            {variants.map((variant) => (
              <Specimen key={variant} label={`variant=${variant}`}>
                {sizes.map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {t('buttonLabel')}
                  </Button>
                ))}
                <Button
                  variant={variant}
                  size="icon"
                  aria-label={t('buttonIcon')}
                >
                  <ShoppingBag />
                </Button>
                <Button variant={variant} disabled>
                  {t('buttonLabel')}
                </Button>
              </Specimen>
            ))}
          </div>
        </Section>

        <Section title="LanguageSwitcher">
          <LanguageSwitcher />
        </Section>

        <Section title="ThemeToggle">
          <ThemeToggle />
        </Section>

        <Section title="BackToTop">
          <p className="text-sm text-muted-foreground">{t('backToTopNote')}</p>
        </Section>

        <Section title="MainMenu">
          <div className="flex min-h-80 items-start">
            <MainMenu menu={menu} finder />
          </div>
        </Section>

        <Section title="MobileMenu">
          <MobileMenu menu={menu} finder />
        </Section>

        <Section title="AdminLink">
          <Specimen label="shown">
            <AdminLink shown />
          </Specimen>
        </Section>

        <Section title="FooterContent">
          <Specimen label="every contact filled in; the care finder on">
            <FooterContent
              menu={menu}
              finder
              contacts={{
                phone: '+38 (067) 000-00-00',
                email: 'shop@example.com',
                instagram: 'https://www.instagram.com/example',
                hours: t('sampleHours'),
                address: t('sampleAddress'),
              }}
            />
          </Specimen>
          <Specimen label="no contacts yet: their column is not there">
            <FooterContent menu={menu} contacts={{}} />
          </Specimen>
        </Section>

        <Section title="AccountLink">
          <Specimen label="from sm; a phone has it in MobileMenu">
            <AccountLink />
          </Specimen>
        </Section>

        <Section title="FavoritesLink">
          <Specimen label="0 / 3 / this browser's">
            <FavoritesLink shown={0} />
            <FavoritesLink shown={3} />
            <FavoritesLink />
          </Specimen>
        </Section>

        <Section title="CartLink">
          <Specimen label="0 / 3 / this browser's">
            <CartLink shown={0} />
            <CartLink shown={3} />
            <CartLink />
          </Specimen>
        </Section>

        <Section title="FavoriteButton">
          <div className="flex flex-col gap-5">
            <Specimen label="card: not pressed / pressed / this browser's">
              <FavoriteButton
                id={900001}
                name={t('sampleName')}
                pressed={false}
              />
              <FavoriteButton id={900001} name={t('sampleName')} pressed />
              <FavoriteButton id={900001} name={t('sampleName')} />
            </Specimen>
            <Specimen label="labelled (product page): not pressed / pressed / this browser's">
              <FavoriteButton
                id={900001}
                name={t('sampleName')}
                labelled
                pressed={false}
              />
              <FavoriteButton
                id={900001}
                name={t('sampleName')}
                labelled
                pressed
              />
              <FavoriteButton id={900001} name={t('sampleName')} labelled />
            </Specimen>
          </div>
        </Section>

        <Section title="PageBlocks">
          <Specimen label="no banner first: the page's title and description (home with no page)">
            <div className="w-full rounded-lg border">
              <PageBlocks
                title={t('heading')}
                description={t('body')}
                blocks={[]}
                locale={locale}
              />
            </div>
          </Specimen>
        </Section>

        <Section title="Hero">
          <div className="flex flex-col gap-5">
            <Specimen label="first (h1), with a photo and a button">
              <div className="w-full">
                <Hero
                  first
                  block={{
                    blockType: 'hero',
                    title: t('heading'),
                    text: t('body'),
                    image,
                    buttonLabel: nav('brands'),
                    buttonLink: '/brands',
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="not first (h2), a title only">
              <div className="w-full">
                <Hero
                  first={false}
                  block={{ blockType: 'hero', title: t('heading') }}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="TextBlock">
          <div className="flex flex-col gap-5">
            {[image, null].map((photo) => (
              <Specimen
                key={photo ? 'photo' : 'none'}
                label={photo ? 'with a photo' : 'without'}
              >
                <div className="w-full">
                  <TextBlock
                    block={{
                      blockType: 'text',
                      title: t('heading'),
                      text: `${t('body')}\n\n${t('body')}`,
                      image: photo,
                    }}
                  />
                </div>
              </Specimen>
            ))}
          </div>
        </Section>

        <Section title="ConsultationBlock">
          <ConsultationBlock
            block={{
              blockType: 'consultation',
              title: consultation('title'),
              text: consultation('description'),
            }}
          />
        </Section>

        {/* Tiles and ProductsBlock read the store's data and hide with none; here, what they show. */}
        <Section title="TileGrid">
          <TileGrid title={nav('catalog')} source="zones" terms={[zone]} />
          <TileGrid
            title={nav('concerns')}
            source="concerns"
            terms={menu.concerns}
          />
        </Section>

        <Section title="ProductGrid">
          <ProductGrid
            title={nav('collections')}
            collection="new"
            products={[
              card({}),
              card({ photo: photos[1] }),
              card({ availability: 'out_of_stock', photo: photos[2] }),
              card({ photo: undefined }),
            ].map((product, id) => ({ id, card: product }))}
          />
        </Section>

        <Section title="Badge">
          <Specimen label="variant=secondary / outline">
            <Badge variant="secondary">{t('sampleSkin')}</Badge>
            <Badge variant="outline">{t('sampleSkin')}</Badge>
          </Specimen>
        </Section>

        <Section title="Availability">
          <div className="flex flex-col gap-5">
            <Specimen label="in_stock">
              <Availability availability="in_stock" />
            </Specimen>
            <Specimen label="made_to_order (1 / 3 / 5)">
              {madeToOrderDays.map((days) => (
                <Availability
                  key={days}
                  availability="made_to_order"
                  madeToOrderDays={days}
                />
              ))}
            </Specimen>
            <Specimen label="out_of_stock">
              <Availability availability="out_of_stock" />
            </Specimen>
          </div>
        </Section>

        <Section title="ProductPrice">
          <Specimen label="124500 / 124550">
            <ProductPrice
              price={124500}
              className="text-3xl font-semibold tracking-tight"
            />
            <ProductPrice price={124550} className="font-semibold" />
          </Specimen>
        </Section>

        <Section title="ProductGallery">
          <div className="grid gap-8 sm:grid-cols-3">
            <Specimen label="photos=3">
              <div className="w-full">
                <ProductGallery photos={photos} />
              </div>
            </Specimen>
            <Specimen label="photos=1">
              <div className="w-full">
                <ProductGallery photos={photos.slice(0, 1)} />
              </div>
            </Specimen>
            <Specimen label="photos=0">
              <div className="w-full">
                <ProductGallery photos={[]} />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="AddToCart">
          <Specimen label="in the cart / out of stock / this browser's">
            <AddToCart id={900001} availability="in_stock" inCart />
            <AddToCart id={900001} availability="out_of_stock" />
            <AddToCart id={900001} availability="in_stock" />
          </Specimen>
        </Section>

        <Section title="ConsultationDialog">
          <Specimen label="header / product">
            <ConsultationDialog>
              <Button variant="ghost" size="sm">
                <MessageCircle data-icon="inline-start" aria-hidden />
                {consultation('openShort')}
              </Button>
            </ConsultationDialog>
            <ConsultationDialog product={sampleProduct}>
              <Button variant="outline" size="sm">
                {consultation('productOpen')}
              </Button>
            </ConsultationDialog>
          </Specimen>
        </Section>

        <Section title="ConsultationForm">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle (product)">
              <div className="w-full max-w-sm">
                <ConsultationForm product={sampleProduct} />
              </div>
            </Specimen>
            <Specimen label="idle (care finder answers)">
              <div className="w-full max-w-sm">
                <ConsultationForm answers={['a1', 'a4']} />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full max-w-sm">
                <ConsultationForm
                  initialState={{
                    status: 'invalid',
                    errors: { name: ['nameRequired'], phone: ['phoneInvalid'] },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full max-w-sm">
                <ConsultationForm sending />
              </div>
            </Specimen>
            <Specimen label="failed">
              <div className="w-full max-w-sm">
                <ConsultationForm initialState={{ status: 'failed' }} />
              </div>
            </Specimen>
            <Specimen label="sent">
              <div className="w-full max-w-sm">
                <ConsultationForm initialState={{ status: 'sent' }} />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="FinderQuestions">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="single, first">
              <div className="w-full">
                <FinderQuestions questions={questions} />
              </div>
            </Specimen>
            <Specimen label="multiple">
              <div className="w-full">
                <FinderQuestions questions={questions} start={1} />
              </div>
            </Specimen>
            <Specimen label="last">
              <div className="w-full">
                <FinderQuestions questions={questions} start={2} />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="Routine">
          <div className="flex flex-col gap-8">
            <Specimen label="full">
              <div className="w-full">
                <Routine
                  answers={['a1', 'a4']}
                  terms={skin}
                  steps={[
                    step('s1', t('sampleStep'), [
                      card({ id: 900011 }),
                      card({ id: 900012, photo: photos[1] }),
                    ]),
                    step('s2', t('sampleCategory'), [card({ id: 900013 })]),
                  ]}
                />
              </div>
            </Specimen>
            <Specimen label="an empty step, no terms">
              <div className="w-full">
                <Routine
                  answers={['a3', 'a6']}
                  terms={noSkin}
                  steps={[
                    step('s1', t('sampleStep'), [card({ id: 900014 })]),
                    step('s3', t('sampleStep3'), []),
                  ]}
                />
              </div>
            </Specimen>
            <Specimen label="stale">
              <div className="w-full">
                <Routine answers={[]} terms={noSkin} steps={null} />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="SearchDialog">
          <SearchDialog />
        </Section>

        <Section title="SearchSuggestions">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full max-w-md">
                <SearchSuggestions status="idle" query="" products={[]} />
              </div>
            </Specimen>
            <Specimen label="done">
              <div className="w-full max-w-md">
                <SearchSuggestions
                  status="done"
                  query={t('sampleQuery')}
                  products={[
                    card({}),
                    card({ slug: 'sample-2', photo: photos[1] }),
                    card({ slug: 'sample-3', photo: undefined }),
                  ]}
                />
              </div>
            </Specimen>
            <Specimen label="loading">
              <div className="w-full max-w-md">
                <SearchSuggestions
                  status="loading"
                  query={t('sampleQuery')}
                  products={[
                    card({}),
                    card({ slug: 'sample-2', photo: photos[2] }),
                  ]}
                />
              </div>
            </Specimen>
            <Specimen label="done (none)">
              <div className="w-full max-w-md">
                <SearchSuggestions
                  status="done"
                  query={t('sampleMiss')}
                  products={[]}
                />
              </div>
            </Specimen>
            <Specimen label="failed">
              <div className="w-full max-w-md">
                <SearchSuggestions
                  status="failed"
                  query={t('sampleQuery')}
                  products={[]}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="SearchEmpty">
          <SearchEmpty query={t('sampleMiss')} />
        </Section>

        <Section title="FavoritesView">
          <div className="flex flex-col gap-8">
            <Specimen label="loading">
              <FavoritesView status="loading" products={[]} />
            </Specimen>
            <Specimen label="failed">
              <FavoritesView status="failed" products={[]} />
            </Specimen>
            <Specimen label="done (none)">
              <div className="w-full">
                <FavoritesView status="done" products={[]} />
              </div>
            </Specimen>
            <Specimen label="done">
              <div className="w-full">
                <FavoritesView
                  status="done"
                  products={[
                    card({}),
                    card({ availability: 'out_of_stock', photo: photos[1] }),
                    card({ photo: undefined }),
                  ].map((product, id) => ({ id, card: product }))}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="CartView">
          <div className="flex flex-col gap-8">
            <Specimen label="loading">
              <CartView status="loading" items={[]} />
            </Specimen>
            <Specimen label="failed">
              <CartView status="failed" items={[]} />
            </Specimen>
            <Specimen label="done (none, one removed)">
              <div className="w-full">
                <CartView status="done" items={[]} removed={1} />
              </div>
            </Specimen>
            <Specimen label="done: in stock ×2, made to order, out of stock, no photo">
              <div className="w-full max-w-2xl">
                <CartView
                  status="done"
                  items={[
                    { line: { id: 1, qty: 2 }, card: card({}) },
                    {
                      line: { id: 2, qty: 1 },
                      card: card({
                        availability: 'made_to_order',
                        madeToOrderDays: 3,
                        photo: photos[1],
                      }),
                    },
                    {
                      line: { id: 3, qty: 1 },
                      card: card({
                        availability: 'out_of_stock',
                        photo: photos[2],
                      }),
                    },
                    {
                      line: { id: 4, qty: 10 },
                      card: card({ photo: undefined, volume: null }),
                    },
                  ]}
                />
              </div>
            </Specimen>
            <Specimen label="done: one line not loaded">
              <div className="w-full max-w-2xl">
                <CartView
                  status="done"
                  notLoaded={1}
                  items={[{ line: { id: 1, qty: 1 }, card: card({}) }]}
                />
              </div>
            </Specimen>
            <Specimen label="done: out of stock only">
              <div className="w-full max-w-2xl">
                <CartView
                  status="done"
                  items={[
                    {
                      line: { id: 3, qty: 1 },
                      card: card({ availability: 'out_of_stock' }),
                    },
                  ]}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="DeliveryFields">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="found">
              <div className="w-full max-w-sm">
                <DeliveryFields
                  sample={{
                    typed: t('sampleTyped'),
                    answer: {
                      status: 'found',
                      options: [
                        { ref: 's1', label: t('sampleSettlement') },
                        { ref: 's2', label: t('sampleSettlement2') },
                      ],
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="nothing found">
              <div className="w-full max-w-sm">
                <DeliveryFields
                  sample={{
                    typed: t('sampleNowhere'),
                    answer: { status: 'found', options: [] },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="latin">
              <div className="w-full max-w-sm">
                <DeliveryFields
                  sample={{
                    typed: t('sampleLatin'),
                    answer: { status: 'latin' },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="not chosen (invalid)">
              <div className="w-full max-w-sm">
                <DeliveryFields
                  errors={{
                    settlement: ['required'],
                    warehouse: ['required'],
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="unavailable: typed by hand">
              <div className="w-full max-w-sm">
                <DeliveryFields
                  sample={{ typed: '', answer: { status: 'unavailable' } }}
                />
              </div>
            </Specimen>
            <Specimen label="unavailable, invalid">
              <div className="w-full max-w-sm">
                <DeliveryFields
                  errors={{ settlement: ['required'], warehouse: ['long'] }}
                  sample={{ typed: '', answer: { status: 'unavailable' } }}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="CheckoutForm">
          <div className="grid gap-10 lg:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full">
                <CheckoutForm lines={[{ id: 1, qty: 2 }]} total={249100} />
              </div>
            </Specimen>
            <Specimen label="with a transfer">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  transfer
                  prepay
                />
              </div>
            </Specimen>
            <Specimen label="a transfer, a line made to order">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  transfer
                />
              </div>
            </Specimen>
            <Specimen label="a card chosen">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  transfer
                  card
                  prepay
                  payment="card"
                  contact={{
                    firstName: 'Олена',
                    lastName: 'Коваль',
                    email: 'olena@example.com',
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="a card, its address invalid">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  card
                  prepay
                  payment="card"
                  initialState={{
                    status: 'invalid',
                    errors: { email: ['emailInvalid'] },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="a transfer and a card, a line made to order">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  transfer
                  card
                />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  initialState={{
                    status: 'invalid',
                    errors: {
                      firstName: ['required'],
                      lastName: ['long'],
                      phone: ['phoneInvalid'],
                      settlement: ['required'],
                      warehouse: ['required'],
                      payment: ['paymentRequired'],
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  sending
                />
              </div>
            </Specimen>
            <Specimen label="changed">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  initialState={{ status: 'changed' }}
                />
              </div>
            </Specimen>
            <Specimen label="failed">
              <div className="w-full">
                <CheckoutForm
                  lines={[{ id: 1, qty: 2 }]}
                  total={249100}
                  initialState={{ status: 'failed' }}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="OrderPlaced">
          <div className="flex flex-col gap-8">
            <Specimen label="with a number">
              <div>
                <OrderPlaced number={1042} />
              </div>
            </Specimen>
            <Specimen label="a transfer">
              <div>
                <OrderPlaced
                  number={1042}
                  transfer={{
                    total: 249150,
                    details: {
                      recipient: 'ФОП Прізвище Імʼя По батькові',
                      iban: 'UA213223130000026007233566001',
                      code: '1234567890',
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="a card, paid">
              <div>
                <OrderPlaced number={1042} card="paid" />
              </div>
            </Specimen>
            <Specimen label="a card, waiting for the bank">
              <div>
                <OrderPlaced number={1042} card="waiting" again="?" />
              </div>
            </Specimen>
            <Specimen label="a card, failed">
              <div>
                <OrderPlaced number={1042} card="failed" />
              </div>
            </Specimen>
            <Specimen label="a card, failed, to try again">
              <div>
                <OrderPlaced
                  number={1042}
                  card="failed"
                  retry={{ token: 'canvas', email: 'olena@example.com' }}
                />
              </div>
            </Specimen>
            <Specimen label="RetryForm, an invalid address">
              <div>
                <RetryForm
                  token="canvas"
                  email="olena@"
                  problem="emailInvalid"
                />
              </div>
            </Specimen>
            <Specimen label="RetryForm, no invoice made">
              <div>
                <RetryForm
                  token="canvas"
                  email="olena@example.com"
                  problem="failed"
                />
              </div>
            </Specimen>
            <Specimen label="a link">
              <div>
                <OrderPlaced number={1042} link />
              </div>
            </Specimen>
            <Specimen label="without">
              <div>
                <OrderPlaced />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="AccountDialog">
          <Specimen label="sign-in, then registration inside it">
            <AccountDialog
              trigger={
                <Button variant="outline" size="sm">
                  AccountDialog
                </Button>
              }
            />
          </Specimen>
        </Section>

        <Section title="SignInForm">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full max-w-sm">
                <SignInForm />
              </div>
            </Specimen>
            <Specimen label="idle (by email)">
              <div className="w-full max-w-sm">
                <SignInForm byEmail />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full max-w-sm">
                <SignInForm
                  initialState={{
                    status: 'invalid',
                    errors: {
                      phone: ['phoneInvalid'],
                      password: ['required'],
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="invalid (by email)">
              <div className="w-full max-w-sm">
                <SignInForm
                  byEmail
                  initialState={{
                    status: 'invalid',
                    errors: {
                      email: ['emailInvalid'],
                      password: ['required'],
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="wrong (by email)">
              <div className="w-full max-w-sm">
                <SignInForm byEmail initialState={{ status: 'wrong' }} />
              </div>
            </Specimen>
            {(['wrong', 'locked', 'failed'] as const).map((status) => (
              <Specimen key={status} label={status}>
                <div className="w-full max-w-sm">
                  <SignInForm initialState={{ status }} />
                </div>
              </Specimen>
            ))}
            <Specimen label="unverified">
              <div className="w-full max-w-sm">
                <SignInForm
                  initialState={{
                    status: 'unverified',
                    email: 'name@example.com',
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full max-w-sm">
                <SignInForm sending />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="RegisterForm">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full max-w-md">
                <RegisterForm />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full max-w-md">
                <RegisterForm
                  initialState={{
                    status: 'invalid',
                    errors: {
                      firstName: ['required'],
                      lastName: ['long'],
                      phone: ['phoneTaken'],
                      email: ['taken'],
                      password: ['passwordShort'],
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="failed">
              <div className="w-full max-w-md">
                <RegisterForm initialState={{ status: 'failed' }} />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full max-w-md">
                <RegisterForm sending />
              </div>
            </Specimen>
            <Specimen label="sent">
              <div className="w-full max-w-md">
                <RegisterForm
                  initialState={{ status: 'sent', email: 'name@example.com' }}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="ResendForm">
          <Specimen label="idle / sending / sent / failed">
            <ResendForm email="name@example.com" />
            <ResendForm email="name@example.com" sending />
            <ResendForm
              email="name@example.com"
              initialState={{ status: 'sent', email: 'name@example.com' }}
            />
            <ResendForm
              email="name@example.com"
              initialState={{ status: 'failed' }}
            />
          </Specimen>
        </Section>

        <Section title="RequestResetForm">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full">
                <RequestResetForm />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full">
                <RequestResetForm
                  initialState={{
                    status: 'invalid',
                    errors: { email: ['emailInvalid'] },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full">
                <RequestResetForm sending />
              </div>
            </Specimen>
            <Specimen label="sent">
              <div className="w-full">
                <RequestResetForm
                  initialState={{ status: 'sent', email: 'name@example.com' }}
                />
              </div>
            </Specimen>
            <Specimen label="failed">
              <div className="w-full">
                <RequestResetForm initialState={{ status: 'failed' }} />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="NewPasswordForm">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full">
                <NewPasswordForm token="sample" />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full">
                <NewPasswordForm
                  token="sample"
                  initialState={{
                    status: 'invalid',
                    errors: { password: ['passwordShort'] },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full">
                <NewPasswordForm token="sample" sending />
              </div>
            </Specimen>
            {(['expired', 'failed', 'changed'] as const).map((status) => (
              <Specimen key={status} label={status}>
                <div className="w-full">
                  <NewPasswordForm token="sample" initialState={{ status }} />
                </div>
              </Specimen>
            ))}
          </div>
        </Section>

        <Section title="ProfileForm">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="idle">
              <div className="w-full max-w-sm">
                <ProfileForm customer={sampleCustomer} />
              </div>
            </Specimen>
            <Specimen label="invalid">
              <div className="w-full max-w-sm">
                <ProfileForm
                  customer={sampleCustomer}
                  initialState={{
                    status: 'invalid',
                    errors: {
                      firstName: ['required'],
                      phone: ['phoneInvalid'],
                    },
                  }}
                />
              </div>
            </Specimen>
            <Specimen label="sending">
              <div className="w-full max-w-sm">
                <ProfileForm customer={sampleCustomer} sending />
              </div>
            </Specimen>
            <Specimen label="saved">
              <div className="w-full max-w-sm">
                <ProfileForm
                  customer={sampleCustomer}
                  initialState={{ status: 'saved' }}
                />
              </div>
            </Specimen>
            <Specimen label="failed">
              <div className="w-full max-w-sm">
                <ProfileForm
                  customer={sampleCustomer}
                  initialState={{ status: 'failed' }}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="OrderHistory">
          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="empty">
              <div className="w-full">
                <OrderHistory orders={[]} />
              </div>
            </Specimen>
            <Specimen label="every status">
              <div className="w-full">
                <OrderHistory
                  orders={ORDER_STATUSES.map((status, index) => ({
                    id: 100 + index,
                    createdAt: '2026-11-02T10:00:00.000Z',
                    status,
                    total: 249100,
                    lines: [
                      {
                        id: 'a',
                        name: t('sampleName'),
                        price: 124550,
                        quantity: 2,
                      },
                    ],
                  }))}
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="DeliveryPayment">
          <div className="max-w-md">
            <DeliveryPayment />
          </div>
        </Section>

        <Section title="ProductCard">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            <li>
              <ProductCard product={card({})} />
            </li>
            <li>
              <ProductCard
                product={card({
                  availability: 'made_to_order',
                  madeToOrderDays: 3,
                  photo: photos[1],
                })}
              />
            </li>
            <li>
              <ProductCard
                product={card({
                  availability: 'out_of_stock',
                  photo: photos[2],
                })}
              />
            </li>
            <li>
              <ProductCard product={card({ photo: undefined, volume: null })} />
            </li>
          </ul>
        </Section>

        <Section title="Checkbox">
          <Specimen label="unchecked / checked / disabled">
            <Checkbox aria-label={t('sampleSkin')} />
            <Checkbox aria-label={t('sampleSkin')} defaultChecked />
            <Checkbox aria-label={t('sampleSkin')} disabled />
          </Specimen>
        </Section>

        <Section title="CategoryNav">
          <div className="flex flex-col gap-5">
            <Specimen label="current=zone">
              <CategoryNav
                zone={zone}
                categories={categories}
                current="face"
                search=""
              />
            </Specimen>
            <Specimen label="current=category">
              <CategoryNav
                zone={zone}
                categories={categories}
                current="face-serums"
                search=""
              />
            </Specimen>
          </div>
        </Section>

        <Section title="FilterPanel">
          <div className="grid gap-8 sm:grid-cols-2">
            <Specimen label="selected=0">
              <div className="w-52">
                <FilterPanel
                  facets={facets([])}
                  params={noFilters}
                  basePath="/canvas"
                />
              </div>
            </Specimen>
            <Specimen label="selected=2 (one with nothing left)">
              <div className="w-52">
                <FilterPanel
                  facets={facets(['dry', 'dehydration'])}
                  params={filtered}
                  basePath="/canvas"
                />
              </div>
            </Specimen>
          </div>
        </Section>

        <Section title="FiltersSheet">
          <Specimen label="selected=0 / selected=2">
            <FiltersSheet
              facets={facets([])}
              params={noFilters}
              basePath="/canvas"
              total={12}
              selected={0}
            />
            <FiltersSheet
              facets={facets(['dry', 'dehydration'])}
              params={filtered}
              basePath="/canvas"
              total={3}
              selected={2}
            />
          </Specimen>
        </Section>

        <Section title="SortSelect">
          <Specimen label="default / price-asc">
            <SortSelect params={noFilters} basePath="/canvas" />
            <SortSelect
              params={{ ...noFilters, sort: 'price-asc' }}
              basePath="/canvas"
            />
          </Specimen>
        </Section>

        <Section title="ListingPagination">
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((page) => (
              <Specimen key={page} label={`page=${page} pageCount=3`}>
                <ListingPagination
                  page={page}
                  pageCount={3}
                  href={() => '/canvas'}
                />
              </Specimen>
            ))}
          </div>
        </Section>

        <Section title="ListingEmpty">
          <div className="flex flex-col gap-5">
            <Specimen label="empty">
              <ListingEmpty />
            </Specimen>
            <Specimen label="filtered">
              <ListingEmpty resetHref="/canvas" />
            </Specimen>
          </div>
        </Section>

        <Section title="Listing">
          <div className="rounded-lg border">
            <Listing
              title={t('sampleCategory')}
              above={t('sampleZone')}
              nav={
                <CategoryNav
                  zone={zone}
                  categories={categories}
                  current="face-serums"
                  search=""
                />
              }
              result={{
                products: [
                  card({}),
                  card({ photo: photos[1] }),
                  card({ availability: 'out_of_stock', photo: photos[2] }),
                ].map((product, id) => ({ id, card: product })),
                total: 27,
                page: 1,
                pageCount: 2,
                selected: 1,
                facets: facets(['dry']),
              }}
              params={{ ...noFilters, type: ['dry'] }}
              basePath="/canvas"
            />
          </div>
        </Section>
      </div>
    </>
  );
};

export default CanvasPage;
