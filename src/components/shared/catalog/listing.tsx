import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { type Listing as ListingResult, listingSearch, type ListingParams } from '@/lib/listing'
import { FilterPanel } from './filter-panel'
import { FiltersSheet } from './filters-sheet'
import { SortSelect } from './sort-select'
import { type CardProduct, ProductCard } from '@/components/shared/product/product-card'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

type Term = { slug?: string | null; title: string }

// A zone's categories as links, the current one marked; the filters go along, the page does not.
export function CategoryNav({
  zone,
  categories,
  current,
  search,
}: {
  zone: Term
  categories: Term[]
  current: string
  search: string
}) {
  const t = useTranslations('Catalog')
  const links = [{ slug: zone.slug, title: t('all') }, ...categories]
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {links.map(({ slug, title }) => (
        <li key={slug} className="shrink-0">
          <Button asChild variant={slug === current ? 'default' : 'outline'} size="sm">
            <Link href={`/catalog/${slug}${search}`} aria-current={slug === current ? 'page' : undefined}>
              {title}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function ListingPagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  const t = useTranslations('Catalog')
  if (pageCount < 2) return null
  const step = (to: number, label: string, icon: ReactNode) =>
    to < 1 || to > pageCount ? (
      <Button variant="outline" size="icon" disabled aria-label={label}>
        {icon}
      </Button>
    ) : (
      <Button asChild variant="outline" size="icon">
        <Link href={href(to)} aria-label={label} rel={to < page ? 'prev' : 'next'}>
          {icon}
        </Link>
      </Button>
    )
  return (
    <nav aria-label={t('pagination')} className="flex items-center justify-center gap-4">
      {step(page - 1, t('previous'), <ChevronLeft />)}
      <span className="text-sm text-muted-foreground tabular-nums">{t('page', { page, pageCount })}</span>
      {step(page + 1, t('next'), <ChevronRight />)}
    </nav>
  )
}

// Nothing in the zone yet, or nothing these filters leave — then a way back.
export function ListingEmpty({ resetHref }: { resetHref?: string }) {
  const t = useTranslations('Catalog')
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-6">
      <p className="text-muted-foreground">{resetHref ? t('emptyFiltered') : t('empty')}</p>
      {resetHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={resetHref}>{t('reset')}</Link>
        </Button>
      )}
    </div>
  )
}

// A catalog list's page below the header: its title, the categories, the filters — at the side on
// a computer, in a sheet on a phone — the order, the products and the pages.
export function Listing({
  title,
  above,
  nav,
  result,
  params,
  basePath,
}: {
  title: string
  above?: ReactNode
  nav?: ReactNode
  result: Omit<ListingResult, 'products'> & { products: { id: number; card: CardProduct }[] }
  params: ListingParams
  basePath: string
}) {
  const t = useTranslations('Catalog')
  const filters = { facets: result.facets, params, basePath }
  const cleared = `${basePath}${listingSearch(params, { type: [], condition: [], concern: [], brand: [] })}`
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <div className="flex flex-col gap-1 pt-2 lg:pt-8">
        {above && <div className="text-sm text-muted-foreground">{above}</div>}
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{t('count', { count: result.total })}</p>
      </div>
      {nav && <div className="mt-6">{nav}</div>}
      <div className={result.facets.length > 0 ? 'mt-8 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10' : 'mt-8'}>
        {result.facets.length > 0 && (
          <aside className="hidden lg:block">
            <FilterPanel {...filters} />
          </aside>
        )}
        <div className="flex flex-col gap-6">
          {(result.facets.length > 0 || result.total > 1) && (
            <div className="flex items-center justify-between gap-3">
              {result.facets.length > 0 && (
                <div className="lg:hidden">
                  <FiltersSheet {...filters} total={result.total} selected={result.selected} />
                </div>
              )}
              {result.total > 1 && (
                <div className="ml-auto">
                  <SortSelect params={params} basePath={basePath} />
                </div>
              )}
            </div>
          )}
          {result.products.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {result.products.map((product, index) => (
                <li key={product.id}>
                  <ProductCard product={product.card} eager={index < 3} />
                </li>
              ))}
            </ul>
          ) : (
            <ListingEmpty resetHref={result.selected > 0 ? cleared : undefined} />
          )}
          <ListingPagination
            page={result.page}
            pageCount={result.pageCount}
            href={(page) => `${basePath}${listingSearch(params, { page })}`}
          />
        </div>
      </div>
    </main>
  )
}
