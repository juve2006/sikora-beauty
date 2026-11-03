import {
  type Browser,
  expect,
  test,
  type Locator,
  type Page,
} from '@playwright/test';
import pg from 'pg';

import en from '../../messages/en.json' with { type: 'json' };
import uk from '../../messages/uk.json' with { type: 'json' };

// Accounts end to end (task `customer-accounts`): a production build, so its Secure cookie and its
// /canvas rule, without SMTP, so no letter leaves. A letter's token is read where Payload keeps it.

const database = new pg.Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(() => database.end());

const owner = { email: 'owner@example.com', password: 'e2e-owner-password' };
const password = 'e2e-shopper-password';

const unique = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

// Pressed before hydration, a form posts to the page itself and starts over.
const open = (page: Page, path: string) =>
  page.goto(path, { waitUntil: 'networkidle' });

const signInForm = (page: Page, m: typeof uk) =>
  page.getByRole('region', { name: m.Account.signIn });

// A number nobody has: the tests' accounts keep theirs.
const freshNumber = () =>
  `50${String(Math.random()).slice(2, 9).padEnd(7, '0')}`;

// «За Email», unless the form is there already.
const byEmail = async (form: Locator, m: typeof uk) => {
  // A dialog asks the server first, and `isVisible` does not wait for it.
  await expect(
    form.getByLabel(m.Account.password, { exact: true }),
  ).toBeVisible();
  const button = form.getByRole('button', { name: m.Account.byEmail });
  if (await button.isVisible()) await button.click();
};

const fillSignIn = async (
  form: Locator,
  m: typeof uk,
  email: string,
  secret: string,
) => {
  await byEmail(form, m);
  await form.getByLabel(m.Account.email).fill(email);
  await form.getByLabel(m.Account.password, { exact: true }).fill(secret);
  await form.getByRole('button', { name: m.Account.signIn }).click();
};

const fillByNumber = async (
  form: Locator,
  m: typeof uk,
  number: string,
  secret: string,
) => {
  await form.getByLabel(m.Account.phone).fill(number);
  await form.getByLabel(m.Account.password, { exact: true }).fill(secret);
  await form.getByRole('button', { name: m.Account.signIn }).click();
};

const pressSignIn = (page: Page, m: typeof uk, email: string, secret: string) =>
  fillSignIn(signInForm(page, m), m, email, secret);

// A letter's page has the one form, in `main`.
const pressOnLetter = (
  page: Page,
  m: typeof uk,
  email: string,
  secret: string,
) => fillSignIn(page.getByRole('main'), m, email, secret);

const fillForm = async (
  form: Locator,
  m: typeof uk,
  email: string,
  secret: string,
  number = freshNumber(),
) => {
  await form.getByLabel(m.Account.firstName).fill('Олена');
  await form.getByLabel(m.Account.lastName).fill('Тестова');
  await form.getByLabel(m.Account.phone).fill(number);
  await form.getByLabel(m.Account.email).fill(email);
  await form.getByLabel(m.Account.password, { exact: true }).fill(secret);
  return form.getByRole('button', { name: m.Account.register });
};

const registerForm = (page: Page, m: typeof uk) =>
  page.getByRole('region', { name: m.Account.register });

const fillRegister = (
  page: Page,
  m: typeof uk,
  email: string,
  secret: string,
  number?: string,
) => fillForm(registerForm(page, m), m, email, secret, number);

const register = async (
  page: Page,
  m: typeof uk,
  email: string,
  secret = password,
  number?: string,
) => (await fillRegister(page, m, email, secret, number)).click();

// The way in from any page: the header's link from `sm`, an item of the sheet on a phone.
const pressAccount = async (page: Page, m: typeof uk) => {
  if (page.viewportSize()!.width < 640)
    await page.getByRole('button', { name: m.Nav.menu }).click();
  await page.getByRole('link', { name: m.Nav.account }).click();
};

const column = async (email: string, name: string) => {
  const { rows } = await database.query(
    `select ${name} as value from customers where email = $1`,
    [email],
  );
  return rows[0]?.value;
};

const signOutButton = (page: Page, m: typeof uk) =>
  page.getByRole('button', { name: m.Account.signOut });

// A shopper signs in to the home page; their account is a page away.
const landedSignedIn = async (page: Page, m: typeof uk, prefix: string) => {
  await expect(page).toHaveURL(prefix || '/');
  await page.goto(`${prefix}/account`);
  await expect(signOutButton(page, m)).toBeVisible();
};

// A shopper through the forms: the letter's link and their password confirm the email and sign them in.
const signedIn = async (page: Page, m: typeof uk, prefix: string) => {
  const email = unique();
  await open(page, `${prefix}/account`);
  await register(page, m, email);
  await expect(page.getByRole('status')).toContainText(email);
  const token = await column(email, '_verificationtoken');
  await open(page, `${prefix}/account/verify?token=${token}`);
  await expect(page.getByText(m.Account.verifyAsk)).toBeVisible();
  await pressOnLetter(page, m, email, password);
  await landedSignedIn(page, m, prefix);
  return email;
};

// The same, signed out again.
const confirmed = async (page: Page, m: typeof uk, prefix: string) => {
  const email = await signedIn(page, m, prefix);
  await page.context().clearCookies();
  return email;
};

