import { useTranslations } from 'next-intl';
import BlockHeading from './block-heading';
import BrandTile from '@/components/shared/brand/brand-tile';
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
    <section className="pt-8 pb-6">
      <BlockHeading title={title} href="/brands" label={t('allBrands')} />
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
