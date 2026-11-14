import { type APIRequestContext, expect, test } from '@playwright/test';

import uk from '../../messages/uk.json' with { type: 'json' };

// The blog end to end: a post the owner publishes is on the list and opens, a draft is on neither.
// It runs on a production build with the owner of tests/e2e/seed.ts.

const owner = { email: 'owner@example.com', password: 'e2e-owner-password' };

const write = async (
  request: APIRequestContext,
  data: Record<string, unknown>,
) => {
  const login = await request.post('/api/users/login', { data: owner });
  const { token } = await login.json();
  const draft = data._status === 'draft' ? '?draft=true' : '';
  const saved = await request.post(`/api/posts${draft}`, {
    data,
    headers: { Authorization: `JWT ${token}` },
  });
  expect(saved.status()).toBe(201);
};

test('a published post is on the blog and opens, and a draft is nowhere', async ({
  page,
  request,
}, { project }) => {
  // Both projects run it on one database.
  const id = `${project.name}-${Date.now()}`;
  const post = { title: `Догляд ${id}`, slug: `post-${id}` };
  const draft = { title: `Чернетка ${id}`, slug: `draft-${id}` };
  await write(request, {
    ...post,
    _status: 'published',
    excerpt: 'Коротко про догляд.',
    // A banner first: a page gives it its heading, a post keeps its own.
    blocks: [
      { blockType: 'hero', title: 'Банер запису' },
      { blockType: 'text', title: 'Крок перший', text: 'Очищення.' },
    ],
  });
  await write(request, { ...draft, _status: 'draft' });

  await page.goto('/brands');
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: uk.Nav.blog })
    .click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(
    page.getByRole('heading', { level: 1, name: uk.Blog.title }),
  ).toBeVisible();
  await expect(page.getByText(draft.title)).toHaveCount(0);

  await page.getByRole('link', { name: post.title }).click();
  await expect(page).toHaveURL(new RegExp(`/blog/${post.slug}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(post.title);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Банер запису' }),
  ).toBeVisible();
  await expect(page.getByText('Очищення.')).toBeVisible();

  expect((await page.goto(`/blog/${draft.slug}`))!.status()).toBe(404);
});