const orderSerum = async (page: Page, m: typeof uk, prefix: string) => {
  await page.goto(`${prefix}/product/e2e-serum`);
  await page.getByRole('button', { name: m.Product.addToCart }).click();
  await page.getByRole('link', { name: m.Product.goToCart }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByLabel(m.Checkout.settlement).fill('Бров');
  await page.getByRole('button', { name: /Бровари/ }).click();
  await page.getByRole('button', { name: /Відділення №1/ }).click();
};

const place = async (page: Page, m: typeof uk) => {
  await page.getByRole('radio', { name: m.Checkout.cod }).check();
  await page.getByRole('button', { name: m.Checkout.submit }).click();
  await expect(page).toHaveURL(/\/cart\/thanks\?order=\d+$/);
  return Number(new URL(page.url()).searchParams.get('order'));
};

// Below `lg` the admin's link is in the menu sheet.
const adminLink = async (page: Page, m: typeof uk) => {
  if (page.viewportSize()!.width < 1024)
    await page.getByRole('button', { name: m.Nav.menu }).click();
  return page.getByRole('link', { name: m.Nav.admin });
};

const buyer = async (order: number) => {
  const { rows } = await database.query(
    'select customer_id from orders where id = $1',
    [order],
  );
  return rows[0].customer_id;
};

for (const [locale, m, prefix] of [
  ['uk', uk, ''],
  ['en', en, '/en'],
] as const) {
  test(`registers, confirms, signs in, orders and signs out (${locale})`, async ({
    page,
    context,
  }) => {
    const email = unique();

    // Signed out, the header's way to the account opens the dialog over the page.
    await open(page, `${prefix}/`);
    await pressAccount(page, m);
    await expect(
      page.getByRole('dialog', { name: m.Account.signInTitle }),
    ).toBeVisible();
    await expect(page).toHaveURL(prefix || '/');

    await open(page, `${prefix}/account`);
    await register(page, m, email);
    await expect(page.getByRole('status')).toContainText(email);
    expect(await column(email, 'locale')).toBe(locale);

    // Refused until the email is confirmed, with the way to the letter.
    await pressSignIn(page, m, email, password);
    await expect(signInForm(page, m).getByRole('alert')).toHaveText(
      m.Account.unverified,
    );
    await signInForm(page, m)
      .getByRole('button', { name: m.Account.resend })
      .click();
    await expect(signInForm(page, m).getByRole('status')).toHaveText(
      m.Account.resent,
    );

    // Opening the link changes nothing; the right password under it confirms and leads in.
    const token = await column(email, '_verificationtoken');
    await open(page, `${prefix}/account/verify?token=${token}`);
    await expect(page.getByText(m.Account.verifyAsk)).toBeVisible();
    expect(await column(email, '_verified')).not.toBe(true);
    await pressOnLetter(page, m, email, password);
    // To the home page, and the header's link now shows the account, not a form kept from before.
    await expect(page).toHaveURL(prefix || '/');
    await pressAccount(page, m);
    await expect(page).toHaveURL(/\/account$/);
    const signOut = signOutButton(page, m);
    await expect(signOut).toBeVisible();
    expect(await column(email, '_verified')).toBe(true);
    await expect(page.getByText(m.Account.noOrders)).toBeVisible();

    // Their name and number fill in the checkout.
    await orderSerum(page, m, prefix);
    await expect(page.getByLabel(m.Checkout.firstName)).toHaveValue('Олена');
    await expect(page.getByLabel(m.Checkout.lastName)).toHaveValue('Тестова');
    await expect(page.getByLabel(m.Checkout.phone)).toHaveValue(
      await column(email, 'phone'),
    );
    const id = await place(page, m);
    expect(await buyer(id)).toBe(await column(email, 'id'));

    // In the account: the order as it stands, never the manager's note.
    await database.query('update orders set manager_note = $1 where id = $2', [
      'E2E-NOTE',
      id,
    ]);
    await page.goto(`${prefix}/account`);
    await expect(
      page.getByRole('heading', {
        name: m.Account.order.replace('{number}', String(id)),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByText(m.Account.statuses.new, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('E2E-NOTE')).toHaveCount(0);
    const own = await page.request.get(`/api/orders/${id}`);
    expect(own.status()).toBe(200);
    expect(await own.text()).not.toContain('E2E-NOTE');

    // Their data changes; an invalid phone says so and keeps what was typed.
    const profile = page.getByRole('region', { name: m.Account.profile });
    await profile.getByLabel(m.Account.firstName).fill('Марія');
    await profile.getByLabel(m.Account.phone).fill('12');
    await profile.getByRole('button', { name: m.Account.save }).click();
    await expect(
      profile.getByLabel(m.Account.phone),
    ).toHaveAccessibleDescription(m.Account.errors.phoneInvalid);
    await expect(profile.getByLabel(m.Account.firstName)).toHaveValue('Марія');
    const number = freshNumber();
    await profile.getByLabel(m.Account.phone).fill(`0${number}`);
    await profile.getByRole('button', { name: m.Account.save }).click();
    await expect(profile.getByRole('status')).toHaveText(m.Account.saved);
    expect(await column(email, 'first_name')).toBe('Марія');
    await orderSerum(page, m, prefix);
    await expect(page.getByLabel(m.Checkout.firstName)).toHaveValue('Марія');
    await expect(page.getByLabel(m.Checkout.phone)).toHaveValue(
      `+380${number}`,
    );

    // Signing out ends the session on the server: the cookie kept from before opens nothing.
    const before = await context.cookies();
    await page.goto(`${prefix}/account`);
    await signOut.click();
    await expect(signInForm(page, m)).toBeVisible();
    await context.addCookies(before);
    await page.goto(`${prefix}/account`);
    await expect(signInForm(page, m)).toBeVisible();
  });
}

test('a guest orders as before: linked to nobody', async ({ page }) => {
  await orderSerum(page, uk, '');
  await page.getByLabel(uk.Checkout.firstName).fill('Гість');
  await page.getByLabel(uk.Checkout.lastName).fill('Тестовий');
  await page.getByLabel(uk.Checkout.phone).fill('067 123 45 67');
  expect(await buyer(await place(page, uk))).toBeNull();
});

test('an email is taken once confirmed, and only then', async ({ page }) => {
  const email = unique();
  await open(page, '/account');
  await register(page, uk, email, 'first-password');
  await expect(page.getByRole('status')).toContainText(email);

  // Not confirmed: registering it again replaces the password.
  await open(page, '/account');
  await register(page, uk, email, 'second-password');
  await expect(page.getByRole('status')).toContainText(email);
  await open(page, '/account');
  await pressSignIn(page, uk, email, 'first-password');
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.wrong,
  );
  await pressSignIn(page, uk, email, 'second-password');
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.unverified,
  );

  const token = await column(email, '_verificationtoken');
  await open(page, `/account/verify?token=${token}`);
  await pressOnLetter(page, uk, email, 'second-password');
  await landedSignedIn(page, uk, '');
  await page.context().clearCookies();
  await open(page, '/account');
  await register(page, uk, email, 'third-password');
  const form = page.getByRole('region', { name: uk.Account.register });
  await expect(form.getByLabel(uk.Account.email)).toHaveAccessibleDescription(
    uk.Account.errors.taken,
  );

  // The link is used up; so is a forged one.
  await open(page, `/account/verify?token=${token}`);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    uk.Account.verifyInvalid,
  );
  await open(page, '/account/verify?token=forged');
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    uk.Account.verifyInvalid,
  );

  // The owner unticked it: no link can confirm it now, and it is still somebody's.
  await database.query(
    'update customers set _verified = false, _verificationtoken = null where email = $1',
    [email],
  );
  const hash = await column(email, 'hash');
  await open(page, '/account');
  await register(page, uk, email, 'fourth-password');
  await expect(form.getByLabel(uk.Account.email)).toHaveAccessibleDescription(
    uk.Account.errors.taken,
  );
  expect(await column(email, 'hash')).toBe(hash);
});

test('whoever registered someone else’s email never gets the account', async ({
  page,
}) => {
  const email = unique();
  const theirs = 'the-owner-of-the-address';
  const attackers = 'the-one-who-is-not';

  await open(page, '/account');
  await register(page, uk, email, theirs);
  await expect(page.getByRole('status')).toContainText(email);
  await open(page, '/account');
  await register(page, uk, email, attackers);
  await expect(page.getByRole('status')).toContainText(email);

  // The owner of the address opens the letter: their password no longer fits, so nothing is confirmed.
  const token = await column(email, '_verificationtoken');
  await open(page, `/account/verify?token=${token}`);
  await pressOnLetter(page, uk, email, theirs);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    uk.Account.wrong,
  );
  expect(await column(email, '_verified')).not.toBe(true);

  // Without the letter the other password opens nothing.
  await open(page, '/account');
  await pressSignIn(page, uk, email, attackers);
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.unverified,
  );
  expect(await column(email, '_verified')).not.toBe(true);

  // The owner registers again, and the letter they already hold now takes their password.
  await open(page, '/account');
  await register(page, uk, email, theirs);
  await expect(page.getByRole('status')).toContainText(email);
  await open(page, `/account/verify?token=${token}`);
  await pressOnLetter(page, uk, email, theirs);
  await landedSignedIn(page, uk, '');
  expect(await column(email, '_verified')).toBe(true);

  await page.context().clearCookies();
  await open(page, '/account');
  await pressSignIn(page, uk, email, attackers);
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.wrong,
  );
});

