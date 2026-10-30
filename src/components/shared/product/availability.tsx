import { Check, Clock, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import type { Product } from '@/payload-types'

const icons = { in_stock: Check, made_to_order: Clock, out_of_stock: X }

type Props = Pick<Product, 'availability' | 'madeToOrderDays'>

export function Availability({ availability, madeToOrderDays }: Props) {
  const t = useTranslations('Product.availability')
  const Icon = icons[availability]
  return (
    // "Made to order, ships in 3 days" wraps in a narrow card instead of running out of it.
    <Badge
      variant={availability === 'out_of_stock' ? 'outline' : 'secondary'}
      className="h-auto min-h-5 whitespace-normal"
    >
      <Icon data-icon="inline-start" aria-hidden />
      {t(availability, { days: madeToOrderDays ?? 0 })}
    </Badge>
  )
}
