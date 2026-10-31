import { cn } from 'cn';
import { useTranslations } from 'next-intl';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// A query that found nothing: what to try instead, and two ways on — the brands, or the
// cosmetologist.
const SearchEmpty = ({
  query,
  className,
}: {
  query: string;
  className?: string;
}) => {
  const t = useTranslations('Search');
  const consultation = useTranslations('Consultation');
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-dashed p-6',
        className,
      )}
    >
      <p className="font-medium">{t('empty', { query })}</p>
      <p className="max-w-prose text-muted-foreground">{t('emptyHint')}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/brands">{t('brands')}</Link>
        </Button>
        <ConsultationDialog>
          <Button size="sm">{consultation('productOpen')}</Button>
        </ConsultationDialog>
      </div>
    </div>
  );
};

export default SearchEmpty;