// Chromium asks twice on a first visit (`Critical-CH`), and mail scanners open links: only a fresh
// browser shows what a letter's link does.
test('a letter’s link opened in a fresh browser still waits for the password', async ({
  browser,
  page,
}) => {
  const email = unique();
  await open(page, '/account');
  await register(page, uk, email);
  await expect(page.getByRole('status')).toContainText(email);
  const token = await column(email, '_verificationtoken');

  const fresh = await browser.newContext({ baseURL: 'http://localhost:3200' });
  const tab = await fresh.newPage();
  await open(tab, `/account/verify?token=${token}`);
  await expect(tab.getByText(uk.Account.verifyAsk)).toBeVisible();
  await expect(tab.getByRole('main').getByRole('alert')).toHaveCount(0);
  expect(await column(email, '_verified')).not.toBe(true);
  await pressOnLetter(tab, uk, email, password);
  await landedSignedIn(tab, uk, '');
  expect(await column(email, '_verified')).toBe(true);
  await fresh.close();
});

test('Payload’s own page for a letter’s link leads to ours and confirms nothing', async ({
  page,
}) => {
  const email = unique();
  await open(page, '/account');
  await register(page, uk, email);
  await expect(page.getByRole('status')).toContainText(email);
  const token = await column(email, '_verificationtoken');

  await page.goto(`/admin/customers/verify/${token}`);
  await expect(page).toHaveURL(`/account/verify?token=${token}`);
  await expect(page.getByText(uk.Account.verifyAsk)).toBeVisible();
  expect(await column(email, '_verified')).not.toBe(true);
});

test('whoever is signed in can still answer a letter that waits', async ({
  browser,
  page,
}) => {
  await signedIn(page, uk, '');

  const fresh = await browser.newContext({ baseURL: 'http://localhost:3200' });
  const tab = await fresh.newPage();
  const email = unique();
  await open(tab, '/account');
  await register(tab, uk, email);
  await expect(tab.getByRole('status')).toContainText(email);
  const token = await column(email, '_verificationtoken');
  await fresh.close();

  await open(page, `/account/verify?token=${token}`);
  await expect(page.getByText(uk.Account.verifyAsk)).toBeVisible();
  await pressOnLetter(page, uk, email, password);
  // This page's own redirect may answer first, with the old session: their account, not the home
  // page. The session is the new account's either way.
  await expect(page).not.toHaveURL(/verify/);
  expect(await column(email, '_verified')).toBe(true);
  const me = await (await page.request.get('/api/customers/me')).json();
  expect(me.user.email).toBe(email);

  // Used up, it has nothing to ask of whoever is signed in.
  await page.goto(`/account/verify?token=${token}`);
  await expect(page).toHaveURL(/\/account$/);
});

test('a letter goes again only once the interval has passed', async ({
  page,
}) => {
  const email = unique();
  await open(page, '/account');
  await register(page, uk, email);
  await expect(page.getByRole('status')).toContainText(email);

  const resend = async () => {
    await open(page, '/account');
    await pressSignIn(page, uk, email, password);
    await signInForm(page, uk)
      .getByRole('button', { name: uk.Account.resend })
      .click();
    await expect(signInForm(page, uk).getByRole('status')).toHaveText(
      uk.Account.resent,
    );
  };

  // The account's own letter has just gone: the same answer, nothing booked.
  await resend();
  expect(await column(email, 'verification_sent_at')).toBeNull();

  await database.query(
    "update customers set created_at = now() - interval '6 minutes' where email = $1",
    [email],
  );
  await resend();
  const booked = await column(email, 'verification_sent_at');
  expect(booked).not.toBeNull();

  await resend();
  expect(await column(email, 'verification_sent_at')).toEqual(booked);
});

