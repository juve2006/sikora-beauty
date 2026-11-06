import {
  type Access,
  type CollectionConfig,
  type Endpoint,
  type Field,
  type FieldAccess,
  Forbidden,
} from 'payload';
import { describe, expect, it, vi } from 'vitest';

import { Brands } from '@/collections/brands';
import { Categories } from '@/collections/categories';
import { ConsultationRequests } from '@/collections/consultation-requests';
import { Customers, onlyThroughActions } from '@/collections/customers';
import { Media } from '@/collections/media';
import { Orders } from '@/collections/orders';
import { Pages } from '@/collections/pages';
import { SearchMisses } from '@/collections/search-misses';
import { SearchSynonyms } from '@/collections/search-synonyms';
import {
  SkinConcerns,
  SkinConditions,
  SkinTypes,
} from '@/collections/skin-vocabularies';
import { keepOnRestore, Products } from '@/collections/products';
import { collections } from '@/collections';
import { resetLetterThroughStore, Users } from '@/collections/users';
import { CareFinder } from '@/globals/care-finder';
import { Contacts } from '@/globals/contacts';
import { PaymentDetails } from '@/globals/payment-details';
import { closeOwnCollections, hasRole, isOwner, isStaff } from '@/lib/access';

const owner = { id: 1, collection: 'users', role: 'owner' };
const cosmetologist = { id: 2, collection: 'users', role: 'cosmetologist' };
// Each collection counts its ids from 1, so a shopper has someone's on staff (AC-5 of the task
// `customer-accounts`).
const shopper = { id: 1, collection: 'customers' };
const args = (user: object | null, id?: number | string) =>
  ({ req: { user }, id }) as never;
const run = (
  access: Access | FieldAccess | undefined,
  user: object | null,
  id?: number | string,
) => access!(args(user, id));

function field(fields: Field[], name: string): Field | undefined {
  for (const f of fields) {
    if ('name' in f && f.name === name) return f;
    const found = 'fields' in f ? field(f.fields, name) : undefined;
    if (found) return found;
  }
}
const fieldAccess = (fields: Field[], name: string) =>
  (field(fields, name) as { access: Record<string, FieldAccess> }).access;

