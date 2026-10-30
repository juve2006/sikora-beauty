import type { Access, FieldAccess, PayloadRequest } from 'payload';

// Who may do what, in the admin and through the API (adr-20261029-admin-roles). The owner runs the
// store; the cosmetologist fills in and publishes the catalog. Payload's default — any logged-in
// user may do anything — is never relied upon: every collection states its own access.

const owner = (user: PayloadRequest['user']) => user?.role === 'owner';

// Booleans, not `Access`: the users' `admin` access takes no query.
export const isOwner = ({ req: { user } }: { req: PayloadRequest }) =>
  owner(user);
export const hasRole = ({ req: { user } }: { req: PayloadRequest }) =>
  Boolean(user?.role);

// Users: the owner sees and edits everyone, anyone else only themselves.
export const ownerOrSelf: Access = ({ req: { user } }) =>
  owner(user) || (user ? { id: { equals: user.id } } : false);
// Nobody deletes themselves, so the store keeps an owner. A query, not a boolean: it holds when the
// owner deletes many users at once, too.
export const notSelf: Access = ({ req: { user } }) =>
  user && owner(user) ? { id: { not_equals: user.id } } : false;

export const ownerField: FieldAccess = ({ req: { user } }) => owner(user);
// Nobody changes their own role. The id may come from a URL as a string.
export const ownerNotSelf: FieldAccess = ({ req: { user }, id }) =>
  owner(user) && String(id) !== String(user?.id);

// The catalog: both roles create and edit; only the owner deletes — the cosmetologist unpublishes.
export const editors = { create: hasRole, update: hasRole, delete: isOwner };
