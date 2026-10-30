import { useTranslations } from 'next-intl';
import type { COLLECTIONS } from '@/lib/constants';
import type { CardProduct } from '@/types';
import ProductCard from '@/components/shared/product/product-card';
import { Link } from '@/i18n/navigation';

type Props = {
  title: string;
  collection: keyof typeof COLLECTIONS;
  products: { id: number; card: CardProduct }[];
};

// A products block as it shows: its title, a link to the whole collection and the cards.
const ProductGrid = ({ title, collection, products }: Props) => {
  const t = useTranslations('Page');
  return (
    <section className="py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <Link
          href={`/collection/${collection}`}
          className="shrink-0 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('all')}
        </Link>
      </div>
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
