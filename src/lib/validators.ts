import { z } from 'zod'

// The catalog's boundary: the admin's field validation and, later, the import check products with these.

export const availabilities = ['in_stock', 'made_to_order', 'out_of_stock'] as const
export const volumeUnits = ['ml', 'g', 'pcs'] as const
// For the admin and the owner's price list; the storefront translates units through messages/*.json.
export const volumeUnitLabels: Record<(typeof volumeUnits)[number], string> = { ml: 'мл', g: 'г', pcs: 'шт' }

export const kopiyky = z.number().int().min(0)
export const madeToOrderDays = z.number().int().min(1).max(90)

type Product = {
  availability?: string | null
  madeToOrderDays?: unknown
  inci?: string | null
  inciSource?: unknown
}

export const hasDaysIfMadeToOrder = (product: Product) =>
  product.availability !== 'made_to_order' || madeToOrderDays.safeParse(product.madeToOrderDays).success

// INCI is copied from a source, never generated: the source is recorded with it (RULES.md).
export const hasInciSource = (product: Product) =>
  !product.inci?.trim() || (typeof product.inciSource === 'string' && product.inciSource.trim() !== '')

export const productRules = z
  .object({
    price: kopiyky,
    availability: z.enum(availabilities),
    madeToOrderDays: madeToOrderDays.nullish(),
    inci: z.string().nullish(),
    inciSource: z.string().nullish(),
  })
  .superRefine((product, ctx) => {
    if (!hasDaysIfMadeToOrder(product)) {
      ctx.addIssue({ code: 'custom', path: ['madeToOrderDays'], message: 'days are required' })
    }
    if (!hasInciSource(product)) {
      ctx.addIssue({ code: 'custom', path: ['inciSource'], message: 'INCI needs its source' })
    }
  })

export type ProductRules = z.infer<typeof productRules>
