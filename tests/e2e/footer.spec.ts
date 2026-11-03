import { type APIRequestContext, expect, test } from '@playwright/test';

import en from '../../messages/en.json' with { type: 'json' };
import uk from '../../messages/uk.json' with { type: 'json' };

// The footer end to end: what the owner saves in the admin reaches it, and what they leave empty is
// not there. It runs on a production build with the owner of tests/e2e/seed.ts.

const owner = { email: 'owner@example.com', password: 'e2e-owner-password' };

const save = async (
  request: APIRequestContext,
  locale: 'uk' | 'en',
  data: Record<string, string | null>,
) => {
  const login = await request.post('/api/users/login', { data: owner });
  const { token } = await login.json();
  const saved = await request.post(`/api/globals/contacts?locale=${locale}`, {
    data,
    headers: { Authorization: `JWT ${token}` },
  });
  expect(saved.status()).toBe(200);
};

const empty = {
  phone: null,
  email: null,
  instagram: null,
  hours: null,
  address: null,
};

test('the footer shows what the owner saved, in the page’s language, and nothing else', async ({
  page,
  request,
}) => {
  try {
    await save(request, 'uk', {
      phone: '+38 (067) 123-45-67',
      email: 'shop@example.com',
      instagram: 'https://www.instagram.com/example',
      hours: 'Пн.-Пт. 10:00–19:00',
      address: 'Київ, вулиця Тестова, 1',
    });
    await save(request, 'en', {
      hours: 'Mon-Fri 10:00–19:00',
      address: 'Kyiv, 1 Test Street',
    });

    await page.goto('/brands');
    const footer = page.getByRole('contentinfo');
    await expect(
      footer.getByRole('heading', { name: uk.Footer.contacts }),
    ).toBeVisible();
    await expect(
      footer.getByRole('link', { name: '+38 (067) 123-45-67' }),
    ).toHaveAttribute('href', 'tel:+380671234567');
    await expect(
      footer.getByRole('link', { name: 'shop@example.com' }),
    ).toHaveAttribute('href', 'mailto:shop@example.com');
    await expect(
      footer.getByRole('link', { name: uk.Footer.instagram }),
    ).toHaveAttribute('href', 'https://www.instagram.com/example');
    await expect(footer).toContainText('Пн.-Пт. 10:00–19:00');
    await expect(footer).toContainText('Київ, вулиця Тестова, 1');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);

    await page.goto('/en/brands');
    await expect(footer).toContainText('Mon-Fri 10:00–19:00');
    await expect(footer).toContainText('Kyiv, 1 Test Street');
    await expect(
      footer.getByRole('heading', { name: en.Footer.shoppers }),
    ).toBeVisible();

    await save(request, 'uk', empty);
    await save(request, 'en', empty);
    await page.goto('/brands');
    await expect(
      footer.getByRole('heading', { name: uk.Footer.shoppers }),
    ).toBeVisible();
    await expect(
      footer.getByRole('heading', { name: uk.Footer.contacts }),
    ).toHaveCount(0);
    await expect(footer.locator('a[href^="tel:"]')).toHaveCount(0);
  } finally {
    await save(request, 'uk', empty);
    await save(request, 'en', empty);
  }
});

test('a contact of only spaces is not a contact', async ({ page, request }) => {
  try {
    await save(request, 'uk', { hours: ' \n ', address: '   ' });

    await page.goto('/brands');
    const footer = page.getByRole('contentinfo');
    await expect(
      footer.getByRole('heading', { name: uk.Footer.shoppers }),
    ).toBeVisible();
    await expect(
      footer.getByRole('heading', { name: uk.Footer.contacts }),
    ).toHaveCount(0);
  } finally {
    await save(request, 'uk', empty);
  }
});

test('the footer’s way to the account asks for nothing before a click', async ({
  page,
}) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/account') {
      asked.push(request.url());
    }
  });

  // Tall enough for the footer to be on screen from the start: Next prefetches the links it sees.
  await page.setViewportSize({ ...page.viewportSize()!, height: 3000 });
  await page.goto('/brands', { waitUntil: 'networkidle' });
  await expect(page.getByRole('contentinfo')).toBeInViewport();
  expect(asked).toEqual([]);
});

test('the footer leads to the catalog and to a shopper’s pages', async ({
  page,
}) => {
  await page.goto('/brands');
  const footer = page.getByRole('contentinfo');
  await footer.getByRole('link', { name: uk.Cart.title, exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await footer.getByRole('link', { name: uk.Nav.brands }).click();
  await expect(page).toHaveURL(/\/brands$/);
});
