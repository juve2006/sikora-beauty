import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { listingSearch } from '@/lib/listing';
import type {
  Listing as ListingResult,
  ListingParams,
  CardProduct,
} from '@/types';
import FilterPanel from './filter-panel';
import ListingEmpty from './listing-empty';
import ListingPagination from './listing-pagination';
import FiltersSheet from './filters-sheet';
import SortSelect from './sort-select';
import ProductCard from '@/components/shared/product/product-card';

// A catalog list's page below the header: its title — beside a brand's logo — the categories, the
// filters — at the side on a computer, in a sheet on a phone — the order, the products and the pages.
const Listing = ({
  title,
  above,
  logo,
  nav,
  result,
  params,
  basePath,
}: {
  title: string;
  above?: ReactNode;
  logo?: ReactNode;
  nav?: ReactNode;
  result: Omit<ListingResult, 'products'> & {
    products: { id: number; card: CardProduct }[];
  };
  params: ListingParams;
  basePath: string;
}) => {
  const t = useTranslations('Catalog');
  const filters = { facets: result.facets, params, basePath };
  const cleared = `${basePath}${listingSearch(params, { type: [], condition: [], concern: [], brand: [] })}`;
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6">
      <div className="flex items-center gap-4 pt-2 lg:pt-8">
        {logo && <div className="w-28 shrink-0 sm:w-40">{logo}</div>}
        <div className="flex flex-col gap-1">
          {above && (
            <div className="text-sm text-muted-foreground">{above}</div>
          )}
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          <p className="text-muted-foreground">
            {t('count', { count: result.total })}
          </p>
        </div>
      </div>
      {nav && <div className="mt-6">{nav}</div>}
      <div
        className={
          result.facets.length > 0
            ? 'mt-8 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10'
            : 'mt-8'
        }
      >
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
                  <FiltersSheet
                    {...filters}
                    total={result.total}
                    selected={result.selected}
                  />
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
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
              {result.products.map((product, index) => (
                <li key={product.id}>
                  <ProductCard product={product.card} eager={index < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <ListingEmpty
              resetHref={result.selected > 0 ? cleared : undefined}
            />
          )}
          <ListingPagination
            page={result.page}
            pageCount={result.pageCount}
            href={(page) => `${basePath}${listingSearch(params, { page })}`}
          />
        </div>
      </div>
    </main>
  );
};

export default Listing;
