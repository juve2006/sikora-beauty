import FooterContent from './footer-content';
import { getMenu } from '@/lib/actions/category.actions';
import { getContacts } from '@/lib/actions/contacts.actions';
import { isFinderOn } from '@/lib/actions/finder.actions';
import type { Config } from '@/payload-types';

// Every storefront page's footer, from (shop)/layout.tsx. The menu and the finder are the header's
// reads, cached per request, so the two never disagree.
const SiteFooter = async ({ locale }: { locale: Config['locale'] }) => {
  const [menu, finder, contacts] = await Promise.all([
    getMenu(locale),
    isFinderOn(),
    getContacts(locale),
  ]);
  return <FooterContent menu={menu} finder={finder} contacts={contacts} />;
};

export default SiteFooter;
