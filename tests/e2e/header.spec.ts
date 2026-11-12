import { expect, test } from '@playwright/test';

// The header stays on the screen down a long page, over what scrolls under it, and a link in it
// still opens the next page at its top. A low window makes any page long enough to scroll.
test('the header stays in view down a page, and its logo leads to the top', async ({
  page,
}) => {
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 300,
  });
  await page.goto('/brands');
  const header = page.getByRole('banner');
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  );
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(150);

  await expect(header).toBeInViewport({ ratio: 1 });
  const covers = await page.evaluate(() => {
    const box = document.querySelector('header')!.getBoundingClientRect();
    const point = document.elementFromPoint(
      box.left + box.width / 2,
      box.bottom - 2,
    );
    return Boolean(point?.closest('header'));
  });
  expect(covers).toBe(true);

  await header.getByRole('link', { name: 'ROSYNA SKIN', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
