import * as migration_20261028_131519_initial from './20261028_131519_initial';
import * as migration_20261028_185141_catalog from './20261028_185141_catalog';
import * as migration_20261029_094349_roles from './20261029_094349_roles';
import * as migration_20261030_100929_content_review from './20261030_100929_content_review';
import * as migration_20261030_111524_consultation_requests from './20261030_111524_consultation_requests';
import * as migration_20261030_124715_pages from './20261030_124715_pages';
import * as migration_20261031_141921_search from './20261031_141921_search';
import * as migration_20261101_053730_orders from './20261101_053730_orders';
import * as migration_20261101_111214_care_finder from './20261101_111214_care_finder';

export const migrations = [
  {
    up: migration_20261028_131519_initial.up,
    down: migration_20261028_131519_initial.down,
    name: '20261028_131519_initial',
  },
  {
    up: migration_20261028_185141_catalog.up,
    down: migration_20261028_185141_catalog.down,
    name: '20261028_185141_catalog',
  },
  {
    up: migration_20261029_094349_roles.up,
    down: migration_20261029_094349_roles.down,
    name: '20261029_094349_roles',
  },
  {
    up: migration_20261030_100929_content_review.up,
    down: migration_20261030_100929_content_review.down,
    name: '20261030_100929_content_review',
  },
  {
    up: migration_20261030_111524_consultation_requests.up,
    down: migration_20261030_111524_consultation_requests.down,
    name: '20261030_111524_consultation_requests',
  },
  {
    up: migration_20261030_124715_pages.up,
    down: migration_20261030_124715_pages.down,
    name: '20261030_124715_pages',
  },
  {
    up: migration_20261031_141921_search.up,
    down: migration_20261031_141921_search.down,
    name: '20261031_141921_search',
  },
  {
    up: migration_20261101_053730_orders.up,
    down: migration_20261101_053730_orders.down,
    name: '20261101_053730_orders',
  },
  {
    up: migration_20261101_111214_care_finder.up,
    down: migration_20261101_111214_care_finder.down,
    name: '20261101_111214_care_finder'
  },
];
