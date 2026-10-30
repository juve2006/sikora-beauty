import ProductGrid from './product-grid';
import { COLLECTIONS } from '@/lib/constants';
import { getListingProducts } from '@/lib/actions/product.actions';
import type { Config } from '@/payload-types';
import type { BlockOf } from '@/types';

// A collection's newest products, as many as the block asks, and a link to all of them. A
// collection with no published product hides the block.
const ProductsBlock = async ({
  block,
  locale,
}: {
  block: BlockOf<'products'>;
  locale: Config['locale'];
}) => {
  const products = await getListingProducts(
    { [COLLECTIONS[block.collection]]: { equals: true } },
    locale,
  );
  if (products.length === 0) return null;
  const newest = products
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, block.limit);
  return (
    <ProductGrid
      title={block.title}
      collection={block.collection}
      products={newest}
    />
  );
};

export default ProductsBlock;
