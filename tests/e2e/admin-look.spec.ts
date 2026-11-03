import { expect, test } from '@playwright/test';

// The admin's buttons in the store's colour, and the dialog of a bulk publish: centred, and saying
// how many it is about. It runs on a production build with the owner of tests/e2e/seed.ts. The
// dialog is left without confirming: the products stay as they are.

const owner = { email: 'owner@example.com', password: 'e2e-owner-password' };

test('a bulk publish says how many, centred, on buttons in the store colour', async ({
  page,
}) => {
  const login = await page.request.post('/api/users/login', { data: owner });
  expect(login.ok()).toBe(true);
  await page.goto('/admin/collections/products');
  // Every field a published product must have is a column from the start.
  await expect(page.locator('.table thead')).toContainText('Категорії');
  // The way to the storefront is said over the list, and the buttons on demand.
  await expect(page.getByText('Товар з’являється на сайті')).toBeVisible();
  const buttons = page.locator('.products-hint');
  await expect(buttons.getByText('лише публікує')).toBeHidden();
  await buttons.getByText('Що роблять кнопки').click();
  await expect(buttons.getByText('лише публікує')).toBeVisible();

  const rows = await page.locator('.table tbody tr').count();
  expect(rows).toBeGreaterThan(0);
  await page.locator('#select-all').click();
  await page.getByRole('button', { name: 'Опублікувати', exact: true }).click();

  const dialog = page.locator('#publish-products');
  await expect(dialog.getByText(`Вибрано: ${rows}`)).toBeVisible();
  await expect(dialog.locator('.confirmation-modal__wrapper')).toHaveCSS(
    'text-align',
    'center',
  );
  await expect(dialog.getByRole('button', { name: 'Підтвердити' })).toHaveCSS(
    'background-color',
    'rgb(23, 96, 92)',
  );

  await dialog.getByRole('button', { name: 'Скасувати' }).click();
  await expect(dialog.getByText(`Вибрано: ${rows}`)).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Редагувати', exact: true }),
  ).toHaveCSS('color', 'rgb(23, 96, 92)');
});

test('a row shows its brand on a first visit', async ({
  browser,
  baseURL,
  viewport,
}) => {
  // Each visit is a new context with nothing cached. Three, because what custom.scss's rule for an
  // open nav prevents is a race: it loses most times, not every time.
  for (let visit = 0; visit < 3; visit++) {
    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    const login = await page.request.post('/api/users/login', { data: owner });
    expect(login.ok()).toBe(true);
    const response = await page.request.get(
      '/api/products?depth=1&where[slug][equals]=e2e-serum',
    );
    const { brand } = (await response.json()).docs[0];
    await page.goto('/admin/collections/products');
    await expect(page.locator('td.cell-brand').first()).toContainText(
      brand.name,
    );
    await context.close();
  }
});

test('a product says when it was published, or that it was not', async ({
  page,
}) => {
  const login = await page.request.post('/api/users/login', { data: owner });
  expect(login.ok()).toBe(true);
  const bySlug = async (slug: string) => {
    const response = await page.request.get(
      `/api/products?draft=true&depth=0&where[slug][equals]=${slug}`,
    );
    return (await response.json()).docs[0];
  };
  const row = page.locator('.doc-controls__meta');
  const stamp = /Опубліковано:\s*\d\d\.\d\d\.\d{4} \d\d:\d\d/;

  const serum = await bySlug('e2e-serum');
  await page.goto(`/admin/collections/products/${serum.id}`);
  await expect(row).toContainText(stamp);
  // The date reads a version, and the versions' tab stays away.
  await expect(page.locator('.doc-tab').first()).toContainText('Редагувати');
  await expect(page.locator('.doc-tab', { hasText: 'Версії' })).toHaveCount(0);

  // Publishing says so at once, with no reload, on a product of its own: e2e-draft stays a draft.
  const draft = await bySlug('e2e-draft');
  const created = await page.request.post('/api/products?draft=true', {
    data: {
      name: 'Ще не на сайті',
      slug: `not-live-${test.info().project.name}`,
      brand: draft.brand,
      categories: draft.categories,
      price: 10000,
      availability: 'in_stock',
      _status: 'draft',
    },
  });
  expect(created.ok()).toBe(true);
  const { doc } = await created.json();
  await page.goto(`/admin/collections/products/${doc.id}`);
  await expect(row).toContainText('Не опубліковано');
  await page.getByRole('button', { name: 'Опублікувати зміни' }).click();
  await expect(row).toContainText(stamp);
  await expect(row).not.toContainText('Не опубліковано');
  await page.request.delete(`/api/products/${doc.id}`);
});

test('a new product starts in pieces, in the form and through the API', async ({
  page,
}) => {
  const login = await page.request.post('/api/users/login', { data: owner });
  expect(login.ok()).toBe(true);
  await page.goto('/admin/collections/products/create');
  await expect(page.locator('#field-volumeUnit')).toContainText('шт');

  const slug = `unit-${test.info().project.name}`;
  const created = await page.request.post('/api/products?draft=true', {
    data: { name: 'Без одиниці', slug, _status: 'draft' },
  });
  expect(created.ok()).toBe(true);
  const { doc } = await created.json();
  expect(doc.volumeUnit).toBe('pcs');
  await page.request.delete(`/api/products/${doc.id}`);
});
