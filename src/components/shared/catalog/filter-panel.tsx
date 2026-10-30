'use client'

import { useTranslations } from 'next-intl'
import { useId, useOptimistic, useTransition } from 'react'

import { type Listing, listingSearch, type ListingParams, toggled } from '@/lib/listing'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Link, useRouter } from '@/i18n/navigation'

export type FilterProps = { facets: Listing['facets']; params: ListingParams; basePath: string }

// The list's filters as checkboxes. A click changes the URL and the server renders the new list;
// the box ticks at once, before the list arrives.
export function FilterPanel({ facets, params, basePath }: FilterProps) {
  const t = useTranslations('Catalog')
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [shown, setShown] = useOptimistic(params)
  // A phone has two panels in the page — the computer's, hidden, and the sheet's — so the boxes'
  // ids are the panel's own.
  const panel = useId()
  const chosen = facets.some((facet) => facet.values.some((value) => value.selected))

  const toggle = (key: Listing['facets'][number]['key'], slug: string) => {
    const change = { [key]: toggled(shown[key], slug) }
    startTransition(() => {
      setShown({ ...shown, ...change, page: 1 })
      router.push(`${basePath}${listingSearch(shown, change)}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {facets.map((facet) => (
        <fieldset key={facet.key} className="flex flex-col gap-1">
          <legend className="mb-2 font-medium">{t(`facets.${facet.key}`)}</legend>
          {facet.values.map((value) => {
            const id = `${panel}-${facet.key}-${value.slug}`
            return (
              <div key={value.slug} className="flex min-h-9 items-center gap-3">
                <Checkbox
                  id={id}
                  checked={shown[facet.key].includes(value.slug)}
                  onCheckedChange={() => toggle(facet.key, value.slug)}
                />
                <label htmlFor={id} className="flex flex-1 cursor-pointer items-baseline justify-between gap-2 py-1">
                  <span>{value.title}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{value.count}</span>
                </label>
              </div>
            )
          })}
        </fieldset>
      ))}
      {chosen && (
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={`${basePath}${listingSearch(params, { type: [], condition: [], concern: [], brand: [] })}`} scroll={false}>
            {t('reset')}
          </Link>
        </Button>
      )}
    </div>
  )
}
