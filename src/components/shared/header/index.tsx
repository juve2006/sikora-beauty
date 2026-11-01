import { MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import SearchDialog from '@/components/shared/search/search-dialog';
import AdminLink from './admin-link';
import CartLink from './cart-link';
import FavoritesLink from './favorites-link';
import LanguageSwitcher from './language-switcher';
import Logo from './logo';
import MainMenu from './main-menu';
import MobileMenu from './mobile-menu';
import ThemeToggle from './theme-toggle';
import { getMenu } from '@/lib/actions/category.actions';
import type { Config } from '@/payload-types';
import { Button } from '@/components/ui/button';

// Every storefront page's header, from (shop)/layout.tsx. Its menu is read from Payload, so a page
// under it is never prerendered at build (RULES.md).
// On a desktop the menu has a row of its own: its five items and the buttons do not fit the page's
// width in one. On a phone the buttons are icons 32 px square, below the 36 px the others keep: four
// of them beside the logo fit one line at 360 px only so (task `cart-and-checkout`).
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
      <div className="ml-auto flex items-center gap-1 max-sm:*:size-8">
        <AdminLink className="max-lg:hidden" />
        <FavoritesLink />
        <SearchDialog />
        <ConsultationDialog>
          <Button variant="ghost" size="sm">
            <MessageCircle data-icon="inline-start" aria-hidden />
            {/* A phone's header keeps one line: the icon, named by the same word. */}
            <span className="max-sm:sr-only">{consultation('openShort')}</span>
          </Button>
        </ConsultationDialog>
        <CartLink />
        <div className="flex items-center gap-1 max-sm:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
