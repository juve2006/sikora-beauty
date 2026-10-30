import { useTranslations } from 'next-intl';
import { formatHryvnias } from '@/lib/utils';

// The price is integer kopiyky (RULES.md); it is formatted, never divided into a float.
const ProductPrice = ({
  price,
  className,
}: {
  price: number;
  className?: string;
}) => {
  const t = useTranslations('Product');
  return (
    <p className={className}>{t('price', { amount: formatHryvnias(price) })}</p>
  );
};

export default ProductPrice;
