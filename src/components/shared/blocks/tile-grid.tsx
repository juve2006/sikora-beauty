import type { BlockOf } from '@/types';
import { Link } from '@/i18n/navigation';

const paths = { zones: 'catalog', concerns: 'concern', types: 'skin-type' };

type Props = {
  title: string;
  source: BlockOf<'tiles'>['source'];
  terms: { slug: string; title: string }[];
};

// A tiles block as it shows: a tile for each term, leading to its page in the catalog; three a row
// from sm, and from lg one row while they fit it — six zones need 828 px of lg's 896 — and as many
// as they need after.
const TileGrid = ({ title, source, terms }: Props) => (
  <section className="pt-8 pb-6">
    <h2 className="font-heading text-3xl tracking-tight lg:text-5xl">
      {title}
    </h2>
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
      {terms.map(({ slug, title }) => (
        <li key={slug}>
          <Link
            href={`/${paths[source]}/${slug}`}
            className="flex h-full min-h-20 items-end rounded-lg border bg-card p-4 font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {title}
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default TileGrid;
