import { cn } from 'cn';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const sizes = {
  sm: 'text-xl',
  md: 'text-3xl',
};

type Props = {
  size?: keyof typeof sizes;
  className?: string;
};

// A two-weight wordmark: the brand's name, then its kind.
const Logo = ({ size = 'md', className }: Props) => {
  const t = useTranslations('Logo');

  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-baseline gap-[0.3em] rounded-sm leading-none tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        sizes[size],
        className,
      )}
    >
      <span className="font-semibold">{t('name')}</span>{' '}
      <span className="font-light text-muted-foreground">{t('kind')}</span>
    </Link>
  );
};

export default Logo;
