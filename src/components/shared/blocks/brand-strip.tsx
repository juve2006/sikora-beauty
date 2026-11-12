import { useTranslations } from 'next-intl';
import BrandTile from '@/components/shared/brand/brand-tile';
import { Link } from '@/i18n/navigation';
import type { BrandList } from '@/types';

// A brands block as it shows: its title, a link to every brand and one row of tiles, which scrolls
// sideways once they outgrow the column.
const BrandStrip = ({
  title,
  brands,
}: {
  title: string;
  brands: BrandList;
}) => {
  const t = useTranslations('Page');
  return (
    <section className="py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <Link
          href="/brands"
          className="shrink-0 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('allBrands')}
        </Link>
      </div>
      <ul className="mt-6 flex snap-x gap-3 overflow-x-auto pb-2">
        {brands.map((brand) => (
          <li key={brand.slug} className="w-40 shrink-0 snap-start sm:w-48">
            <BrandTile
              title={brand.title}
              logo={brand.logo}
              href={`/brand/${brand.slug}`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default BrandStrip;
