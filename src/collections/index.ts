import { Brands, Categories, Media, SkinConcerns, SkinConditions, SkinTypes } from '../catalog/collections'
import { Products } from '../catalog/products'
import { Users } from './Users'

// Every Payload collection: payload.config.ts registers them, access.test.ts checks each states its
// own access.
export const collections = [Products, Categories, Brands, SkinTypes, SkinConditions, SkinConcerns, Media, Users]
