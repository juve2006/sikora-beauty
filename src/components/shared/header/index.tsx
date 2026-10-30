import { MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import AdminLink from './admin-link';
import LanguageSwitcher from './language-switcher';
import Logo from './logo';
import MainMenu from './main-menu';
import MobileMenu from './mobile-menu';
import ThemeToggle from './theme-toggle';
import { getMenu } from '@/lib/actions/category.actions';
import type { Config } from '@/payload-types';
import { Button } from '@/components/ui/button';

// Every storefront page's header, from (shop)/layout.tsx. Its menu is read from Payload, so a page
// under it is never prerendered at build (RULES.md). Search, favorites and the cart join it with
// their own roadmap items. On a desktop the menu has a row of its own: its five items and the
// buttons do not fit the page's width in one.
const SiteHeader = async ({ locale }: { locale: Config['locale'] }) => {
  const menu = await getMenu(locale);
  const consultation = await getTranslations('Consultation');
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-4 sm:gap-x-6 sm:px-6">
      <MobileMenu menu={menu} className="lg:hidden" />
      <Logo size="sm" />
      <MainMenu
        menu={menu}
        className="order-last -ml-2.5 basis-full max-lg:hidden"
      />
      <div className="ml-auto flex items-center gap-1">
        <AdminLink className="max-lg:hidden" />
        <ConsultationDialog>
          <Button variant="ghost" size="sm">
            <MessageCircle data-icon="inline-start" aria-hidden />
            {/* A phone's header keeps one line: the icon, named by the same word. */}
            <span className="max-sm:sr-only">{consultation('openShort')}</span>
          </Button>
        </ConsultationDialog>
        <div className="flex items-center gap-1 max-sm:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
