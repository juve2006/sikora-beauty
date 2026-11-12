import { describe, expect, it } from 'vitest';
import { groupBanners } from '@/lib/blocks';
import type { PageBlock } from '@/types';

const hero = (id: string): PageBlock => ({ id, blockType: 'hero', title: id });
const text = (id: string): PageBlock => ({
  id,
  blockType: 'text',
  title: id,
  text: id,
});

describe('groupBanners', () => {
  it('gathers banners in a row into one slider and leaves the other blocks as they are', () => {
    const groups = groupBanners([
      hero('a'),
      hero('b'),
      hero('c'),
      text('t'),
      hero('d'),
    ]);
    expect(
      groups.map((group) =>
        Array.isArray(group) ? group.map(({ id }) => id) : group.id,
      ),
    ).toEqual([['a', 'b', 'c'], 't', ['d']]);
  });

  it('keeps a page without banners as it is', () => {
    expect(groupBanners([text('t'), text('u')])).toEqual([
      text('t'),
      text('u'),
    ]);
    expect(groupBanners([])).toEqual([]);
  });
});
