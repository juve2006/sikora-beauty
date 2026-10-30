import { Brands } from './brands';
import { Categories } from './categories';
import { Media } from './media';
import { SkinConcerns, SkinConditions, SkinTypes } from './skin-vocabularies';
import { Products } from './products';
import { Users } from './users';

// Every Payload collection: payload.config.ts registers them, access.test.ts checks each states its
// own access.
export const collections = [
  Products,
  Categories,
  Brands,
  SkinTypes,
  SkinConditions,
  SkinConcerns,
  Media,
  Users,
];
