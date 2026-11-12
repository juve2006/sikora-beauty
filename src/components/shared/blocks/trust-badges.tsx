import { cn } from 'cn';
import { Gem, Heart, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

const items = [
  ['curated', Gem],
  ['original', ShieldCheck],
  ['brands', Heart],
] as const;

// The store's three promises under a banner's button, as the client's mockup has them. Three of them
// keep one row at 360 px.
const TrustBadges = ({ className }: { className?: string }) => {
  const t = useTranslations('Hero.trust');
  return (
    <ul className={cn('flex divide-x', className)}>
      {items.map(([key, Icon]) => (
        <li
          key={key}
          className="flex w-26 flex-col items-center gap-2 px-2 text-center text-xs text-balance text-muted-foreground sm:w-36 sm:px-4 sm:text-sm"
        >
          <Icon className="size-5" aria-hidden />
          {t(key)}
        </li>
      ))}
    </ul>
  );
};

export default TrustBadges;
