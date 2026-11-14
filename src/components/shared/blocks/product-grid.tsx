import { useTranslations } from 'next-intl';
import type { COLLECTIONS } from '@/lib/constants';
import type { CardProduct } from '@/types';
import BlockHeading from './block-heading';
import ProductCard from '@/components/shared/product/product-card';

type Props = {
  title: string;
  collection: keyof typeof COLLECTIONS;
  products: { id: number; card: CardProduct }[];
};

// A products block as it shows: its title, a link to the whole collection and the cards.
const ProductGrid = ({ title, collection, products }: Props) => {
  const t = useTranslations('Page');
  return (
    <section className="pt-8 pb-6">
      <BlockHeading
        title={title}
        href={`/collection/${collection}`}
        label={t(`allOf.${collection}`)}
      />
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product.card} />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ProductGrid;
