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
    'select total, settlement, settlement_ref, warehouse_ref, payment, payment_status, locale from orders where id = $1',
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

const fillContacts = async (
  page: Page,
  m: typeof uk,
  payment: 'cod' | 'transfer' = 'cod',
) => {
  await page.getByLabel(m.Checkout.firstName).fill('Олена');
  await page.getByLabel(m.Checkout.lastName).fill('Тестова');
  await page.getByLabel(m.Checkout.phone).fill('067 123 45 67');
  await page.getByRole('radio', { name: m.Checkout[payment] }).check();
};

// The order the thanks page names, once it is placed: the address carries its secret, and the
// page's heading its number.
const placed = async (page: Page, m: typeof uk) => {
  await page.getByRole('button', { name: m.Checkout.submit }).click();
  await expect(page).toHaveURL(/\/cart\/thanks\?t=[\w-]{22}$/);
  const { rows } = await database.query(
    'select id from orders where return_token = $1',
    [new URL(page.url()).searchParams.get('t')],
  );
  const id = Number(rows[0].id);
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
      page.getByRole('link', { name: m.Cart.title, exact: true }).first(),
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

// A transfer (task `transfer-payment`): offered for an order wholly in stock, and the thanks page
// gives the store's account, each detail copied for the shopper's banking app.
for (const [locale, m, prefix] of [
  ['uk', uk, ''],
  ['en', en, '/en'],
] as const) {
  test(`pays by a transfer to the store's account (${locale})`, async ({
    page,
    context,
  }) => {
    await addSerum(page, prefix, m);
    await page.getByLabel(m.Checkout.settlement).fill('Бров');
    await page.getByRole('button', { name: /Бровари/ }).click();
    await page.getByRole('button', { name: /Відділення №1/ }).click();
    await fillContacts(page, m, 'transfer');
    const id = await placed(page, m);

    expect(await order(id)).toMatchObject({
      payment: 'transfer',
      payment_status: 'awaiting',
    });
    const details = page.getByRole('region', {
      name: m.Checkout.transferTitle,
    });
    await expect(details).toContainText('ФОП Тестова Олена Петрівна');
    await expect(details).toContainText('UA21 3223 1300 0002 6007 2335 6600 1');
    await expect(details).toContainText('1234567890');
    await expect(details).toContainText(`Оплата замовлення №${id}`);
    await expect(page.getByText(m.Checkout.placedText)).toHaveCount(0);
    // Nothing wider than the screen: the IBAN wraps on a phone.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const copy = details.getByRole('button', {
      name: new RegExp(`: ${m.Checkout.iban}$`),
    });
    await copy.click();
    await expect(copy).toContainText(m.Checkout.copied);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'UA213223130000026007233566001',
    );
  });
}

test('offers no transfer while a line is made to order', async ({ page }) => {
  await page.goto('/product/e2e-cream');
  await page.getByRole('button', { name: uk.Product.addToCart }).click();
  await page.getByRole('link', { name: uk.Product.goToCart }).click();
  await expect(
    page.getByRole('radio', { name: uk.Checkout.cod }),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: uk.Checkout.transfer }),
  ).toHaveCount(0);
  await expect(page.getByText(uk.Checkout.transferInStock)).toBeVisible();
});

test('names no order by an address without its secret', async ({ page }) => {
  for (const query of ['?order=1', `?t=${'x'.repeat(22)}`]) {
    await page.goto(`/cart/thanks${query}`);
    await expect(page.locator('h1')).toHaveText(
      `${uk.Checkout.thanks} ${uk.Checkout.placedNoNumber}`,
    );
  }
});

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

// The fixes after the review of `cart-and-checkout` (task `cart-review-fixes`).
test('a place chosen after an invalid press loses its error', async ({
  page,
}) => {
  await addSerum(page, '', uk);
  await page.getByRole('button', { name: uk.Checkout.submit }).click();
  const settlement = page.getByLabel(uk.Checkout.settlement);
  await expect(settlement).toHaveAccessibleDescription(
    uk.Checkout.errors.choose,
  );

  await settlement.fill('Бров');
  await page.getByRole('button', { name: /Бровари/ }).click();
  await expect(settlement).toHaveAccessibleDescription('');
  await expect(settlement).not.toHaveAttribute('aria-invalid');
  const warehouse = page.getByLabel(uk.Checkout.warehouse);
  await expect(warehouse).toHaveAccessibleDescription(
    new RegExp(`${uk.Checkout.errors.choose}$`),
  );
  await page.getByRole('button', { name: /Відділення №1/ }).click();
  await expect(warehouse).toHaveAccessibleDescription('');
});

test('a line another tab added is told when its card does not come, and comes on a retry', async ({
  page,
  context,
}) => {
  await addSerum(page, '', uk);
  await page.getByLabel(uk.Checkout.firstName).fill('Олена');
  // The cart's server action is a POST to the page: it fails until unrouted.
  await page.route('**/cart', (route) =>
    route.request().method() === 'POST' ? route.abort() : route.fallback(),
  );
  const other = await context.newPage();
  await other.goto('/product/e2e-cream');
  await other.getByRole('button', { name: uk.Product.addToCart }).click();
  await other.close();

  await expect(
    page.getByRole('link', { name: new RegExp(`^${uk.Cart.title}, 2 `) }),
  ).toBeVisible();
  const notice = page
    .getByRole('alert')
    .filter({ has: page.getByRole('button', { name: uk.Cart.retry }) });
  await expect(notice).toContainText('1');
  await expect(page.getByLabel(uk.Checkout.firstName)).toHaveValue('Олена');

  await page.unroute('**/cart');
  await notice.getByRole('button', { name: uk.Cart.retry }).click();
  await expect(
    page.getByRole('button', {
      name: uk.Cart.more.replace('{name}', 'Крем E2E'),
    }),
  ).toBeVisible();
  await expect(notice).toHaveCount(0);
  await expect(page.getByLabel(uk.Checkout.firstName)).toHaveValue('Олена');
});
