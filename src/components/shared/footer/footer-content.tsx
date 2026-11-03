import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import Logo from '@/components/shared/header/logo';
import { Link } from '@/i18n/navigation';
import { phone as dialable } from '@/lib/validators';
import type { Contact } from '@/payload-types';
import type { Menu } from '@/types';

const linkStyle =
  'rounded-sm outline-none hover:text-primary-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

const FooterLink = (props: ComponentProps<typeof Link>) => (
  <li>
    <Link {...props} className={`inline-block py-1 ${linkStyle}`} />
  </li>
);

const Column = ({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={className}>
    <h2 className="mb-3 font-medium text-primary-foreground">{title}</h2>
    <ul className="text-sm">{children}</ul>
  </div>
);

const ContactRow = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <li className="flex items-start gap-2 py-1">
    <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>
    <span className="min-w-0 break-words whitespace-pre-line">{children}</span>
  </li>
);

// lucide has no brand marks; it takes the text's colour, like the icons beside it.
const InstagramMark = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </svg>
);

// A solid block in the primary colour, in both themes. It renames the tokens for what is inside, so
// `Logo` and every focus ring stay readable on it without a variant of their own.
const FooterContent = ({
  menu,
  finder = false,
  contacts,
}: {
  menu: Menu;
  // The care finder is on: the catalog's column offers it, as the header does.
  finder?: boolean;
  contacts: Pick<
    Contact,
    'phone' | 'email' | 'instagram' | 'hours' | 'address'
  >;
}) => {
  const t = useTranslations('Footer');
  const nav = useTranslations('Nav');
  const favorites = useTranslations('Favorites');
  const cart = useTranslations('Cart');
  const { phone, email, instagram } = contacts;
  // The two fields without a check of their own: the admin saves spaces in them.
  const hours = contacts.hours?.trim();
  const address = contacts.address?.trim();
  const anyContact = phone || email || instagram || hours || address;
  return (
    <footer className="mt-auto w-full bg-primary text-primary-foreground/80 [--foreground:var(--primary-foreground)] [--muted-foreground:var(--primary-foreground)] [--ring:var(--primary-foreground)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Logo />
        <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-3">
          <Column title={nav('catalog')}>
            {menu.zones.map((zone) => (
              <FooterLink key={zone.slug} href={`/catalog/${zone.slug}`}>
                {zone.title}
              </FooterLink>
            ))}
            <FooterLink href="/brands">{nav('brands')}</FooterLink>
            {finder && (
              <FooterLink href="/care-finder">{nav('finder')}</FooterLink>
            )}
          </Column>
          <Column title={t('shoppers')}>
            <FooterLink href="/about">{nav('about')}</FooterLink>
            <FooterLink href="/account" prefetch={false}>
              {nav('account')}
            </FooterLink>
            <FooterLink href="/favorites">{favorites('title')}</FooterLink>
            <FooterLink href="/cart">{cart('title')}</FooterLink>
          </Column>
          {anyContact && (
            <Column title={t('contacts')} className="col-span-2 lg:col-span-1">
              {phone && (
                <ContactRow icon={<Phone aria-hidden />}>
                  <a
                    href={`tel:${dialable.safeParse(phone).data ?? phone}`}
                    className={linkStyle}
                  >
                    {phone}
                  </a>
                </ContactRow>
              )}
              {email && (
                <ContactRow icon={<Mail aria-hidden />}>
                  <a href={`mailto:${email}`} className={linkStyle}>
                    {email}
                  </a>
                </ContactRow>
              )}
              {instagram && (
                <ContactRow icon={<InstagramMark />}>
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noreferrer"
                    className={linkStyle}
                  >
                    {t('instagram')}
                  </a>
                </ContactRow>
              )}
              {hours && (
                <ContactRow icon={<Clock aria-hidden />}>{hours}</ContactRow>
              )}
              {address && (
                <ContactRow icon={<MapPin aria-hidden />}>{address}</ContactRow>
              )}
            </Column>
          )}
        </div>
        {/* On a phone the way back up sits in this corner, so the line ends above it. */}
        <p className="mt-10 border-t border-primary-foreground/20 pt-6 text-sm max-sm:pb-12">
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
};

export default FooterContent;
