// The checkout's end-to-end products: one in stock, one made to order, one out of stock, published.
// Run on a throwaway database after its migrations and `seed:catalog`, which brings the brands and
// categories: `NODE_ENV=production payload run tests/e2e/seed.ts`. Never on a real one.
import { getPayload } from 'payload';

import config from '@/payload.config';

const products = [
  {
    slug: 'e2e-serum',
    name: 'Сироватка E2E',
    price: 124550,
    availability: 'in_stock',
  },
  {
    slug: 'e2e-cream',
    name: 'Крем E2E',
    price: 89000,
    availability: 'made_to_order',
    madeToOrderDays: 3,
  },
  {
    slug: 'e2e-toner',
    name: 'Тонік E2E',
    price: 45000,
    availability: 'out_of_stock',
  },
] as const;

const payload = await getPayload({ config });
// Revalidation throws outside a Next request (src/collections/revalidate.ts).
const context = { disableRevalidate: true };
const first = async (collection: 'brands' | 'categories', where = {}) => {
  const { docs } = await payload.find({ collection, where, limit: 1, context });
  if (!docs[0]) throw new Error(`No ${collection}: run seed:catalog first`);
  return docs[0].id;
};
const brand = await first('brands');
// A product goes in a zone's category, never in the zone itself.
const category = await first('categories', { parent: { exists: true } });

for (const product of products) {
  const { totalDocs } = await payload.count({
    collection: 'products',
    where: { slug: { equals: product.slug } },
    context,
  });
  if (totalDocs > 0) continue;
  await payload.create({
    collection: 'products',
    locale: 'uk',
    data: {
      ...product,
      brand,
      categories: [category],
      volume: 30,
      volumeUnit: 'ml',
      _status: 'published',
    },
    context,
  });
}
payload.logger.info('e2e seed: done');