// The same aim by another way: a second registration timed for the moment the owner of the address
// confirms. Mocks cannot show this, and it does not happen every time: before the fix about one
// round in eight ended with the other password on a confirmed account or the confirmation undone.
test('registering again while the owner confirms never hands over the account', async ({
  browser,
  page,
  playwright,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  test.setTimeout(300_000);
  const theirs = 'the-owner-of-the-address';
  const attackers = 'the-one-who-is-not';
  const baseURL = 'http://localhost:3200';
  const api = await playwright.request.newContext({ baseURL });
  const others = await Promise.all(
    [1, 2, 3].map(async () =>
      (await browser.newContext({ baseURL })).newPage(),
    ),
  );
  const answered = (tab: Page) =>
    tab.waitForResponse((response) => response.request().method() === 'POST');
  const opens = async (email: string, secret: string) =>
    (
      await api.post('/api/customers/login', {
        data: { email, password: secret },
      })
    ).status() === 200;

  for (let round = 0; round < 40; round++) {
    const email = unique();
    await page.context().clearCookies();
    await open(page, '/account');
    await register(page, uk, email, theirs);
    await expect(page.getByRole('status')).toContainText(email);
    const token = await column(email, '_verificationtoken');

    await open(page, `/account/verify?token=${token}`);
    const letter = page.getByRole('main');
    await byEmail(letter, uk);
    await letter.getByLabel(uk.Account.email).fill(email);
    await letter.getByLabel(uk.Account.password, { exact: true }).fill(theirs);
    const confirm = letter.getByRole('button', { name: uk.Account.signIn });
    const again = await Promise.all(
      others.map(async (tab) => {
        await open(tab, '/account');
        return fillRegister(tab, uk, email, attackers);
      }),
    );

    // Started ahead of the sign-in, a registration's password is simply there before it is checked:
    // the moment to hit is just after.
    const pressed = (button: Locator, wait: number) =>
      new Promise((done) => setTimeout(done, wait)).then(() => button.click());
    await Promise.all([
      answered(page),
      ...others.map(answered),
      pressed(confirm, 0),
      ...again.map((button, index) => pressed(button, 30 + index * 30)),
    ]);

    expect(await opens(email, attackers), `round ${round}`).toBe(false);
    // Told they are in, the confirmation holds.
    const signedIn = (await page.context().cookies()).some(
      ({ name }) => name === 'payload-token',
    );
    if (signedIn)
      expect(await column(email, '_verified'), `round ${round}`).toBe(true);
  }
  await Promise.all(others.map((tab) => tab.context().close()));
  await api.dispose();
});

// Payload writes a session with the whole row it read before checking the password, so a sign-in
// under way used to put the old password back. `src/lib/auth-writes.ts` stops that by a marker of
// Payload's own: if an upgrade changes it, this goes red. Every round hit before the fix.
// Asks for a reset as anyone may. `token` reads the letter's token from wherever this account's row lives.
const resetAsked = async (
  tab: Page,
  email: string,
  token: () => Promise<string | null>,
) => {
  await open(tab, '/account/reset');
  await tab.getByLabel(uk.Account.email).fill(email);
  await tab.getByRole('button', { name: uk.Account.resetSend }).click();
  await expect(tab.getByRole('status')).toHaveText(uk.Account.resetSent);
  await expect.poll(token).toMatch(/^[a-f0-9]{40}$/);
  return token();
};

// A shopper's letter opened and the new password typed: what is left is to press the button.
const resetReady = async (tab: Page, email: string, secret: string) => {
  const token = await resetAsked(tab, email, () =>
    column(email, 'reset_password_token'),
  );
  await open(tab, `/account/reset?token=${token}`);
  await tab.getByLabel(uk.Account.newPassword).fill(secret);
  return tab.getByRole('button', { name: uk.Account.savePassword });
};

test('a new password holds while the old one keeps signing in', async ({
  browser,
  page,
  playwright,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  test.setTimeout(120_000);
  const baseURL = 'http://localhost:3200';
  const renewed = 'a-password-after-the-reset';
  const api = await playwright.request.newContext({ baseURL });
  const fresh = await browser.newContext({ baseURL });
  const tab = await fresh.newPage();

  for (let round = 0; round < 5; round++) {
    const email = await signedIn(page, uk, '');
    const signsIn = (secret: string) =>
      api.post('/api/customers/login', { data: { email, password: secret } });

    const save = await resetReady(tab, email, renewed);

    let stop = false;
    const keepSigningIn = async () => {
      while (!stop && (await signsIn(password)).ok());
    };
    const loops = [keepSigningIn(), keepSigningIn(), keepSigningIn()];
    await new Promise((done) => setTimeout(done, 40));
    await save.click();
    await expect(tab.getByRole('status')).toHaveText(uk.Account.changed);
    stop = true;
    await Promise.all(loops);

    expect((await signsIn(renewed)).status(), `round ${round}`).toBe(200);
    expect((await signsIn(password)).status(), `round ${round}`).toBe(401);
    const me = await (await page.request.get('/api/customers/me')).json();
    expect(me.user, `round ${round}`).toBeNull();
    await page.context().clearCookies();
  }
  await fresh.close();
  await api.dispose();
});

// Wrong attempts over the limit make Payload drop the sessions of the last 20 seconds: it writes the
// whole row it read before the password check, so the row needs an older session for it to happen.
test('a new password holds against a burst of wrong ones', async ({
  browser,
  page,
  playwright,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  test.setTimeout(240_000);
  const baseURL = 'http://localhost:3200';
  const renewed = 'a-password-after-the-reset';
  const api = await playwright.request.newContext({ baseURL });
  const fresh = await browser.newContext({ baseURL });
  const tab = await fresh.newPage();

  for (let round = 0; round < 12; round++) {
    const email = await signedIn(page, uk, '');
    const signsIn = (secret: string) =>
      api.post('/api/customers/login', { data: { email, password: secret } });
    await database.query(
      `update customers_sessions set created_at = now() - interval '1 minute'
       where _parent_id = (select id from customers where email = $1)`,
      [email],
    );
    const save = await resetReady(tab, email, renewed);
    const hashBefore = await column(email, 'hash');

    let stop = false;
    const attack = (async () => {
      while (!stop) {
        await Promise.all(
          Array.from({ length: 5 }, () => signsIn('not-the-password')),
        );
        await signsIn(password);
      }
    })();
    await new Promise((done) => setTimeout(done, 40 + round * 17));
    await save.click();
    await expect(tab.getByRole('status')).toHaveText(uk.Account.changed);
    await new Promise((done) => setTimeout(done, 300));
    stop = true;
    await attack;

    expect(await column(email, 'hash'), `round ${round}`).not.toBe(hashBefore);
    // The lock is another matter: the two passwords answer for themselves without it.
    const unlock = () =>
      database.query(
        'update customers set lock_until = null, login_attempts = 0 where email = $1',
        [email],
      );
    await unlock();
    expect((await signsIn(renewed)).status(), `round ${round}`).toBe(200);
    await unlock();
    expect((await signsIn(password)).status(), `round ${round}`).toBe(401);
    await page.context().clearCookies();
  }
  await fresh.close();
  await api.dispose();
});

// `payload.update` writes the whole row it read: staff need no password for that, only their session.
test('a new password holds while an old session keeps saving', async ({
  browser,
  playwright,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  test.setTimeout(120_000);
  const baseURL = 'http://localhost:3200';
  const renewed = 'a-password-after-the-reset';
  const staffPassword = 'e2e-staff-password';
  const manager = await playwright.request.newContext({ baseURL });
  const checks = await playwright.request.newContext({ baseURL });
  const fresh = await browser.newContext({ baseURL });
  const tab = await fresh.newPage();
  await manager.post('/api/users/login', { data: owner });

  // Saving nothing, then choosing a password: a session the reset closes must get neither to land after it.
  const intruder = 'a-password-of-the-old-session';
  for (let round = 0; round < 6; round++) {
    const body = round < 3 ? {} : { password: intruder };
    const email = unique();
    const made = await manager.post('/api/users', {
      data: { email, password: staffPassword, role: 'cosmetologist' },
    });
    expect(made.status()).toBe(201);
    const { id } = (await made.json()).doc;
    const signsIn = (secret: string) =>
      checks.post('/api/users/login', { data: { email, password: secret } });
    const oldSession = await playwright.request.newContext({ baseURL });
    await oldSession.post('/api/users/login', {
      data: { email, password: staffPassword },
    });
    const token = await resetAsked(tab, email, async () => {
      const { rows } = await database.query(
        'select reset_password_token as value from users where id = $1',
        [id],
      );
      return rows[0]?.value;
    });

    let stop = false;
    const keepSaving = async () => {
      while (!stop) await oldSession.patch(`/api/users/${id}`, { data: body });
    };
    const loops = [keepSaving(), keepSaving(), keepSaving()];
    await new Promise((done) => setTimeout(done, 40));
    // What Payload's own page behind a staff letter's link does.
    const reset = await checks.post('/api/users/reset-password', {
      data: { token, password: renewed },
    });
    expect(reset.status(), `round ${round}`).toBe(200);
    await new Promise((done) => setTimeout(done, 300));
    stop = true;
    await Promise.all(loops);

    expect((await signsIn(renewed)).status(), `round ${round}`).toBe(200);
    expect((await signsIn(staffPassword)).status(), `round ${round}`).toBe(401);
    expect((await signsIn(intruder)).status(), `round ${round}`).toBe(401);
    const me = await (await oldSession.get('/api/users/me')).json();
    expect(me.user, `round ${round}`).toBeNull();
    await oldSession.dispose();
  }
  await fresh.close();
  await checks.dispose();
  await manager.dispose();
});

// Access refuses whoever may not before anything waits for the row: had they a place in that queue, each
// would hold a pool client, and Payload's own reads would be left without one.
test('a new password goes through while anyone else keeps asking for one', async ({
  playwright,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  const baseURL = 'http://localhost:3200';
  const renewed = 'a-password-after-the-flood';
  const staffPassword = 'e2e-staff-password';
  const manager = await playwright.request.newContext({ baseURL });
  const session = await playwright.request.newContext({ baseURL });
  const anonymous = await playwright.request.newContext({ baseURL });
  await manager.post('/api/users/login', { data: owner });
  const email = unique();
  const made = await manager.post('/api/users', {
    data: { email, password: staffPassword, role: 'cosmetologist' },
  });
  const { id } = (await made.json()).doc;
  await session.post('/api/users/login', {
    data: { email, password: staffPassword },
  });

  let stop = false;
  const keepAsking = async () => {
    while (!stop)
      await anonymous.patch(`/api/users/${id}`, {
        data: { password: 'a-password-of-nobody' },
      });
  };
  const loops = Array.from({ length: 30 }, keepAsking);
  await new Promise((done) => setTimeout(done, 100));
  const saved = await session.patch(`/api/users/${id}`, {
    data: { password: renewed },
    timeout: 5000,
  });
  stop = true;
  await Promise.all(loops);
  expect(saved.status()).toBe(200);
  const signsIn = await anonymous.post('/api/users/login', {
    data: { email, password: renewed },
  });
  expect(signsIn.status()).toBe(200);
  await Promise.all([manager, session, anonymous].map((api) => api.dispose()));
});

// The marks in `src/lib/auth-writes.ts` last as long as a request, and GraphQL runs more than one
// operation in it: one that failed on a token would mark the next, which writes the row it read.
test('GraphQL changes nothing on an account', async ({ playwright }) => {
  const baseURL = 'http://localhost:3200';
  const manager = await playwright.request.newContext({ baseURL });
  await manager.post('/api/users/login', { data: owner });
  for (const query of [
    `mutation { updateUser(id: 1, data: {}) { id } }`,
    `mutation { resetPasswordUser(token: "0", password: "x") { token } }`,
    `mutation { loginUser(email: "a@b.c", password: "x") { token } }`,
    `mutation { refreshTokenUser { refreshedToken } }`,
    `mutation { logoutUser }`,
    `mutation { updateCustomer(id: 1, data: {}) { id } }`,
    `mutation { verifyEmailCustomer(token: "0") }`,
  ]) {
    const graphql = await manager.post('/api/graphql', { data: { query } });
    const { errors } = await graphql.json();
    expect(errors?.[0]?.message, query).toContain('Cannot query field');
  }
  await manager.dispose();
});

test('a sign-out holds and a sign-in keeps its cookie, whatever overlaps them', async ({
  page,
  playwright,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  test.setTimeout(120_000);
  const baseURL = 'http://localhost:3200';
  const context = () => playwright.request.newContext({ baseURL });
  const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
  const signedInAs = async (
    api: Awaited<ReturnType<typeof context>>,
    path: string,
  ) => (await (await api.get(path)).json()).user;

  // A sign-in of the same person, reading the row before the sign-out and writing after it.
  for (let round = 0; round < 5; round++) {
    const email = await signedIn(page, uk, '');
    const copy = await playwright.request.newContext({
      baseURL,
      storageState: await page.context().storageState(),
    });
    const other = await context();
    const signing = other.post('/api/customers/login', {
      data: { email, password },
    });
    await wait(round * 4);
    expect((await page.request.post('/api/customers/logout')).ok()).toBe(true);
    await signing;
    expect(
      await signedInAs(copy, '/api/customers/me'),
      `round ${round}`,
    ).toBeNull();
    await page.context().clearCookies();
    await copy.dispose();
    await other.dispose();
  }

  // Two sign-ins at once: neither loses the other's session.
  for (let round = 0; round < 5; round++) {
    const email = await signedIn(page, uk, '');
    const [one, two] = [await context(), await context()];
    await Promise.all(
      [one, two].map((api) =>
        api.post('/api/customers/login', { data: { email, password } }),
      ),
    );
    expect(
      await signedInAs(one, '/api/customers/me'),
      `round ${round}`,
    ).not.toBeNull();
    expect(
      await signedInAs(two, '/api/customers/me'),
      `round ${round}`,
    ).not.toBeNull();
    await page.context().clearCookies();
    await one.dispose();
    await two.dispose();
  }

  // Staff keep `refresh-token` for the admin. A sign-in overlapping a refresh keeps its cookie.
  const refreshing = await context();
  await refreshing.post('/api/users/login', { data: owner });
  for (let round = 0; round < 3; round++) {
    let stop = false;
    const keepRefreshing = async () => {
      while (!stop) await refreshing.post('/api/users/refresh-token');
    };
    const loops = [keepRefreshing(), keepRefreshing(), keepRefreshing()];
    const other = await context();
    await other.post('/api/users/login', { data: owner });
    await wait(100);
    stop = true;
    await Promise.all(loops);
    expect(
      await signedInAs(other, '/api/users/me'),
      `round ${round}`,
    ).not.toBeNull();
    await other.dispose();
  }
  await refreshing.dispose();

  // A copy of the cookie refreshing in a loop has no password, and a sign-out still closes it.
  const manager = await context();
  await manager.post('/api/users/login', { data: owner });
  for (let round = 0; round < 3; round++) {
    const email = unique();
    const made = await manager.post('/api/users', {
      data: { email, password, role: 'cosmetologist' },
    });
    expect(made.status()).toBe(201);
    const session = await context();
    await session.post('/api/users/login', { data: { email, password } });
    const copy = await playwright.request.newContext({
      baseURL,
      storageState: await session.storageState(),
    });
    let stop = false;
    const keepRefreshing = async () => {
      while (!stop) await copy.post('/api/users/refresh-token');
    };
    const loops = [keepRefreshing(), keepRefreshing(), keepRefreshing()];
    await wait(20 + round * 10);
    expect((await session.post('/api/users/logout')).ok()).toBe(true);
    await wait(100);
    stop = true;
    await Promise.all(loops);
    expect(
      await signedInAs(copy, '/api/users/me'),
      `round ${round}`,
    ).toBeNull();
    await session.dispose();
    await copy.dispose();
  }
  await manager.dispose();
});

// Payload's forgot-password holds a pool client and asks for another: at once they would take all of
// it. Only a cold pool opens the window, as new clients take time to connect, and `pg` closes idle ones
// after 10 seconds.
test('more reset requests at once than the pool has clients leave the store answering', async ({
  browser,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'one server, whatever the width',
  );
  test.setTimeout(120_000);
  const baseURL = 'http://localhost:3200';
  const tabs = await Promise.all(
    Array.from({ length: 15 }, async () =>
      (await browser.newContext({ baseURL })).newPage(),
    ),
  );
  const buttons = await Promise.all(
    tabs.map(async (tab) => {
      await open(tab, '/account/reset');
      await tab.getByLabel(uk.Account.email).fill(unique());
      return tab.getByRole('button', { name: uk.Account.resetSend });
    }),
  );
  await new Promise((done) => setTimeout(done, 11_000));
  await Promise.all(buttons.map((button) => button.click()));
  for (const tab of tabs)
    await expect(tab.getByRole('status')).toHaveText(uk.Account.resetSent);
  const answer = await page.request.get('/api/brands?limit=1', {
    timeout: 4000,
  });
  expect(answer.status()).toBe(200);
  await Promise.all(tabs.map((tab) => tab.context().close()));
});

test('wrong passwords lock the account for a while', async ({ page }) => {
  const email = await confirmed(page, uk, '');
  await open(page, '/account');
  for (let attempt = 0; attempt < 5; attempt++) {
    await pressSignIn(page, uk, email, 'not-the-password');
    await expect(
      signInForm(page, uk).getByRole('button', { name: uk.Account.signIn }),
    ).toBeEnabled();
    await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
      uk.Account.wrong,
    );
  }
  await pressSignIn(page, uk, email, password);
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.locked,
  );
});

test('an unknown email gets the wrong-password answer', async ({ page }) => {
  await open(page, '/account');
  await pressSignIn(page, uk, unique(), password);
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.wrong,
  );
});

test('a forgotten password: the same answer, a link, a new password', async ({
  page,
}) => {
  const email = await confirmed(page, uk, '');

  await open(page, '/account');
  await page.getByRole('link', { name: uk.Account.forgot }).click();
  await expect(page).toHaveURL(/\/account\/reset$/);
  await page.getByLabel(uk.Account.email).fill(unique());
  await page.getByRole('button', { name: uk.Account.resetSend }).click();
  await expect(page.getByRole('status')).toHaveText(uk.Account.resetSent);

  await open(page, '/account/reset');
  await page.getByLabel(uk.Account.email).fill(email);
  await page.getByRole('button', { name: uk.Account.resetSend }).click();
  await expect(page.getByRole('status')).toHaveText(uk.Account.resetSent);
  // Written after the answer.
  await expect
    .poll(() => column(email, 'reset_password_token'))
    .toMatch(/^[a-f0-9]{40}$/);
  const token = await column(email, 'reset_password_token');

  // REST takes no new password: it would skip the rule on its length.
  const rest = await page.request.post('/api/customers/reset-password', {
    data: { token, password: 'x' },
  });
  expect(rest.status()).toBe(403);
  expect(await column(email, 'reset_password_token')).toBe(token);

  await open(page, `/account/reset?token=${'0'.repeat(40)}`);
  await page.getByLabel(uk.Account.newPassword).fill('a-new-password');
  await page.getByRole('button', { name: uk.Account.savePassword }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    uk.Account.expired,
  );

  await open(page, `/account/reset?token=${token}`);
  await page.getByLabel(uk.Account.newPassword).fill('short');
  await page.getByRole('button', { name: uk.Account.savePassword }).click();
  await expect(
    page.getByLabel(uk.Account.newPassword),
  ).toHaveAccessibleDescription(uk.Account.errors.passwordShort);
  await page.getByLabel(uk.Account.newPassword).fill('a-new-password');
  await page.getByRole('button', { name: uk.Account.savePassword }).click();
  await expect(page.getByRole('status')).toHaveText(uk.Account.changed);

  await fillSignIn(page.getByRole('main'), uk, email, 'a-new-password');
  await landedSignedIn(page, uk, '');
});

test('the dialog signs in by number, however it is written, and stays on the page', async ({
  page,
}) => {
  const email = await confirmed(page, uk, '');
  const kept = await column(email, 'phone');

  await open(page, '/brands');
  await pressAccount(page, uk);
  const dialog = page.getByRole('dialog', { name: uk.Account.signInTitle });

  // An unknown number and a wrong password say the same.
  await fillByNumber(dialog, uk, freshNumber(), password);
  await expect(dialog.getByRole('alert')).toHaveText(uk.Account.wrongPhone);
  await fillByNumber(dialog, uk, kept, 'not-the-password');
  await expect(dialog.getByRole('alert')).toHaveText(uk.Account.wrongPhone);
  await expect(
    dialog.getByRole('button', { name: uk.Account.signIn }),
  ).toBeEnabled();

  await fillByNumber(dialog, uk, kept.slice(4), password);
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/brands$/);

  // Signed in, the same way leads to the account. Once closed, nothing is left over the page.
  await pressAccount(page, uk);
  await expect(page).toHaveURL(/\/account$/);
  await expect(signOutButton(page, uk)).toBeVisible();
  await signOutButton(page, uk).click();
  await expect(signInForm(page, uk)).toBeVisible();

  // Every way it may be written leads to the one number.
  for (const written of [`0${kept.slice(4)}`, kept]) {
    await page.context().clearCookies();
    await open(page, '/account');
    await fillByNumber(signInForm(page, uk), uk, written, password);
    await landedSignedIn(page, uk, '');
  }
});

test('the dialog registers too; a link out closes it, and it opens on sign-in again', async ({
  page,
}) => {
  await open(page, '/');
  await pressAccount(page, uk);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: uk.Account.register }).click();
  await expect(
    dialog.getByRole('heading', { name: uk.Account.registerTitle }),
  ).toBeVisible();

  const email = unique();
  await (await fillForm(dialog, uk, email, password)).click();
  await expect(dialog.getByRole('status')).toContainText(email);

  await dialog.getByRole('button', { name: uk.Account.close }).click();
  await expect(dialog).toBeHidden();
  await pressAccount(page, uk);
  await expect(
    dialog.getByRole('heading', { name: uk.Account.signInTitle }),
  ).toBeVisible();

  await dialog.getByRole('link', { name: uk.Account.forgot }).click();
  await expect(page).toHaveURL(/\/account\/reset$/);
  await expect(dialog).toBeHidden();
});

