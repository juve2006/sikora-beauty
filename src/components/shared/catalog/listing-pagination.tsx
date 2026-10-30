import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

const ListingPagination = ({
  page,
  pageCount,
  href,
}: {
  page: number;
  pageCount: number;
  href: (page: number) => string;
}) => {
  const t = useTranslations('Catalog');
  if (pageCount < 2) return null;
  const step = (to: number, label: string, icon: ReactNode) =>
    to < 1 || to > pageCount ? (
      <Button variant="outline" size="icon" disabled aria-label={label}>
        {icon}
      </Button>
    ) : (
      <Button asChild variant="outline" size="icon">
        <Link
          href={href(to)}
          aria-label={label}
          rel={to < page ? 'prev' : 'next'}
        >
          {icon}
        </Link>
      </Button>
    );
  return (
    <nav
      aria-label={t('pagination')}
      className="flex items-center justify-center gap-4"
    >
      {step(page - 1, t('previous'), <ChevronLeft />)}
      <span className="text-sm text-muted-foreground tabular-nums">
        {t('page', { page, pageCount })}
      </span>
      {step(page + 1, t('next'), <ChevronRight />)}
    </nav>
  );
};

export default ListingPagination;
