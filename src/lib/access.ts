import {
  type Access,
  type FieldAccess,
  Forbidden,
  type PayloadRequest,
  type SanitizedConfig,
} from 'payload';

// Who may do what, in the admin and through the API (adr-20261029-admin-roles). The owner runs the
// store; the cosmetologist fills in and publishes the catalog. Payload's default — any logged-in
// user may do anything — is never relied upon: every collection states its own access.
//
// A shopper's session is a Payload session too (adr-20261103-customer-accounts), and their id is
// someone's on staff: being signed in says nothing, so every rule first asks which collection the
// user comes from.

type User = PayloadRequest['user'];

// The owner or the cosmetologist; a shopper never is.
export const isStaff = (user: User) =>
  user?.collection === 'users' && Boolean(user.role);
const owner = (user: User) =>
  user?.collection === 'users' && user.role === 'owner';

// Booleans, not `Access`: the users' `admin` access takes no query.
export const isOwner = ({ req: { user } }: { req: PayloadRequest }) =>
  owner(user);
export const hasRole = ({ req: { user } }: { req: PayloadRequest }) =>
  isStaff(user);
// Nobody, through the API or the admin: a consultation request is created only by its server
// action, after Zod and Turnstile, with the Local API's access skipped.
export const nobody = () => false;

// Users: the owner sees and edits everyone, anyone else on staff only themselves.
export const ownerOrSelf: Access = ({ req: { user } }) =>
  owner(user) || (isStaff(user) ? { id: { equals: user?.id } } : false);
// Nobody deletes themselves, so the store keeps an owner. A query, not a boolean: it holds when the
// owner deletes many users at once, too.
export const notSelf: Access = ({ req: { user } }) =>
  owner(user) ? { id: { not_equals: user?.id } } : false;
// Customers: staff read everyone, a shopper only themselves.
export const staffOrSelf: Access = ({ req: { user } }) =>
  isStaff(user) ||
  (user?.collection === 'customers' ? { id: { equals: user.id } } : false);
// Orders: staff read everything, a shopper only what they ordered signed in.
export const staffOrBuyer: Access = ({ req: { user } }) =>
  isStaff(user) ||
  (user?.collection === 'customers'
    ? { customer: { equals: user.id } }
    : false);

export const ownerField: FieldAccess = ({ req: { user } }) => owner(user);
// Nobody changes their own role. The id may come from a URL as a string.
export const ownerNotSelf: FieldAccess = ({ req: { user }, id }) =>
  owner(user) && String(id) !== String(user?.id);

// Payload adds its own collections after the plugins, open to any session: a shopper would read and
// clear who is editing what, and store whatever they like as an admin preference. Closed in the
// config, not in `onInit`, which reaches only the copy of the config that woke the process: GraphQL
// builds its schema from its own. The preferences' endpoints write around access, so they are closed
// as well.
export const closeOwnCollections = (config: SanitizedConfig) => {
  for (const collection of config.collections) {
    if (collection.slug === 'payload-locked-documents')
      Object.assign(collection.access, {
        create: hasRole,
        read: hasRole,
        update: hasRole,
        delete: hasRole,
      });
    if (collection.slug === 'payload-preferences') {
      collection.access.create = hasRole;
      collection.endpoints =
        collection.endpoints &&
        collection.endpoints.map((endpoint) => ({
          ...endpoint,
          handler: (req) => {
            if (!isStaff(req.user)) throw new Forbidden(req.t);
            return endpoint.handler(req);
          },
        }));
    }
  }
  return config;
};

// The catalog: both roles create and edit; only the owner deletes — the cosmetologist unpublishes.
export const editors = { create: hasRole, update: hasRole, delete: isOwner };