describe('Payload’s own collections', () => {
  const handler = vi.fn(async () => Response.json({}));
  const config = () =>
    closeOwnCollections({
      collections: [
        { slug: 'payload-locked-documents', access: { read: () => true } },
        {
          slug: 'payload-preferences',
          access: {},
          endpoints: [{ handler, method: 'post', path: '/:key' }],
        },
      ],
    } as never);
  const access = (slug: string) =>
    config().collections.find((c) => c.slug === slug)!.access;

  it('keeps document locks to staff', () => {
    const locks = access('payload-locked-documents');
    for (const operation of ['create', 'read', 'update', 'delete'] as const) {
      expect(run(locks[operation], owner), operation).toBe(true);
      expect(run(locks[operation], cosmetologist), operation).toBe(true);
      expect(run(locks[operation], shopper), operation).toBe(false);
      expect(run(locks[operation], null), operation).toBe(false);
    }
  });

  it('keeps admin preferences to staff, whose endpoints write around access', async () => {
    expect(run(access('payload-preferences').create, owner)).toBe(true);
    expect(run(access('payload-preferences').create, shopper)).toBe(false);
    const preferences = config().collections.find(
      (c) => c.slug === 'payload-preferences',
    )!;
    const [endpoint] = preferences.endpoints as Endpoint[];
    expect(() =>
      endpoint.handler({ user: shopper, t: (key: string) => key } as never),
    ).toThrow(Forbidden);
    expect(handler).not.toHaveBeenCalled();
    await endpoint.handler({ user: owner } as never);
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('every collection', () => {
  it.each(
    collections.filter((c) => c.versions).map((c) => [c.slug, c] as const),
  )('%s keeps its versions to staff: a draft is one', (_, c) => {
    expect(run(c.access?.readVersions, owner)).toBe(true);
    expect(run(c.access?.readVersions, shopper)).toBe(false);
    expect(run(c.access?.readVersions, null)).toBe(false);
  });

  it.each(collections.map((c) => [c.slug, c] as const))(
    '%s states its own create, update and delete access',
    (_, c) => {
      for (const operation of ['create', 'update', 'delete'] as const)
        expect(c.access?.[operation]).toBeTypeOf('function');
    },
  );
});

describe('catalog', () => {
  it.each(
    [
      Products,
      Categories,
      Brands,
      SkinTypes,
      SkinConditions,
      SkinConcerns,
      Media,
      Pages,
    ].map((c) => [c.slug, c] as const),
  )(
    '%s: both roles create and edit, only the owner deletes',
    (_, { access }) => {
      for (const operation of ['create', 'update'] as const) {
        expect([
          run(access![operation], owner),
          run(access![operation], cosmetologist),
          run(access![operation], null),
        ]).toEqual([true, true, false]);
      }
      expect([
        run(access!.delete, owner),
        run(access!.delete, cosmetologist),
        run(access!.delete, null),
      ]).toEqual([true, false, false]);
    },
  );

  it.each(['price', 'availability', 'madeToOrderDays'])(
    'the owner alone sets %s',
    (name) => {
      const access = fieldAccess(Products.fields, name);
      for (const operation of ['create', 'update'] as const) {
        expect([
          run(access[operation], owner),
          run(access[operation], cosmetologist),
        ]).toEqual([true, false]);
      }
    },
  );

  // A restore drops what the role may not set and does not put it back (review F1). The products'
  // first hook, before the fields run: the days' condition reads availability (review F4).
  it('a restore keeps the current price, availability and days the role could not set', () => {
    const [first] = Products.hooks!.beforeChange!;
    const originalDoc = {
      price: 89000,
      availability: 'made_to_order',
      madeToOrderDays: 7,
    };
    const restore = (data: object, isRestoringVersion = true) =>
      first({
        data,
        originalDoc,
        req: { context: { isRestoringVersion } },
      } as never);
    expect(first).toBe(keepOnRestore);
    expect(restore({ name: 'Крем' })).toEqual({ name: 'Крем', ...originalDoc });
    expect(
      restore({
        price: 50000,
        availability: 'in_stock',
        madeToOrderDays: null,
      }),
    ).toEqual({
      price: 50000,
      availability: 'in_stock',
      madeToOrderDays: null,
    });
    expect(restore({ name: 'Крем' }, false)).toEqual({ name: 'Крем' });
  });

  it('anonymous visitors read published products only', () => {
    expect(run(Products.access!.read, null)).toEqual({
      _status: { equals: 'published' },
    });
    expect(run(Products.access!.read, cosmetologist)).toBe(true);
  });
});

// Shoppers' names and phones (AC-10…AC-12 of the task `consultation-request`).
describe('consultation requests', () => {
  const { access } = ConsultationRequests;
  const roles = (operation: 'read' | 'create' | 'update' | 'delete') => [
    run(access![operation], owner),
    run(access![operation], cosmetologist),
    run(access![operation], null),
  ];

  it('only a role reads and changes them', () => {
    expect(roles('read')).toEqual([true, true, false]);
    expect(roles('update')).toEqual([true, true, false]);
  });

  it('nobody creates one through the API: the server action does', () => {
    expect(roles('create')).toEqual([false, false, false]);
  });

  it.each(['name', 'phone', 'message', 'product', 'finderAnswers', 'locale'])(
    'nobody changes the %s the shopper sent, only the status',
    (name) => {
      const { update } = fieldAccess(ConsultationRequests.fields, name) ?? {};
      expect([run(update, owner), run(update, cosmetologist)]).toEqual([
        false,
        false,
      ]);
    },
  );

  it('only the owner deletes one', () => {
    expect(roles('delete')).toEqual([true, false, false]);
  });
});

// Shoppers' orders (AC-12 of the task `cart-and-checkout`).
describe('orders', () => {
  const { access } = Orders;
  const roles = (operation: 'read' | 'create' | 'update' | 'delete') => [
    run(access![operation], owner),
    run(access![operation], cosmetologist),
    run(access![operation], null),
  ];

  it('only a role reads and changes them', () => {
    expect(roles('read')).toEqual([true, true, false]);
    expect(roles('update')).toEqual([true, true, false]);
  });

  it('nobody creates one through the API: the server action does', () => {
    expect(roles('create')).toEqual([false, false, false]);
  });

  it.each([
    'lines',
    'total',
    'firstName',
    'lastName',
    'phone',
    'settlement',
    'warehouse',
    'settlementRef',
    'warehouseRef',
    'payment',
    'comment',
    'locale',
  ])('nobody changes the %s of the order, only its status and note', (name) => {
    const { update } = fieldAccess(Orders.fields, name) ?? {};
    expect([run(update, owner), run(update, cosmetologist)]).toEqual([
      false,
      false,
    ]);
  });

  it('nobody changes whose order it is', () => {
    const { update } = fieldAccess(Orders.fields, 'customer');
    expect([run(update, owner), run(update, cosmetologist)]).toEqual([
      false,
      false,
    ]);
  });

  it('a role changes the status and the note, and only a role reads the note', () => {
    expect(
      (field(Orders.fields, 'status') as { access?: unknown }).access,
    ).toBeUndefined();
    const { read, update } = fieldAccess(Orders.fields, 'managerNote');
    expect(update).toBeUndefined();
    expect([
      run(read, owner),
      run(read, cosmetologist),
      run(read, shopper),
      run(read, null),
    ]).toEqual([true, true, false, false]);
  });

  it('a role marks it paid', () => {
    expect(
      (field(Orders.fields, 'paymentStatus') as { access?: unknown }).access,
    ).toBeUndefined();
  });

  // The thank-you page's secret: REST and GraphQL read it for nobody, staff included.
  it('nobody reads or changes the secret the thank-you page finds it by', () => {
    const { read, update } = fieldAccess(Orders.fields, 'returnToken');
    for (const access of [read, update])
      expect(
        [owner, cosmetologist, shopper, null].map((user) => run(access, user)),
      ).toEqual([false, false, false, false]);
  });

  it('only the owner deletes one', () => {
    expect(roles('delete')).toEqual([true, false, false]);
  });
});

// AC-07 of the task `search`.
describe('search', () => {
  const roles = (
    { access }: CollectionConfig,
    operation: 'read' | 'create' | 'update' | 'delete',
  ) => [
    run(access![operation], owner),
    run(access![operation], cosmetologist),
    run(access![operation], null),
  ];

  it('both roles keep the synonyms, which search reads for anyone', () => {
    for (const operation of ['create', 'update', 'delete'] as const)
      expect(roles(SearchSynonyms, operation)).toEqual([true, true, false]);
    expect(roles(SearchSynonyms, 'read')).toEqual([true, true, true]);
  });

  it('both roles read and clear the misses, which only the search page writes', () => {
    for (const operation of ['read', 'delete'] as const)
      expect(roles(SearchMisses, operation)).toEqual([true, true, false]);
    for (const operation of ['create', 'update'] as const)
      expect(roles(SearchMisses, operation)).toEqual([false, false, false]);
  });
});

describe.each([
  ['the care finder', CareFinder],
  ['the contacts', Contacts],
])('%s', (_, global) => {
  it('both roles keep it, which the storefront reads for anyone', () => {
    const { read, update } = global.access!;
    expect([owner, cosmetologist, null].map((user) => run(read, user))).toEqual(
      [true, true, true],
    );
    expect(
      [owner, cosmetologist, null].map((user) => run(update, user)),
    ).toEqual([true, true, false]);
  });
});

// Where shoppers send money: a cosmetologist's account taken over must not redirect it.
describe('the payment details', () => {
  it('only the owner changes them, which the thank-you page reads for anyone', () => {
    const { read, update } = PaymentDetails.access!;
    expect([owner, cosmetologist, null].map((user) => run(read, user))).toEqual(
      [true, true, true],
    );
    expect(
      [owner, cosmetologist, null].map((user) => run(update, user)),
    ).toEqual([true, false, false]);
  });
});

describe('users', () => {
  const { access } = Users;

  // REST's forgot-password has no access rule, no Turnstile, and each request holds a pool client.
  it.each(['REST', 'GraphQL'])('refuses %s forgotPassword', (payloadAPI) => {
    expect(() =>
      resetLetterThroughStore({
        args: {},
        operation: 'forgotPassword',
        req: { payloadAPI, t: (key: string) => key },
      } as never),
    ).toThrow(Forbidden);
  });

  it.each([
    ['local', 'forgotPassword'],
    ['REST', 'login'],
    ['REST', 'refresh'],
    ['REST', 'resetPassword'],
    ['REST', 'create'],
  ])('lets %s %s through', (payloadAPI, operation) => {
    const args = { keep: true };
    expect(
      resetLetterThroughStore({
        args,
        operation,
        req: { payloadAPI },
      } as never),
    ).toBe(args);
  });

  it('a role opens the admin', () => {
    expect([
      run(access!.admin, owner),
      run(access!.admin, cosmetologist),
      run(access!.admin, { id: 3, collection: 'users' }),
    ]).toEqual([true, true, false]);
  });

  it('the owner reads and edits everyone, the cosmetologist herself', () => {
    for (const operation of ['read', 'update'] as const) {
      expect(run(access![operation], owner)).toBe(true);
      expect(run(access![operation], cosmetologist)).toEqual({
        id: { equals: 2 },
      });
      expect(run(access![operation], null)).toBe(false);
    }
  });

  it('only the owner creates users, and deletes anyone but himself', () => {
    expect([
      run(access!.create, owner),
      run(access!.create, cosmetologist),
    ]).toEqual([true, false]);
    expect(run(access!.delete, owner)).toEqual({ id: { not_equals: 1 } });
    expect([
      run(access!.delete, cosmetologist),
      run(access!.delete, null),
    ]).toEqual([false, false]);
  });

  it('only the owner sets roles, and never his own', () => {
    const role = fieldAccess(Users.fields, 'role');
    expect([run(role.create, owner), run(role.create, cosmetologist)]).toEqual([
      true,
      false,
    ]);
    expect([run(role.update, owner, 2), run(role.update, owner, '2')]).toEqual([
      true,
      true,
    ]);
    expect([
      run(role.update, owner, 1),
      run(role.update, owner, '1'),
      run(role.update, cosmetologist, 2),
    ]).toEqual([false, false, false]);
  });
});

// A shopper's session is a Payload session too, and a shopper's id is someone's on staff: being
// signed in opens nothing (AC-5 and AC-8 of the task `customer-accounts`).
describe('a shopper', () => {
  it.each(collections.map((c) => [c.slug, c] as const))(
    'creates, changes and deletes nothing in %s',
    (_, { access }) => {
      for (const operation of ['create', 'update', 'delete'] as const)
        expect(run(access![operation], shopper)).toBe(false);
    },
  );

  it.each([
    ['users', Users],
    ['consultation-requests', ConsultationRequests],
    ['search-misses', SearchMisses],
  ] as const)('reads nothing of %s', (_, { access }) => {
    expect(run(access!.read, shopper)).toBe(false);
  });

  it('reads published products only, as anyone', () => {
    expect(run(Products.access!.read, shopper)).toEqual({
      _status: { equals: 'published' },
    });
  });

  it('reads only their own orders', () => {
    expect(run(Orders.access!.read, shopper)).toEqual({
      customer: { equals: 1 },
    });
  });

  it('reads only themselves among the shoppers', () => {
    expect(run(Customers.access!.read, shopper)).toEqual({
      id: { equals: 1 },
    });
  });

  it('opens no admin and passes no staff rule', () => {
    expect(run(Users.access!.admin, shopper)).toBe(false);
    expect(run(Customers.access!.admin, shopper)).toBe(false);
    expect(run(Users.access!.unlock, shopper)).toBe(false);
    expect(run(CareFinder.access!.update, shopper)).toBe(false);
    expect(run(Contacts.access!.update, shopper)).toBe(false);
    const role = fieldAccess(Users.fields, 'role');
    expect(run(role.create, shopper)).toBe(false);
    expect(run(role.update, shopper, 2)).toBe(false);
    const price = fieldAccess(Products.fields, 'price');
    expect(run(price.update, shopper)).toBe(false);
  });

  it('counts as staff nowhere, whatever a forged role says', () => {
    const forged = { ...shopper, role: 'owner' };
    expect(isStaff(forged as never)).toBe(false);
    expect(hasRole(args(forged))).toBe(false);
    expect(isOwner(args(forged))).toBe(false);
  });
});

describe('customers', () => {
  const { access } = Customers;
  const roles = (operation: 'read' | 'create' | 'update' | 'delete') => [
    run(access![operation], owner),
    run(access![operation], cosmetologist),
    run(access![operation], null),
  ];

  it('both roles read them, only the owner changes and deletes them', () => {
    expect(roles('read')).toEqual([true, true, false]);
    expect(roles('update')).toEqual([true, false, false]);
    expect(roles('delete')).toEqual([true, false, false]);
    expect(run(access!.unlock, owner)).toBe(true);
    expect(run(access!.unlock, cosmetologist)).toBe(false);
  });

  it('nobody creates one through the API: the server action does', () => {
    expect(roles('create')).toEqual([false, false, false]);
  });

  it('nobody opens the admin as a shopper', () => {
    expect(run(access!.admin, owner)).toBe(false);
  });

  // first-register would make a verified account on an empty table, past Turnstile and the letter;
  // forgot-password would send letters past Turnstile; reset-password would take a password Zod refuses;
  // refresh would write an old copy of the sessions back.
  it.each([
    ['REST', 'create'],
    ['GraphQL', 'create'],
    ['REST', 'forgotPassword'],
    ['GraphQL', 'forgotPassword'],
    ['REST', 'resetPassword'],
    ['GraphQL', 'resetPassword'],
    ['REST', 'refresh'],
    ['GraphQL', 'refresh'],
  ])('refuses %s %s', (payloadAPI, operation) => {
    expect(() =>
      onlyThroughActions({
        args: {},
        operation,
        req: { payloadAPI, t: (key: string) => key },
      } as never),
    ).toThrow(Forbidden);
  });

  it.each([
    ['local', 'create'],
    ['local', 'forgotPassword'],
    ['local', 'resetPassword'],
    ['REST', 'login'],
    ['REST', 'update'],
  ])('lets %s %s through', (payloadAPI, operation) => {
    const args = { keep: true };
    expect(
      onlyThroughActions({
        args,
        operation,
        req: { payloadAPI },
      } as never),
    ).toBe(args);
  });
});