test('a number is taken once confirmed, and only then', async ({
  page,
  playwright,
}) => {
  const number = freshNumber();
  const kept = `+380${number}`;
  const first = unique();
  const second = unique();

  // Nobody confirmed the first, so the number goes on to whoever registers it next.
  await open(page, '/account');
  await register(page, uk, first, password, number);
  await expect(page.getByRole('status')).toContainText(first);
  await open(page, '/account');
  await register(page, uk, second, password, number);
  await expect(page.getByRole('status')).toContainText(second);
  expect(await column(first, 'phone')).toBeNull();
  expect(await column(second, 'phone')).toBe(kept);

  await open(
    page,
    `/account/verify?token=${await column(second, '_verificationtoken')}`,
  );
  await pressOnLetter(page, uk, second, password);
  await landedSignedIn(page, uk, '');
  await page.context().clearCookies();

  // Confirmed, it stays: at registration, nothing is made of the attempt.
  const third = unique();
  await open(page, '/account');
  await register(page, uk, third, password, number);
  await expect(
    registerForm(page, uk).getByLabel(uk.Account.phone),
  ).toHaveAccessibleDescription(uk.Account.errors.phoneTaken);
  expect(await column(third, 'id')).toBeUndefined();
  expect(await column(second, 'phone')).toBe(kept);

  // And in someone's account.
  await signedIn(page, uk, '');
  const profile = page.getByRole('region', { name: uk.Account.profile });
  await profile.getByLabel(uk.Account.phone).fill(kept);
  await profile.getByRole('button', { name: uk.Account.save }).click();
  await expect(
    profile.getByLabel(uk.Account.phone),
  ).toHaveAccessibleDescription(uk.Account.errors.phoneTaken);
  await expect(profile.getByLabel(uk.Account.phone)).toHaveValue(kept);

  // The owner changes or clears it in the admin, as sign-in looks it up.
  const manager = await playwright.request.newContext({
    baseURL: 'http://localhost:3200',
  });
  await manager.post('/api/users/login', { data: owner });
  const id = await column(second, 'id');
  const write = (phone: string) =>
    manager.patch(`/api/customers/${id}`, { data: { phone } });
  const typed = freshNumber();
  expect((await write(`0${typed}`)).status()).toBe(200);
  expect(await column(second, 'phone')).toBe(`+380${typed}`);
  expect((await write('not a number')).status()).toBe(400);
  expect(await column(second, 'phone')).toBe(`+380${typed}`);
  expect((await write('')).status()).toBe(200);
  expect(await column(second, 'phone')).toBeNull();
  // A write that does not name it keeps it: the other way round, in a clean row.
  expect((await write(`0${typed}`)).status()).toBe(200);
  expect(
    (
      await manager.patch(`/api/customers/${id}`, {
        data: { firstName: 'Лариса' },
      })
    ).status(),
  ).toBe(200);
  expect(await column(second, 'phone')).toBe(`+380${typed}`);
  await manager.dispose();
});

