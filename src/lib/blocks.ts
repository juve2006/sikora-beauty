import type { BlockOf, PageBlock } from '@/types';

// A page's blocks in their order, every run of banners in a row gathered into one list: a run is one
// slider (HeroSlider), a single banner a list of one.
export const groupBanners = (blocks: PageBlock[]) =>
  blocks.reduce<(PageBlock | BlockOf<'hero'>[])[]>((groups, block) => {
    const last = groups.at(-1);
    if (block.blockType !== 'hero') groups.push(block);
    else if (Array.isArray(last)) last.push(block);
    else groups.push([block]);
    return groups;
  }, []);
