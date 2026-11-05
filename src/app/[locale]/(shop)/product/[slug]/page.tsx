import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  brandName,
  jsonLdScript,
  photos,
  populated,
  productJsonLd,
} from '@/lib/product-page';
import { getProduct, getRelated } from '@/lib/actions/product.actions';
import AddToCart from './add-to-cart';
import Availability from '@/components/shared/product/availability';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import DeliveryPayment from './delivery-payment';
import FavoriteButton from '@/components/shared/product/favorite-button';
import ProductCard from '@/components/shared/product/product-card';
import ProductGallery from './product-gallery';
import ProductPrice from '@/components/shared/product/product-price';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { alternates, getPathname, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/constants';
import type { SkinCondition, SkinConcern, SkinType } from '@/payload-types';

type Props = { params: Promise<{ locale: string; slug: string }> };

// Nothing is rendered at build time — CI builds without a database (RULES.md). A page is rendered
// on its first visit and kept until publishing in the admin revalidates the storefront.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const product = await getProduct(slug, locale);
  if (!product) return {};

  const [photo] = photos(product.images);
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    alternates: alternates(`/product/${slug}`, locale),
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: photo && [photo],
    },
  };
}

// Skin types and concerns have landing pages; skin conditions do not (spec `sikora-beauty`).
const landings = { skinTypes: 'skin-type', skinConcerns: 'concern' } as const;

function TextSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className={className ?? 'mt-3 leading-relaxed whitespace-pre-line'}>
        {children}
      </p>
    </section>
  );
}

const ProductPage = async ({ params }: Props) => {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const product = await getProduct(slug, locale);
  if (!product) notFound();

  const t = await getTranslations('Product');
  const consultation = await getTranslations('Consultation');
  const related = await getRelated(product, locale);
  const brand = brandName(product.brand);
  const brandSlug =
    typeof product.brand === 'object' ? product.brand?.slug : null;
  const skin = (
    [
      ['skinTypes', populated<SkinType>(product.skinTypes)],
      ['skinConditions', populated<SkinCondition>(product.skinConditions)],
      ['skinConcerns', populated<SkinConcern>(product.skinConcerns)],
    ] as const
  ).filter(([, terms]) => terms.length > 0);
  // An API write that replaced the rows from one locale leaves the other's names empty.
  const actives = (product.actives ?? []).filter((active) => active.name);
  const url = new URL(
    getPathname({ href: `/product/${slug}`, locale }),
    SITE_URL,
  );

  return (
    <>
      <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6">
        <div className="grid gap-8 pt-2 lg:grid-cols-2 lg:gap-12 lg:pt-8">
          <ProductGallery photos={photos(product.images)} />

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {brand && (
                <p className="text-sm text-muted-foreground">
                  {brandSlug ? (
                    <Link
                      href={`/brand/${brandSlug}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {brand}
                    </Link>
                  ) : (
                    brand
                  )}
                </p>
              )}
              <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
                {product.name}
              </h1>
              {product.volume != null && product.volumeUnit && (
                <p className="text-muted-foreground">
                  {t('volume', {
                    volume: product.volume,
                    unit: product.volumeUnit,
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-3">
              <ProductPrice
                price={product.price}
                className="text-3xl font-semibold tracking-tight"
              />
              <Availability
                availability={product.availability}
                madeToOrderDays={product.madeToOrderDays}
              />
            </div>
            <AddToCart id={product.id} availability={product.availability} />
            <FavoriteButton
              id={product.id}
              name={product.name}
              labelled
              className="self-start"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm text-muted-foreground">
                {consultation('productHint')}
              </p>
              <ConsultationDialog
                product={{ id: product.id, name: product.name }}
              >
                <Button variant="outline" size="sm">
                  {consultation('productOpen')}
                </Button>
              </ConsultationDialog>
            </div>
            {product.shortDescription && (
              <p className="leading-relaxed whitespace-pre-line">
                {product.shortDescription}
              </p>
            )}
            {skin.length > 0 && (
              <section>
                <h2 className="font-medium">{t('skin')}</h2>
                <dl className="mt-3 flex flex-col gap-3">
                  {skin.map(([key, terms]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(key)}
                      </dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {terms.map((term) => {
                          const landing =
                            key === 'skinConditions' || !term.slug
                              ? null
                              : `/${landings[key]}/${term.slug}`;
                          return landing ? (
                            <Badge key={term.id} asChild>
                              <Link href={landing}>{term.title}</Link>
                            </Badge>
                          ) : (
                            <Badge key={term.id}>{term.title}</Badge>
                          );
                        })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <DeliveryPayment />
          </div>
        </div>

        <div className="mt-12 flex max-w-3xl flex-col gap-10">
          {product.purpose && (
            <TextSection title={t('purpose')}>{product.purpose}</TextSection>
          )}
          {actives.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                {t('actives')}
              </h2>
              <dl className="mt-3 flex flex-col gap-4">
                {actives.map((active) => (
                  <div key={active.id ?? active.name}>
                    <dt className="font-medium">{active.name}</dt>
                    {active.role && (
                      <dd className="mt-1 leading-relaxed text-muted-foreground">
                        {active.role}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          )}
          {product.howToUse && (
            <TextSection title={t('howToUse')}>{product.howToUse}</TextSection>
          )}
          {product.warnings && (
            <TextSection title={t('warnings')}>{product.warnings}</TextSection>
          )}
          {product.inci && (
            <TextSection
              title={t('inci')}
              className="mt-3 text-sm leading-relaxed text-muted-foreground"
            >
              {product.inci}
            </TextSection>
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-semibold tracking-tight">
              {t('related')}
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard
                    product={{
                      ...item,
                      slug: item.slug ?? String(item.id),
                      brand: brandName(item.brand) ?? '',
                      photo: photos(item.images)[0],
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(productJsonLd(product, url)),
        }}
      />
    </>
  );
};

export default ProductPage;