test('an account not confirmed answers by number as by email, and its letter takes the number', async ({
  page,
}) => {
  const email = unique();
  const number = freshNumber();
  await open(page, '/account');
  await register(page, uk, email, password, number);
  await expect(page.getByRole('status')).toContainText(email);

  await open(page, '/account');
  await fillByNumber(signInForm(page, uk), uk, number, password);
  await expect(signInForm(page, uk).getByRole('alert')).toHaveText(
    uk.Account.unverified,
  );

  await open(
    page,
    `/account/verify?token=${await column(email, '_verificationtoken')}`,
  );
  await fillByNumber(page.getByRole('main'), uk, number, password);
  await landedSignedIn(page, uk, '');
  expect(await column(email, '_verified')).toBe(true);
});

test('a closed dialog hands the focus back to what opened it', async ({
  page,
}) => {
  await open(page, '/');
  await pressAccount(page, uk);
  const dialog = page.getByRole('dialog', { name: uk.Account.signInTitle });
  await expect(dialog).toBeVisible();
  // Once it is gone, a sheet's own close cannot be what hands the focus back.
  await expect(page.locator('[data-slot="sheet-content"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // A phone's item went with the sheet.
  await expect(
    page.viewportSize()!.width < 640
      ? page.getByRole('button', { name: uk.Nav.menu })
      : page.getByRole('link', { name: uk.Nav.account }),
  ).toBeFocused();
});

test('another address closes the dialog: the header outlives the page', async ({
  page,
}) => {
  await open(page, '/brands');
  if (page.viewportSize()!.width < 640)
    await page.getByRole('button', { name: uk.Nav.menu }).click();
  await page.getByRole('link', { name: uk.Nav.about }).click();
  await expect(page).toHaveURL(/\/about$/);
  await pressAccount(page, uk);
  const dialog = page.getByRole('dialog', { name: uk.Account.signInTitle });
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/brands$/);
  await expect(dialog).toBeHidden();
});

test.describe('one number at once, on the real index', () => {
  test.beforeEach(({ page }) => {
    test.skip(
      page.viewportSize()!.width < 640,
      'The race is the server’s: one run of it is enough.',
    );
  });

  const tabs = async (browser: Browser, count: number) =>
    Promise.all(
      Array.from({ length: count }, async () =>
        (await browser.newContext()).newPage(),
      ),
    );

  test('registering: one holder, and nobody is told it failed', async ({
    browser,
  }) => {
    const number = freshNumber();
    const pages = await tabs(browser, 6);
    const emails = pages.map(() => unique());
    const buttons = await Promise.all(
      pages.map(async (tab, index) => {
        await open(tab, '/account');
        return fillRegister(tab, uk, emails[index], password, number);
      }),
    );
    await Promise.all(buttons.map((button) => button.click()));
    for (const tab of pages) {
      await expect(
        tab.getByRole('status').or(tab.getByText(uk.Account.errors.phoneTaken)),
      ).toBeVisible();
      await expect(tab.getByText(uk.Account.failed)).toHaveCount(0);
    }
    const holders = await Promise.all(
      emails.map((email) => column(email, 'phone')),
    );
    expect(holders.filter(Boolean)).toEqual([`+380${number}`]);
    await Promise.all(pages.map((tab) => tab.context().close()));
  });

  test('saving a profile: one keeps it, the others are told it is taken', async ({
    browser,
  }) => {
    const number = freshNumber();
    const pages = await tabs(browser, 4);
    const emails = [];
    for (const tab of pages) emails.push(await signedIn(tab, uk, ''));
    const profiles = pages.map((tab) =>
      tab.getByRole('region', { name: uk.Account.profile }),
    );
    await Promise.all(
      profiles.map((profile) =>
        profile.getByLabel(uk.Account.phone).fill(`0${number}`),
      ),
    );
    await Promise.all(
      profiles.map((profile) =>
        profile.getByRole('button', { name: uk.Account.save }).click(),
      ),
    );
    for (const [index, profile] of profiles.entries()) {
      await expect(
        profile
          .getByRole('status')
          .or(profile.getByText(uk.Account.errors.phoneTaken)),
      ).toBeVisible();
      await expect(pages[index].getByText(uk.Account.failed)).toHaveCount(0);
    }
    const holders = await Promise.all(
      emails.map((email) => column(email, 'phone')),
    );
    expect(holders.filter((held) => held === `+380${number}`)).toHaveLength(1);
    await Promise.all(pages.map((tab) => tab.context().close()));
  });
});

test('a link to the account opened in a new tab skips the dialog', async ({
  page,
  context,
}) => {
  test.skip(
    page.viewportSize()!.width < 640,
    'A phone has the link in the sheet.',
  );
  await open(page, '/');
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page
      .getByRole('link', { name: uk.Nav.account })
      .click({ modifiers: ['ControlOrMeta'] }),
  ]);
  await expect(tab).toHaveURL(/\/account$/);
  await expect(page.getByRole('dialog')).toBeHidden();
  await tab.close();
});

