import BrandStrip from './brand-strip';
import { getBrands } from '@/lib/actions/category.actions';
import type { Config } from '@/payload-types';
import type { BlockOf } from '@/types';

// The brands a shopper can buy, as a strip of their tiles; with none the block is not shown.
const BrandsBlock = async ({
  block,
  locale,
}: {
  block: BlockOf<'brands'>;
  locale: Config['locale'];
}) => {
  const brands = await getBrands(locale);
  if (brands.length === 0) return null;
  return <BrandStrip title={block.title} brands={brands} />;
};

export default BrandsBlock;
