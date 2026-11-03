import { useTranslations } from 'next-intl';
import { COLLECTIONS } from '@/lib/constants';
import type { Menu } from '@/types';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Link } from '@/i18n/navigation';

const collections = Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[];

const MenuLink = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: string;
}) => (
  <NavigationMenuLink asChild className={className}>
    <Link href={href}>{children}</Link>
  </NavigationMenuLink>
);

// The main menu from lg up: the catalog's zones with their categories, the skin concerns and the
// collections open as panels; brands, the care finder when it is on, and the about page are links.
// Below lg it is MobileMenu.
const MainMenu = ({
  menu,
  finder = false,
  className,
}: {
  menu: Menu;
  // The care finder is on: its item stands between the brands and the collections.
  finder?: boolean;
  className?: string;
}) => {
  const t = useTranslations('Nav');
  const catalog = useTranslations('Catalog');
  return (
    <NavigationMenu aria-label={t('label')} className={className}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t('catalog')}</NavigationMenuTrigger>
          {/* The header does not scroll away, so in a low window the longest panel scrolls itself. */}
          <NavigationMenuContent className="max-h-[calc(100dvh-7rem)] overflow-y-auto">
            <ul className="grid w-2xl grid-cols-3 gap-4 p-2">
              {menu.zones.map((zone) => (
                <li key={zone.slug}>
                  <MenuLink
                    href={`/catalog/${zone.slug}`}
                    className="font-medium"
                  >
                    {zone.title}
                  </MenuLink>
                  <ul>
                    {zone.categories.map((category) => (
                      <li key={category.slug}>
                        <MenuLink
                          href={`/catalog/${category.slug}`}
                          className="text-muted-foreground"
                        >
                          {category.title}
                        </MenuLink>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t('concerns')}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-md grid-cols-2 p-2">
              {menu.concerns.map((concern) => (
                <li key={concern.slug}>
                  <MenuLink href={`/concern/${concern.slug}`}>
                    {concern.title}
                  </MenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <MenuLink href="/brands" className={navigationMenuTriggerStyle()}>
            {t('brands')}
          </MenuLink>
        </NavigationMenuItem>
        {finder && (
          <NavigationMenuItem>
            <MenuLink
              href="/care-finder"
              className={navigationMenuTriggerStyle()}
            >
              {t('finder')}
            </MenuLink>
          </NavigationMenuItem>
        )}
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t('collections')}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-56 p-2">
              {collections.map((slug) => (
                <li key={slug}>
                  <MenuLink href={`/collection/${slug}`}>
                    {catalog(`collections.${slug}`)}
                  </MenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <MenuLink href="/about" className={navigationMenuTriggerStyle()}>
            {t('about')}
          </MenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default MainMenu;
