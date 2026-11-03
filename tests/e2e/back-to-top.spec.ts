import { expect, type Page, test } from '@playwright/test';

import en from '../../messages/en.json' with { type: 'json' };
import uk from '../../messages/uk.json' with { type: 'json' };

// The way back up on the storefront, on /canvas and in the admin. It runs on a production build with
// the owner of tests/e2e/seed.ts. A low window makes any page long enough to scroll.

const owner = { email: 'owner@example.com', password: 'e2e-owner-password' };

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

const goesBackUp = async (page: Page, url: string, name: string) => {
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 300,
  });
  await page.goto(url);
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toHaveCount(0);

  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  );
  await expect(button).toBeInViewport({ ratio: 1 });
  expect(await scrollY(page)).toBeGreaterThan(0);

  await button.click();
  await expect.poll(() => scrollY(page)).toBe(0);
  await expect(button).toHaveCount(0);
};

test('the storefront has a way back up, in both languages', async ({
  page,
}) => {
  await goesBackUp(page, '/', uk.Nav.backToTop);
  await goesBackUp(page, '/en', en.Nav.backToTop);
});

test('/canvas and the admin have it too', async ({ page }) => {
  const login = await page.request.post('/api/users/login', { data: owner });
  expect(login.ok()).toBe(true);
  await goesBackUp(page, '/canvas', uk.Nav.backToTop);
  await goesBackUp(page, '/admin', 'Нагору');
  await goesBackUp(page, '/admin/collections/products/create', 'Нагору');
});

test('asked for less motion, it goes up at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 300,
  });
  await page.goto('/');
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  );
  await page
    .getByRole('button', { name: uk.Nav.backToTop, exact: true })
    .click();
  expect(await scrollY(page)).toBe(0);
});
