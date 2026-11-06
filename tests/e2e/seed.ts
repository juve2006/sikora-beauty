// The end-to-end products: one in stock, one made to order, one out of stock, published, and a
// draft; the serum is for dry skin. The care finder, on, with `seed:catalog`'s draft. The store's
// account, made up, which a transfer is paid to. The owner, who signs in through the store's own form. Run on a throwaway
// database after its migrations and `seed:catalog`, which brings the brands, the categories, the
// skin terms and that draft: `NODE_ENV=production payload run tests/e2e/seed.ts`. Never on a real
// one.
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
  {
    slug: 'e2e-draft',
    name: 'Чернетка E2E',
    price: 10000,
    availability: 'in_stock',
    _status: 'draft',
  },
] as const;

const payload = await getPayload({ config });
// Revalidation throws outside a Next request (src/collections/revalidate.ts).
const context = { disableRevalidate: true };
const first = async (
  collection: 'brands' | 'categories' | 'skin-types',
  where = {},
) => {
  const { docs } = await payload.find({ collection, where, limit: 1, context });
  if (!docs[0]) throw new Error(`No ${collection}: run seed:catalog first`);
  return docs[0].id;
};
const brand = await first('brands');
// A product goes in a zone's category, never in the zone itself: serums, a step of the care
// finder's draft.
const category = await first('categories', { slug: { equals: 'face-serums' } });
const dry = await first('skin-types', { slug: { equals: 'dry' } });

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
      skinTypes: product.slug === 'e2e-serum' ? [dry] : [],
      volume: 30,
      volumeUnit: 'ml',
      _status: 'published',
      ...product,
    },
    context,
  });
}
await payload.updateGlobal({
  slug: 'care-finder',
  data: { enabled: true },
  context,
});
// The NBU's sample IBAN, which passes the check; nobody's account.
await payload.updateGlobal({
  slug: 'payment-details',
  data: {
    recipient: 'ФОП Тестова Олена Петрівна',
    iban: 'UA213223130000026007233566001',
    code: '1234567890',
  },
  context,
});
const { totalDocs: users } = await payload.count({ collection: 'users' });
if (users === 0)
  await payload.create({
    collection: 'users',
    data: {
      email: 'owner@example.com',
      password: 'e2e-owner-password',
      role: 'owner',
    },
    context,
  });
payload.logger.info('e2e seed: done');
