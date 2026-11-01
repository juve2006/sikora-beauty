import { expect, test } from '@playwright/test';
import pg from 'pg';

import en from '../../messages/en.json' with { type: 'json' };
import uk from '../../messages/uk.json' with { type: 'json' };
import { finderQuestions } from '../../src/db/seed-data';

// The care finder end to end (task `care-finder`): `seed:catalog`'s draft, turned on by
// tests/e2e/seed.ts, whose serum is for dry skin. From the menu through the questions to the
// routine, then a consultation that carries the answers — read where the cosmetologist reads them.

const database = new pg.Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(() => database.end());

const product = 'Сироватка E2E';
const [skin, familiar, improve, age] = finderQuestions;
const dry = skin.answers.find(({ types }) => types?.includes('dry'))!;
const tight = familiar.answers[0];
const dehydration = improve.answers.find(({ concerns }) =>
  concerns?.includes('dehydration'),
)!;
const young = age.answers[0];

for (const [locale, m, prefix] of [
  ['uk', uk, ''],
  ['en', en, '/en'],
] as const) {
  test(`answers the questions and asks for a consultation with them (${locale})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/`);
    if (page.viewportSize()!.width < 1024)
      await page.getByRole('button', { name: m.Nav.menu }).click();
    await page.getByRole('link', { name: m.Nav.finder }).click();
    await expect(page).toHaveURL(/\/care-finder$/);

    const question = (text: { uk: string; en: string }) =>
      page.getByRole('heading', { level: 2, name: text[locale] });
    const next = page.getByRole('button', { name: m.Finder.next });
    await expect(question(skin)).toBeVisible();
    await expect(next).toBeDisabled();
    await page.getByRole('radio', { name: dry[locale] }).check();
    await next.click();

    // The focus moves to the next question; back keeps what was chosen.
    await expect(question(familiar)).toBeFocused();
    await page.getByRole('checkbox', { name: tight[locale] }).check();
    await page.getByRole('button', { name: m.Finder.back }).click();
    await expect(question(skin)).toBeFocused();
    await expect(page.getByRole('radio', { name: dry[locale] })).toBeChecked();
    await next.click();
    await expect(
      page.getByRole('checkbox', { name: tight[locale] }),
    ).toBeChecked();
    await next.click();

    await page.getByRole('checkbox', { name: dehydration[locale] }).check();
    await next.click();
    await page.getByRole('radio', { name: young[locale] }).check();
    await page.getByRole('button', { name: m.Finder.finish }).click();

    await expect(page).toHaveURL(/\/care-finder\?a=[a-f0-9,]+$/);
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { level: 1, name: m.Finder.routine }),
    ).toBeVisible();
    await expect(main.getByText(dry[locale], { exact: true })).toBeVisible();
    await expect(
      main.getByRole('link', { name: product }).first(),
    ).toBeVisible();
    // Only the serum is in stock, and only serums have it: the other steps are the cosmetologist's.
    await expect(main.getByText(m.Finder.emptyStep).first()).toBeVisible();

    await main.getByRole('button', { name: m.Consultation.open }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(m.Consultation.withAnswers)).toBeVisible();
    await dialog.getByLabel(m.Consultation.name).fill('Олена');
    await dialog.getByLabel(m.Consultation.phone).fill('067 123 45 67');
    await dialog.getByRole('button', { name: m.Consultation.submit }).click();
    await expect(dialog.getByText(m.Consultation.sentTitle)).toBeVisible();

    // The answers as the cosmetologist reads them: in Ukrainian, whatever the shopper's language.
    const { rows } = await database.query(
      'select finder_answers, locale from consultation_requests order by id desc limit 1',
    );
    expect(rows[0]).toEqual({
      locale,
      finder_answers: [
        `${skin.uk} — ${dry.uk}`,
        `${familiar.uk} — ${tight.uk}`,
        `${improve.uk} — ${dehydration.uk}`,
        `${age.uk} — ${young.uk}`,
      ].join('\n'),
    });
  });
}
