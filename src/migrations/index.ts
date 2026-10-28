import * as migration_20261028_131519_initial from './20261028_131519_initial';

export const migrations = [
  {
    up: migration_20261028_131519_initial.up,
    down: migration_20261028_131519_initial.down,
    name: '20261028_131519_initial'
  },
];
