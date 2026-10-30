// npm run seed:catalog — creates what is missing, by slug, and changes nothing that exists, so the
// cosmetologist's edits and deletions stay. Run once per database, after its migrations:
//   local:  npm run seed:catalog
//   Neon:   docs/deploy.md, "Build it from nothing"
// The npm script sets NODE_ENV=production: otherwise Payload pushes its dev schema into the
// database and marks it, and the next `payload migrate` on Vercel skips its migrations.
import { getPayload } from 'payload';

import {
  brands,
  pages,
  skinConcerns,
  skinConditions,
  skinTypes,
  zones,
} from './seed-data';
import config from '@/payload.config';

const payload = await getPayload({ config });
// Revalidation throws outside a Next request (src/collections/revalidate.ts).
const context = { disableRevalidate: true };
let created = 0;

type Seeded =
  | 'brands'
  | 'categories'
  | 'skin-types'
  | 'skin-conditions'
  | 'skin-concerns'
  | 'pages';

async function ensure(
  collection: Seeded,
  slug: string,
  uk: object,
  // Or made from the created document, when it must carry its rows' ids.
  en?: object | ((doc: object) => object),
): Promise<number> {
  const { docs } = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    context,
  });
  if (docs[0]) return docs[0].id;
  const doc = await payload.create({
    collection,
    locale: 'uk',
    data: { ...uk, slug } as never,
    context,
  });
  if (en)
    await payload.update({
      collection,
      id: doc.id,
      locale: 'en',
      data: (typeof en === 'function' ? en(doc) : en) as never,
      context,
    });
  created++;
  return doc.id;
}

for (const zone of zones) {
  const parent = await ensure(
    'categories',
    zone.slug,
    { title: zone.uk },
    { title: zone.en },
  );
  for (const category of zone.categories) {
    await ensure(
      'categories',
      category.slug,
      { title: category.uk, parent },
      { title: category.en },
    );
  }
}
for (const [collection, terms] of [
  ['skin-types', skinTypes],
  ['skin-conditions', skinConditions],
  ['skin-concerns', skinConcerns],
] as const) {
  for (const term of terms)
    await ensure(collection, term.slug, { title: term.uk }, { title: term.en });
}
for (const brand of brands)
  await ensure('brands', brand.slug, { name: brand.name });
// The English blocks carry the created ones' ids and fields: without the ids Payload would replace
// the blocks, and the Ukrainian texts with them (RULES.md).
for (const page of pages)
  await ensure(
    'pages',
    page.slug,
    { title: page.uk, blocks: page.blocks.map(({ uk }) => uk) },
    (doc) => ({
      title: page.en,
      blocks: ((doc as { blocks: object[] }).blocks ?? []).map(
        (block, index) => ({ ...block, ...page.blocks[index].en }),
      ),
    }),
  );

payload.logger.info(`seed:catalog: ${created} created`);
