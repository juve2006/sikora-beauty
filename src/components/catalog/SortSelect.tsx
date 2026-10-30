'use client'

import { useTranslations } from 'next-intl'

import { listingSearch, type ListingParams, type Sort, sorts } from '@/catalog/listing'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from '@/i18n/navigation'

export function SortSelect({ params, basePath }: { params: ListingParams; basePath: string }) {
  const t = useTranslations('Catalog')
  const router = useRouter()
  return (
    <Select
      value={params.sort ?? 'default'}
      onValueChange={(value) => {
        const sort = value === 'default' ? undefined : (value as Sort)
        router.push(`${basePath}${listingSearch(params, { sort })}`, { scroll: false })
      }}
    >
      <SelectTrigger aria-label={t('sort')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {(['default', ...sorts] as const).map((sort) => (
          <SelectItem key={sort} value={sort}>
            {t(`sorts.${sort}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