test('the owner signs in by email in the dialog and lands in the admin', async ({
  page,
}) => {
  await open(page, '/');
  await pressAccount(page, uk);
  await fillSignIn(page.getByRole('dialog'), uk, owner.email, owner.password);
  await expect(page).toHaveURL(/\/admin/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a password never reaches the address', async ({ page }) => {
    await page.goto('/account');
    await fillByNumber(signInForm(page, uk), uk, freshNumber(), password);
    await page.waitForLoadState();
    expect(page.url()).not.toContain('password');
  });

  test('the header’s link leads to the account', async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 640,
      'A phone has the link in the sheet, which needs JavaScript.',
    );
    await page.goto('/');
    await page.getByRole('link', { name: uk.Nav.account }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(signInForm(page, uk)).toBeVisible();
  });
});

test('the owner signs in through the same form and lands in the admin', async ({
  page,
}) => {
  await open(page, '/account');
  await pressSignIn(page, uk, owner.email, owner.password);
  await expect(page).toHaveURL(/\/admin/);
  await expect(
    page.getByRole('link', { name: 'Покупці', exact: true }),
  ).toBeAttached();
  const toStore = page.getByRole('link', { name: 'На сайт', exact: true });
  await expect(toStore).toBeVisible();
  await expect(toStore).toHaveAttribute('href', '/');

  // Staff have nothing at /account; the store's header shows the admin.
  await page.goto('/account');
  await expect(page).toHaveURL(/\/admin/);
  await open(page, '/');
  await expect(await adminLink(page, uk)).toBeVisible();
  const canvas = await page.goto('/canvas');
  expect(canvas?.status()).toBe(200);

  // The admin's own preferences still save.
  const preference = await page.request.post('/api/payload-preferences/e2e', {
    data: { value: 'kept' },
  });
  expect(preference.status()).toBe(200);
});

