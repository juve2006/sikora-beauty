import { ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { Button } from '@/components/ui/button'

// Disabled until the roadmap item `cart and checkout`: the page already has its final layout.
export function AddToCart() {
  const t = useTranslations('Product')
  const hint = useId()
  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" disabled aria-describedby={hint} className="w-full sm:w-fit">
        <ShoppingBag data-icon="inline-start" aria-hidden />
        {t('addToCart')}
      </Button>
      <p id={hint} className="text-sm text-muted-foreground">
        {t('cartSoon')}
      </p>
    </div>
  )
}
