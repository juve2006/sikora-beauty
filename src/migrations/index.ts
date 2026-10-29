import * as migration_20261028_131519_initial from './20261028_131519_initial';
import * as migration_20261028_185141_catalog from './20261028_185141_catalog';
import * as migration_20261029_094349_roles from './20261029_094349_roles';

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
    name: '20261029_094349_roles'
  },
];
