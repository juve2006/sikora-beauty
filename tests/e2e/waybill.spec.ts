import { expect, type Page, test } from '@playwright/test';
import pg from 'pg';

import uk from '../../messages/uk.json' with { type: 'json' };

// A waybill from the admin (task `np-waybill`), through tests/e2e/novaposhta-stub.mjs: the button, what
// a save does to the number afterwards, and the cron's word on the parcel.

const database = new pg.Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(() => database.end());

const owner = { email: 'owner@example.com', password: 'e2e-owner-password' };
const CREATED = 'Створено, ще не передано на відправку';

const placeOrder = async (page: Page) => {
  await page.goto('/product/e2e-serum');
  await page.getByRole('button', { name: uk.Product.addToCart }).click();
  await page.getByRole('link', { name: uk.Product.goToCart }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByLabel(uk.Checkout.settlement).fill('Бров');
  await page.getByRole('button', { name: /Бровари/ }).click();
  await page.getByRole('button', { name: /Відділення №1/ }).click();
  await page.getByLabel(uk.Checkout.firstName).fill('Олена');
  await page.getByLabel(uk.Checkout.lastName).fill('Тестова');
  await page.getByLabel(uk.Checkout.phone).fill('067 123 45 67');
  await page.getByRole('radio', { name: uk.Checkout.link }).check();
  await page.getByRole('button', { name: uk.Checkout.submit }).click();
  await expect(page).toHaveURL(/\/cart\/thanks\?t=[\w-]{22}$/);
  const { rows } = await database.query(
    'select id from orders where return_token = $1',
    [new URL(page.url()).searchParams.get('t')],
  );
  return Number(rows[0].id);
};

const waybillOf = async (id: number) =>
  (
    await database.query(
      'select waybill_number, waybill_requested_at, delivery_code, delivery_status from orders where id = $1',
      [id],
    )
  ).rows[0];

const openOrder = async (page: Page, id: number) => {
  // Pressed before hydration, Payload's button does nothing.
  await page.goto(`/admin/collections/orders/${id}`, {
    waitUntil: 'networkidle',
  });
  await expect(page.locator('#field-status')).toBeVisible();
};

test('a paid order gets its waybill from the button, and the cron its fate', async ({
  page,
  request,
}) => {
  const id = await placeOrder(page);
  expect(
    (await page.request.post('/api/users/login', { data: owner })).ok(),
  ).toBe(true);

  await openOrder(page, id);
  await expect(page.getByText('Спершу підтвердьте замовлення')).toBeVisible();
  await database.query("update orders set status = 'confirmed' where id = $1", [
    id,
  ]);
  await openOrder(page, id);
  await expect(page.getByText('Замовлення ще не оплачене')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Створити накладну' }),
  ).toHaveCount(0);

  await database.query(
    "update orders set payment_status = 'paid' where id = $1",
    [id],
  );
  // Opened before the waybill exists: its form holds an empty number.
  const stale = await page.context().newPage();
  await openOrder(stale, id);
  await openOrder(page, id);
  // The decimal point of a Ukrainian keyboard.
  await page.locator('#field-waybill-weight').fill('0,3');
  await page.getByRole('button', { name: 'Створити накладну' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: CREATED }),
  ).toBeVisible();
  await expect(page.locator('#field-waybillNumber')).toHaveValue(/^\d{14}$/);
  await expect(
    page.getByRole('button', { name: 'Створити накладну' }),
  ).toHaveCount(0);

  const made = await waybillOf(id);
  expect(made).toMatchObject({
    waybill_number: expect.stringMatching(/^\d{14}$/),
    waybill_requested_at: null,
    delivery_code: '1',
    delivery_status: CREATED,
  });

  // A save of the order keeps the waybill, the same page's and a page opened before it alike.
  for (const [tab, note] of [
    [page, 'Перевірено'],
    [stale, 'Із застарілої вкладки'],
  ] as const) {
    await tab.locator('#field-managerNote').fill(note);
    await tab.locator('#action-save').click();
    await expect(tab.locator('.payload-toast-container')).toContainText(
      'Успішно',
    );
    expect(await waybillOf(id)).toMatchObject({
      waybill_number: made.waybill_number,
      delivery_code: '1',
    });
  }
  await stale.close();

  expect((await request.get('/api/np/track')).status()).toBe(401);
  const tracked = await request.get('/api/np/track', {
    headers: { authorization: 'Bearer e2e-cron-only-not-a-real-secret' },
  });
  expect(tracked.ok()).toBe(true);
  expect(await waybillOf(id)).toMatchObject({
    delivery_code: '103',
    delivery_status: 'Відмова від отримання',
  });
  await openOrder(page, id);
  await expect(
    page.getByRole('status').filter({ hasText: 'Відмова від отримання' }),
  ).toBeVisible();
});

test('a retry takes an order its failed try freed', async ({ page }) => {
  const id = await placeOrder(page);
  expect(
    (await page.request.post('/api/users/login', { data: owner })).ok(),
  ).toBe(true);
  await database.query(
    "update orders set status = 'confirmed', payment_status = 'paid' where id = $1",
    [id],
  );

  // What a form still saying «Створити ще раз» sends after the server released the order.
  const retried = await page.request.post('/api/np/waybill', {
    data: { id, weight: 0.3, width: 20, length: 30, height: 10, again: true },
  });

  expect(retried.status()).toBe(200);
  expect((await waybillOf(id)).waybill_number).toMatch(/^\d{14}$/);
});

test('a number typed by hand is kept and tracked, and a wrong one is refused', async ({
  page,
}) => {
  const id = await placeOrder(page);
  expect(
    (await page.request.post('/api/users/login', { data: owner })).ok(),
  ).toBe(true);
  await openOrder(page, id);

  const number = page.locator('#field-waybillNumber');
  await number.fill('123');
  await page.locator('#action-save').click();
  await expect(page.locator('.payload-toast-container')).toContainText(
    'Номер накладної',
  );
  expect((await waybillOf(id)).waybill_number).toBeNull();

  const typed = `2045${String(Date.now()).slice(-10)}`;
  await number.fill(typed);
  await page.locator('#action-save').click();
  await expect
    .poll(async () => (await waybillOf(id)).waybill_number)
    .toBe(typed);
});
