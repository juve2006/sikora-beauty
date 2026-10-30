import TileGrid from './tile-grid';
import { getFacets, getMenu } from '@/lib/actions/category.actions';
import type { Config } from '@/payload-types';
import type { BlockOf } from '@/types';

// A way into the catalog: the zones, the skin concerns or the skin types, as the admin orders them.
const Tiles = async ({
  block,
  locale,
}: {
  block: BlockOf<'tiles'>;
  locale: Config['locale'];
}) => {
  const terms =
    block.source === 'types'
      ? ((await getFacets(locale)).find(({ key }) => key === 'type')?.values ??
        [])
      : (await getMenu(locale))[block.source];
  if (terms.length === 0) return null;
  return <TileGrid title={block.title} source={block.source} terms={terms} />;
};

export default Tiles;
