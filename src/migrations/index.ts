import * as migration_20261028_131519_initial from './20261028_131519_initial';
import * as migration_20261028_185141_catalog from './20261028_185141_catalog';
import * as migration_20261029_094349_roles from './20261029_094349_roles';
import * as migration_20261030_100929_content_review from './20261030_100929_content_review';
import * as migration_20261030_111524_consultation_requests from './20261030_111524_consultation_requests';
import * as migration_20261030_124715_pages from './20261030_124715_pages';
import * as migration_20261031_141921_search from './20261031_141921_search';
import * as migration_20261101_053730_orders from './20261101_053730_orders';
import * as migration_20261101_111214_care_finder from './20261101_111214_care_finder';
import * as migration_20261102_182447_customer_accounts from './20261102_182447_customer_accounts';
import * as migration_20261103_110459_customer_phone from './20261103_110459_customer_phone';
import * as migration_20261103_170810_site_contacts from './20261103_170810_site_contacts';
import * as migration_20261103_201435_volume_unit_default from './20261103_201435_volume_unit_default';
import * as migration_20261104_115441_google_sign_in from './20261104_115441_google_sign_in';
import * as migration_20261106_093330_transfer_payment from './20261106_093330_transfer_payment';
import * as migration_20261106_121641_card_payment from './20261106_121641_card_payment';
import * as migration_20261109_142149_np_waybill from './20261109_142149_np_waybill';
import * as migration_20261112_084909_menu_item from './20261112_084909_menu_item';
import * as migration_20261112_095927_brand_logo from './20261112_095927_brand_logo';
import * as migration_20261112_134121_hero_subtitle from './20261112_134121_hero_subtitle';

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
    name: '20261101_111214_care_finder',
  },
  {
    up: migration_20261102_182447_customer_accounts.up,
    down: migration_20261102_182447_customer_accounts.down,
    name: '20261102_182447_customer_accounts',
  },
  {
    up: migration_20261103_110459_customer_phone.up,
    down: migration_20261103_110459_customer_phone.down,
    name: '20261103_110459_customer_phone',
  },
  {
    up: migration_20261103_170810_site_contacts.up,
    down: migration_20261103_170810_site_contacts.down,
    name: '20261103_170810_site_contacts',
  },
  {
    up: migration_20261103_201435_volume_unit_default.up,
    down: migration_20261103_201435_volume_unit_default.down,
    name: '20261103_201435_volume_unit_default',
  },
  {
    up: migration_20261104_115441_google_sign_in.up,
    down: migration_20261104_115441_google_sign_in.down,
    name: '20261104_115441_google_sign_in',
  },
  {
    up: migration_20261106_093330_transfer_payment.up,
    down: migration_20261106_093330_transfer_payment.down,
    name: '20261106_093330_transfer_payment',
  },
  {
    up: migration_20261106_121641_card_payment.up,
    down: migration_20261106_121641_card_payment.down,
    name: '20261106_121641_card_payment',
  },
  {
    up: migration_20261109_142149_np_waybill.up,
    down: migration_20261109_142149_np_waybill.down,
    name: '20261109_142149_np_waybill',
  },
  {
    up: migration_20261112_084909_menu_item.up,
    down: migration_20261112_084909_menu_item.down,
    name: '20261112_084909_menu_item',
  },
  {
    up: migration_20261112_095927_brand_logo.up,
    down: migration_20261112_095927_brand_logo.down,
    name: '20261112_095927_brand_logo',
  },
  {
    up: migration_20261112_134121_hero_subtitle.up,
    down: migration_20261112_134121_hero_subtitle.down,
    name: '20261112_134121_hero_subtitle'
  },
];
