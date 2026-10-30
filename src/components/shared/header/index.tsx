import { useTranslations } from 'next-intl';
import LanguageSwitcher from './language-switcher';
import Logo from './logo';
import ThemeToggle from './theme-toggle';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// The zones are three and fixed (src/db/seed-data.ts), so the header names them without the
// database, and a page built without one — the home page, `next build` in CI — can show it.
// ponytail: a new zone needs a deploy; read them from Payload when zones start changing.
const zones = ['face', 'body', 'hair'] as const;

// Until the roadmap item `header, home and about` brings search, favorites and the cart.
const SiteHeader = () => {
  const t = useTranslations('Nav');
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:flex-nowrap sm:px-6">
      <Logo size="sm" />
      <nav
        aria-label={t('label')}
        className="order-last -mx-3 w-full sm:order-none sm:mx-0 sm:w-auto sm:flex-1"
      >
        <ul className="flex">
          {zones.map((zone) => (
            <li key={zone}>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/catalog/${zone}`}>{t(zone)}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
};

export default SiteHeader;
