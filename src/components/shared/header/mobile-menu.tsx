'use client';

import { cn } from 'cn';
import { ChevronDown, Menu as MenuIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, type ReactNode, useRef, useState } from 'react';
import AdminLink from './admin-link';
import LanguageSwitcher from './language-switcher';
import ThemeToggle from './theme-toggle';
import AccountDialog from '@/components/shared/account/account-dialog';
import { useAccountEntry } from '@/components/shared/account/use-account-entry';
import { COLLECTIONS, SHOW_CONCERNS_AND_COLLECTIONS } from '@/lib/constants';
import type { Menu } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';

const collections = Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[];

const row =
  'flex w-full items-center justify-between rounded-md px-3 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50';

// A link closes the sheet: a client navigation keeps the header, and the sheet with it.
const MenuLink = ({
  href,
  className,
  prefetch,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  prefetch?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  children: string;
}) => (
  <li>
    <SheetClose asChild>
      <Link
        href={href}
        className={cn(row, className)}
        prefetch={prefetch}
        onClick={onClick}
      >
        {children}
      </Link>
    </SheetClose>
  </li>
);

// A section opens in place, without a script of its own.
const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <li>
    <details className="group">
      <summary
        className={cn(
          row,
          'cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden',
        )}
      >
        {title}
        <ChevronDown
          className="size-4 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="pb-2 pl-3">{children}</ul>
    </details>
  </li>
);

// The main menu below md, on a phone: the same sections as MainMenu, in a sheet from the left; the
// consultation stays a button in the header instead. Below sm the language and the theme move here
// from the header, which keeps one line at 360 px. The account's
// dialog stands outside the sheet, which closes as it opens, so the focus comes back to the menu's
// button; and the sheet is closed by hand there, as `SheetClose` leaves it open after the click's
// `preventDefault`.
const MobileMenu = ({
  menu,
  finder = false,
  className,
}: {
  menu: Menu;
  // The care finder is on: MainMenu's item, here too.
  finder?: boolean;
  className?: string;
}) => {
  const t = useTranslations('Nav');
  const catalog = useTranslations('Catalog');
  const [sheet, setSheet] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { open, setOpen, onCloseAutoFocus, onClick } =
    useAccountEntry(menuButton);
  return (
    <>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetTrigger asChild>
          <Button
            ref={menuButton}
            variant="ghost"
            size="icon"
            className={className}
          >
            <MenuIcon />
            <span className="sr-only">{t('menu')}</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          closeLabel={t('close')}
          aria-describedby={undefined}
        >
          <SheetHeader className="pb-0">
            <SheetTitle>{t('menu')}</SheetTitle>
          </SheetHeader>
          <nav aria-label={t('label')} className="overflow-y-auto px-2 pb-4">
            <ul>
              <Section title={t('catalog')}>
                {menu.zones.map((zone) => (
                  <li key={zone.slug}>
                    <ul>
                      <MenuLink
                        href={`/catalog/${zone.slug}`}
                        className="font-medium"
                      >
                        {zone.title}
                      </MenuLink>
                      {zone.categories.map((category) => (
                        <MenuLink
                          key={category.slug}
                          href={`/catalog/${category.slug}`}
                          className="text-muted-foreground"
                        >
                          {category.title}
                        </MenuLink>
                      ))}
                    </ul>
                  </li>
                ))}
              </Section>
              {SHOW_CONCERNS_AND_COLLECTIONS && (
                <Section title={t('concerns')}>
                  {menu.concerns.map((concern) => (
                    <MenuLink
                      key={concern.slug}
                      href={`/concern/${concern.slug}`}
                    >
                      {concern.title}
                    </MenuLink>
                  ))}
                </Section>
              )}
              <MenuLink href="/brands" className="font-medium">
                {t('brands')}
              </MenuLink>
              {menu.zones
                .filter(({ menuItem }) => menuItem)
                .map((zone) =>
                  zone.categories.length > 0 ? (
                    <Section key={zone.slug} title={zone.title}>
                      <MenuLink
                        href={`/catalog/${zone.slug}`}
                        className="font-medium"
                      >
                        {zone.title}
                      </MenuLink>
                      {zone.categories.map((category) => (
                        <MenuLink
                          key={category.slug}
                          href={`/catalog/${category.slug}`}
                          className="text-muted-foreground"
                        >
                          {category.title}
                        </MenuLink>
                      ))}
                    </Section>
                  ) : (
                    <MenuLink
                      key={zone.slug}
                      href={`/catalog/${zone.slug}`}
                      className="font-medium"
                    >
                      {zone.title}
                    </MenuLink>
                  ),
                )}
              {finder && (
                <MenuLink href="/care-finder" className="font-medium">
                  {t('finder')}
                </MenuLink>
              )}
              {SHOW_CONCERNS_AND_COLLECTIONS && (
                <Section title={t('collections')}>
                  {collections.map((slug) => (
                    <MenuLink key={slug} href={`/collection/${slug}`}>
                      {catalog(`collections.${slug}`)}
                    </MenuLink>
                  ))}
                </Section>
              )}
              <MenuLink href="/about" className="font-medium">
                {t('about')}
              </MenuLink>
              <MenuLink href="/blog" className="font-medium">
                {t('blog')}
              </MenuLink>
              <MenuLink
                href="/account"
                className="font-medium"
                prefetch={false}
                onClick={(event) => {
                  setSheet(false);
                  onClick(event);
                }}
              >
                {t('account')}
              </MenuLink>
            </ul>
            <AdminLink className="mt-2 w-full justify-start" />
          </nav>
          <SheetFooter className="flex-row items-center justify-between border-t sm:hidden">
            <LanguageSwitcher />
            <ThemeToggle />
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AccountDialog
        open={open}
        onOpenChange={setOpen}
        onCloseAutoFocus={onCloseAutoFocus}
      />
    </>
  );
};

export default MobileMenu;
