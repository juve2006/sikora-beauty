import { Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './language-switcher';
import ThemeToggle from './theme-toggle';
import { FREE_DELIVERY_FROM } from '@/lib/constants';
import { formatHryvnias } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

// The header's olive strip (`.top-bar` in globals.css), as the client's mockup has it: the free
// delivery and the promotions on the left, the languages and the theme on the right. On a phone the
// last two stay at the bottom of the menu's sheet, so the strip keeps one line at 360 px.
// «Акції» is the page with the slug `promotions`, which the owner writes in the admin.
const TopBar = () => {
  const t = useTranslations('TopBar');
  return (
    <div className="top-bar bg-background text-foreground">
      <div className="mx-auto flex min-h-9 w-full max-w-page items-center gap-3 px-4 text-xs sm:px-6 lg:px-16 sm:text-sm">
        <p className="flex items-center gap-2">
          <Truck className="size-4 shrink-0" aria-hidden />
          {t('freeDelivery', { amount: formatHryvnias(FREE_DELIVERY_FROM) })}
        </p>
        <span aria-hidden className="h-4 w-px bg-foreground/40" />
        <Link
          href="/promotions"
          className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('promotions')}
        </Link>
        <div className="ml-auto flex items-center gap-1 max-sm:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
