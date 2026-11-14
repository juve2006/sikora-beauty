import { MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import SearchDialog from '@/components/shared/search/search-dialog';
import AccountLink from './account-link';
import AdminLink from './admin-link';
import CartLink from './cart-link';
import FavoritesLink from './favorites-link';
import Logo from './logo';
import MainMenu from './main-menu';
import MobileMenu from './mobile-menu';
import TopBar from './top-bar';
import { getMenu } from '@/lib/actions/category.actions';
import { isFinderOn } from '@/lib/actions/finder.actions';
import type { Config } from '@/payload-types';
import { Button } from '@/components/ui/button';

// Every storefront page's header, from (shop)/layout.tsx. Its menu is read from Payload, so a page
// under it is never prerendered at build (RULES.md).
// The client's olive strip on top (TopBar), then the page's colours: the logo, the menu and the icons
// in one row from xl, as the client's mockup has it; from md to xl the menu takes a row of its own, as
// it and the buttons do not fit 976 px in one. Below md, on a phone, the menu is the burger's sheet.
// The consultation is in the menu from md, a button here below it. The icons stand in the mockup's
// order: search, favorites, the account, the cart. The care finder's item comes from the finder
// itself, not from the catalog's menu. On a phone the buttons are icons 32 px square, below the 36 px
// the others keep: four of them beside the logo fit one line at 360 px only so (task
// `cart-and-checkout`).
// It stays on the screen as a page scrolls, whole, under the dialogs' z-50; `scroll-pt` in globals.css
// keeps what the keyboard focuses out from under it.
const SiteHeader = async ({ locale }: { locale: Config['locale'] }) => {
  const [menu, finder] = await Promise.all([getMenu(locale), isFinderOn()]);
  const consultation = await getTranslations('Consultation');
  return (
    <header className="sticky top-0 z-40 border-b bg-background text-foreground">
      <TopBar />
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-2 gap-y-2 px-4 py-4 sm:gap-x-6 sm:px-6 lg:px-16 xl:py-6">
        <MobileMenu menu={menu} finder={finder} className="md:hidden" />
        <Logo size="sm" />
        <MainMenu
          menu={menu}
          finder={finder}
          className="order-last -ml-2.5 basis-full max-md:hidden xl:order-none xl:mx-auto xl:basis-auto"
        />
        <div className="ml-auto flex items-center gap-1 max-sm:*:size-8 xl:ml-0 xl:gap-4">
          <AdminLink className="max-md:hidden" />
          <ConsultationDialog>
            <Button variant="ghost" size="sm" className="md:hidden">
              <MessageCircle data-icon="inline-start" aria-hidden />
              {/* The icon alone, as the others; the word names it. */}
              <span className="sr-only">{consultation('openShort')}</span>
            </Button>
          </ConsultationDialog>
          <SearchDialog />
          <FavoritesLink />
          <AccountLink />
          <CartLink />
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
