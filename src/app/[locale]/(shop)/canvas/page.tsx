import config from '@payload-config';
import { cn } from 'cn';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import type { ReactNode } from 'react';
import type { Listing as ListingResult, CardProduct, Menu } from '@/types';
import type { Media } from '@/payload-types';
import { routing } from '@/i18n/routing';
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
import AdminLink from '@/components/shared/header/admin-link';
import FavoritesLink from '@/components/shared/header/favorites-link';
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

// In production only someone signed in to the admin sees the canvas — every user is an owner or
// a cosmetologist; locally anyone does.
async function requireAdminUser() {
  if (process.env.NODE_ENV !== 'production') return;
  const requestHeaders = await headers();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: requestHeaders });
  if (!user) notFound();
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
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
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

        <Section title="MainMenu">
          <div className="flex min-h-80 items-start">
            <MainMenu menu={menu} />
          </div>
        </Section>

        <Section title="MobileMenu">
          <MobileMenu menu={menu} />
        </Section>

        <Section title="AdminLink">
          <Specimen label="shown">
            <AdminLink shown />
          </Specimen>
        </Section>

        <Section title="FavoritesLink">
          <Specimen label="0 / 3 / this browser's">
            <FavoritesLink shown={0} />
            <FavoritesLink shown={3} />
            <FavoritesLink />
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
          <AddToCart />
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
