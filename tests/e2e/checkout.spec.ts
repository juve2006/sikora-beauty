import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';

import en from '../../messages/en.json' with { type: 'json' };
import uk from '../../messages/uk.json' with { type: 'json' };

// The checkout end to end (task `cart-and-checkout`): a production build, the products
// tests/e2e/seed.ts made and the Nova Poshta stub, in each language. The order is checked where
// the manager reads it: in the database.

const database = new pg.Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(() => database.end());

const product = 'Сироватка E2E';

const order = async (id: number) => {
  const { rows } = await database.query(
    'select total, settlement, settlement_ref, warehouse_ref, payment, locale from orders where id = $1',
    [id],
  );
  const lines = await database.query(
    'select product_id, price, quantity from orders_lines where _parent_id = $1',
    [id],
  );
  return { ...rows[0], lines: lines.rows };
};

// The cart with one serum in it — from its category, to its page, into the cart — then the cart.
const addSerum = async (page: Page, prefix: string, m: typeof uk) => {
  const { rows } = await database.query(
    `select c.slug from categories c
       join products_rels r on r.categories_id = c.id
       join products p on p.id = r.parent_id
     where p.slug = 'e2e-serum'`,
  );
  await page.goto(`${prefix}/catalog/${rows[0].slug}`);
  await page.getByRole('link', { name: product }).first().click();
  await expect(page).toHaveURL(/\/product\/e2e-serum$/);
  await page.getByRole('button', { name: m.Product.addToCart }).click();
  // The header's cart, named with its count: «Кошик, 1 товар», «Cart, 1 item».
  await expect(
    page.getByRole('link', { name: new RegExp(`^${m.Cart.title}, 1 `) }),
  ).toBeVisible();
  await page.getByRole('link', { name: m.Product.goToCart }).click();
  await expect(page).toHaveURL(/\/cart$/);
};

const fillContacts = async (page: Page, m: typeof uk) => {
  await page.getByLabel(m.Checkout.firstName).fill('Олена');
  await page.getByLabel(m.Checkout.lastName).fill('Тестова');
  await page.getByLabel(m.Checkout.phone).fill('067 123 45 67');
  await page.getByRole('radio', { name: m.Checkout.cod }).check();
};

// The thanks page's order number, once the order is placed.
const placed = async (page: Page, m: typeof uk) => {
  await page.getByRole('button', { name: m.Checkout.submit }).click();
  await expect(page).toHaveURL(/\/cart\/thanks\?order=\d+$/);
  const id = Number(new URL(page.url()).searchParams.get('order'));
  await expect(page.locator('h1')).toContainText(String(id));
  return id;
};

for (const [locale, m, prefix] of [
  ['uk', uk, ''],
  ['en', en, '/en'],
] as const) {
  test(`orders two from the cart, the branch from the search (${locale})`, async ({
    page,
  }) => {
    await addSerum(page, prefix, m);
    await page
      .getByRole('button', { name: m.Cart.more.replace('{name}', product) })
      .click();
    await expect(
      page.getByText(m.Cart.quantity.replace('{qty}', '2')),
    ).toBeAttached();

    await page.getByLabel(m.Checkout.settlement).fill('Бров');
    await page.getByRole('button', { name: /Бровари/ }).click();
    await page.getByRole('button', { name: /Відділення №1/ }).click();
    await fillContacts(page, m);
    const id = await placed(page, m);

    // The ordered lines left the cart: its link has no count to name.
    await expect(
      page.getByRole('link', { name: m.Cart.title, exact: true }),
    ).toBeVisible();
    const { rows } = await database.query(
      "select id, price from products where slug = 'e2e-serum'",
    );
    const price = Number(rows[0].price);
    expect(await order(id)).toMatchObject({
      total: String(2 * price),
      settlement: 'м. Бровари, Броварський р-н, Київська обл.',
      settlement_ref: 'e715719e-4b33-11e4-ab6d-005056801329',
      warehouse_ref: '5a39e5b2-e1c2-11e3-8c4a-0050568002cf',
      payment: 'cod',
      locale,
      lines: [{ product_id: rows[0].id, price: String(price), quantity: '2' }],
    });
  });
}

test('orders with the branch typed by hand when Nova Poshta is down', async ({
  page,
}) => {
  await addSerum(page, '', uk);
  await page.getByLabel(uk.Checkout.settlement).fill('Збій');
  await expect(page.getByText(uk.Checkout.unavailable)).toBeVisible();
  await page.getByLabel(uk.Checkout.settlement).fill('Бровари');
  await page.getByLabel(uk.Checkout.warehouse).fill('Відділення 1');
  await fillContacts(page, uk);
  const id = await placed(page, uk);

  expect(await order(id)).toMatchObject({
    settlement: 'Бровари',
    settlement_ref: null,
    warehouse_ref: null,
  });
});
