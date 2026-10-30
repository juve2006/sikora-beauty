import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type Term = { slug?: string | null; title: string };

// A zone's categories as links, the current one marked; the filters go along, the page does not.
const CategoryNav = ({
  zone,
  categories,
  current,
  search,
}: {
  zone: Term;
  categories: Term[];
  current: string;
  search: string;
}) => {
  const t = useTranslations('Catalog');
  const links = [{ slug: zone.slug, title: t('all') }, ...categories];
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {links.map(({ slug, title }) => (
        <li key={slug} className="shrink-0">
          <Button
            asChild
            variant={slug === current ? 'default' : 'outline'}
            size="sm"
          >
            <Link
              href={`/catalog/${slug}${search}`}
              aria-current={slug === current ? 'page' : undefined}
            >
              {title}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
};

export default CategoryNav;
