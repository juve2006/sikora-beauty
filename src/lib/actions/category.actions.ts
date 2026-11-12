import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Config } from '@/payload-types';
import type { Facet } from '@/types';

// The storefront's reads of the catalog's terms — zones, categories, skin types and concerns,
// brands — as product.actions.ts reads its products: published, in the page's language.

type Locale = Config['locale'];

// A catalog page's term: a zone, or a category with its zone; either way with the zone's categories
// in the admin's order, which the page offers as links.
export const getCatalogTerm = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: false,
    select: { title: true, slug: true, parent: true },
    populate: { categories: { title: true, slug: true } },
  });
  const term = docs[0];
  if (!term) return null;
  const zone =
    term.parent && typeof term.parent === 'object' ? term.parent : term;
  const { docs: categories } = await payload.find({
    collection: 'categories',
    where: { parent: { equals: zone.id } },
    locale,
    depth: 0,
    sort: '_order',
    pagination: false,
    overrideAccess: false,
    select: { title: true, slug: true },
  });
  return { term, zone, categories };
});

// The header's menu: the zones with their categories, and the skin concerns, in the admin's order —
// a term the cosmetologist adds reaches the menu on save, without a deploy. A zone marked
// `menuItem` is offered as an item of its own too.
export const getMenu = cache(async (locale: Locale) => {
  const payload = await getPayload({ config });
  const read = {
    locale,
    depth: 0,
    sort: '_order',
    pagination: false,
    overrideAccess: false,
  } as const;
  const [categories, concerns] = await Promise.all([
    payload.find({
      ...read,
      collection: 'categories',
      select: { title: true, slug: true, parent: true, menuItem: true },
    }),
    payload.find({
      ...read,
      collection: 'skin-concerns',
      select: { title: true, slug: true },
    }),
  ]);
  const link = ({ slug, title }: { slug?: string | null; title: string }) =>
    slug ? [{ slug, title }] : [];
  const zones = categories.docs
    .filter(({ parent }) => !parent)
    .flatMap((zone) =>
      link(zone).map((term) => ({
        ...term,
        menuItem: Boolean(zone.menuItem),
        categories: categories.docs
          .filter(({ parent }) => parent === zone.id)
          .flatMap(link),
      })),
    );
  return { zones, concerns: concerns.docs.flatMap(link) };
});

// A skin concern's or a skin type's landing page.
export const getSkinTerm = cache(
  async (
    collection: 'skin-concerns' | 'skin-types',
    slug: string,
    locale: Locale,
  ) => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection,
      where: { slug: { equals: slug } },
      locale,
      depth: 0,
      limit: 1,
      overrideAccess: false,
      select: { title: true, slug: true },
    });
    return docs[0] ?? null;
  },
);

// A brand's page, with its name as the title a landing page shows.
export const getBrand = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'brands',
    where: { slug: { equals: slug } },
    locale,
    depth: 0,
    limit: 1,
    overrideAccess: false,
    select: { name: true, slug: true },
  });
  const brand = docs[0];
  return brand ? { id: brand.id, title: brand.name } : null;
});

// The filters a list offers, in the admin's order; brands by name.
export const getFacets = cache(async (locale: Locale): Promise<Facet[]> => {
  const payload = await getPayload({ config });
  const read = {
    locale,
    depth: 0,
    pagination: false,
    overrideAccess: false,
  } as const;
  const vocabulary = async (
    collection: 'skin-types' | 'skin-conditions' | 'skin-concerns',
  ) => {
    const { docs } = await payload.find({
      ...read,
      collection,
      sort: '_order',
      select: { title: true, slug: true },
    });
    return docs.flatMap(({ slug, title }) => (slug ? [{ slug, title }] : []));
  };
  const [type, condition, concern, brands] = await Promise.all([
    vocabulary('skin-types'),
    vocabulary('skin-conditions'),
    vocabulary('skin-concerns'),
    payload.find({
      ...read,
      collection: 'brands',
      sort: 'name',
      select: { name: true, slug: true },
    }),
  ]);
  const brand = brands.docs.flatMap(({ slug, name }) =>
    slug ? [{ slug, title: name }] : [],
  );
  return [
    { key: 'type', values: type },
    { key: 'condition', values: condition },
    { key: 'concern', values: concern },
    { key: 'brand', values: brand },
  ];
});
