import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Nothing in the zone yet, or nothing these filters leave — then a way back.
const ListingEmpty = ({ resetHref }: { resetHref?: string }) => {
  const t = useTranslations('Catalog');
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-6">
      <p className="text-muted-foreground">
        {resetHref ? t('emptyFiltered') : t('empty')}
      </p>
      {resetHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={resetHref}>{t('reset')}</Link>
        </Button>
      )}
    </div>
  );
};

export default ListingEmpty;