test('the admin keeps its own way in', async ({ page }) => {
  // A reset letter is asked for at the store's form.
  await page.goto('/admin/forgot');
  await expect(page).toHaveURL(/\/account\/reset$/);

  await open(page, '/admin/login');
  await page.locator('#field-email').fill(owner.email);
  await page.locator('#field-password').fill(owner.password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole('link', { name: 'Покупці', exact: true }),
  ).toBeAttached();
});

test('the owner deletes a shopper; their order stays', async ({
  browser,
  page,
}) => {
  const shopper = await browser.newContext({
    baseURL: 'http://localhost:3200',
  });
  const tab = await shopper.newPage();
  const email = await signedIn(tab, uk, '');
  await orderSerum(tab, uk, '');
  await tab.getByLabel(uk.Checkout.phone).fill('067 123 45 67');
  const order = await place(tab, uk);
  await shopper.close();

  await open(page, '/account');
  await pressSignIn(page, uk, owner.email, owner.password);
  await expect(page).toHaveURL(/\/admin/);
  const id = await column(email, 'id');
  // The cosmetologist reads, the owner deletes (tests/access.test.ts).
  const deleted = await page.request.delete(`/api/customers/${id}`);
  expect(deleted.status()).toBe(200);
  expect(await column(email, 'id')).toBeUndefined();
  expect(await buyer(order)).toBeNull();
});

test('a shopper gets nothing of the admin or of the staff', async ({
  page,
}) => {
  await signedIn(page, uk, '');

  // The header asks who is signed in, and Payload's answer to another collection's session is nobody.
  const [me] = await Promise.all([
    page.waitForResponse('**/api/users/me'),
    page.goto('/'),
  ]);
  expect((await me.json()).user).toBeNull();
  await expect(await adminLink(page, uk)).toHaveCount(0);

  // The admin and the owner's import lead back to the account; /canvas is not there for them.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/account$/);
  await expect(signOutButton(page, uk)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Покупці', exact: true }),
  ).toHaveCount(0);
  await page.goto('/admin/import');
  await expect(page).toHaveURL(/\/account$/);
  const canvas = await page.goto('/canvas');
  expect(canvas?.status()).toBe(404);

  // REST: closed outright.
  const { rows: drafted } = await database.query(
    "select id from products where slug = 'e2e-draft'",
  );
  for (const path of [
    '/api/users',
    '/api/consultation-requests',
    '/api/payload-locked-documents',
    '/api/search-misses',
    '/api/products/versions',
    `/api/products/versions/${drafted[0].id}`,
    '/api/payload-preferences/e2e',
  ]) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(403);
  }

  // Only what is theirs, and only what is published.
  const { rows } = await database.query(
    'select count(*)::int as count from orders where customer_id is null',
  );
  expect(rows[0].count).toBeGreaterThan(0);
  const orders = await (await page.request.get('/api/orders?limit=100')).json();
  expect(orders.docs).toEqual([]);
  const drafts = await (
    await page.request.get(
      '/api/products?draft=true&where[slug][equals]=e2e-draft',
    )
  ).json();
  expect(drafts.docs).toEqual([]);

  // Nothing is changed or made through the API.
  const { rows: other } = await database.query(
    'select id from orders where customer_id is null limit 1',
  );
  const change = await page.request.patch(`/api/orders/${other[0].id}`, {
    data: { status: 'cancelled' },
  });
  expect(change.status()).toBe(403);
  for (const [path, data] of [
    [
      '/api/customers',
      { email: unique(), password, firstName: 'A', lastName: 'B' },
    ],
    ['/api/customers/first-register', { email: unique(), password }],
    ['/api/customers/forgot-password', { email: unique() }],
    ['/api/customers/refresh-token', {}],
    ['/api/users/forgot-password', { email: owner.email }],
  ] as const) {
    const response = await page.request.post(path, { data });
    expect(response.status(), path).toBe(403);
  }
  const unlock = await page.request.post('/api/customers/unlock', {
    data: { email: unique() },
  });
  expect(unlock.status()).toBe(403);
  const stored = await page.request.post('/api/payload-preferences/e2e', {
    data: { value: 'x'.repeat(1000) },
  });
  expect(stored.status()).toBe(403);

  // GraphQL: the same rules, through the config its own route was given.
  for (const query of [
    '{ Users { docs { email } } }',
    '{ ConsultationRequests { docs { phone } } }',
    '{ PayloadLockedDocuments { docs { id } } }',
    '{ versionsProducts { docs { id } } }',
    `mutation { createPayloadLockedDocument(data: { globalSlug: "e2e" }) { id } }`,
    `mutation { deletePayloadLockedDocument(id: 1) { id } }`,
    `mutation { createPayloadPreference(data: { key: "e2e", value: "x" }) { id } }`,
  ]) {
    const graphql = await page.request.post('/api/graphql', {
      data: { query },
    });
    const { errors } = await graphql.json();
    expect(errors?.[0]?.extensions?.statusCode, query).toBe(403);
  }
});

// A phone gets the sheet and `lg` the word: between them the header holds a bare icon.
for (const [locale, m, prefix] of [
  ['uk', uk, ''],
  ['en', en, '/en'],
] as const) {
  test(`the store has no sideways scroll at 640 px (${locale})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await open(page, `${prefix}/`);
    await expect(page.getByRole('link', { name: m.Nav.account })).toBeVisible();
    const width = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(width).toBeLessThanOrEqual(640);
  });
}
