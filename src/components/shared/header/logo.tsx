import { cn } from 'cn';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { wordmark } from '@/lib/wordmark';

// A width, not a height: both shapes keep one line's width. The header's keeps it one line at 360 px,
// which holds up to 128 px; the footer's leaves the tagline legible.
const sizes = {
  sm: 'w-30 sm:w-44',
  md: 'w-80 sm:w-96',
};

type Props = {
  size?: keyof typeof sizes;
  withTagline?: boolean;
  className?: string;
};

// The wordmark (src/lib/wordmark.ts) in the text colour of wherever it stands.
const Logo = ({ size = 'md', withTagline = false, className }: Props) => {
  const t = useTranslations('Logo');
  const height = withTagline ? wordmark.height.tagline : wordmark.height.name;

  return (
    <Link
      href="/"
      aria-label={t('name')}
      className={cn(
        'inline-flex rounded-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${wordmark.width} ${height}`}
        width={wordmark.width}
        height={height}
        fill="currentColor"
        aria-hidden="true"
        className={cn('h-auto', sizes[size])}
      >
        <path fillRule="evenodd" d={wordmark.line} />
        {withTagline && (
          <path
            fillRule="evenodd"
            transform={wordmark.taglineAt}
            d={wordmark.tagline}
          />
        )}
      </svg>
    </Link>
  );
};

export default Logo;
