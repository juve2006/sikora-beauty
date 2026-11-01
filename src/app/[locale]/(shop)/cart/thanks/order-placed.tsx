import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// The thanks for an order: its number when the address has one, and what happens next.
const OrderPlaced = ({ number }: { number?: number }) => {
  const t = useTranslations('Checkout');
  const c = useTranslations('Cart');
  return (
    <>
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {t('thanks')} {number ? t('placed', { number }) : t('placedNoNumber')}
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        {t('placedText')}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/brands">{c('brands')}</Link>
      </Button>
    </>
  );
};

export default OrderPlaced;
