import { Brands } from './brands';
import { Categories } from './categories';
import { ConsultationRequests } from './consultation-requests';
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
  ConsultationRequests,
  Users,
];
