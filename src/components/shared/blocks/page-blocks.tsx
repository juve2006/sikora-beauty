import BrandsBlock from './brands-block';
import ConsultationBlock from './consultation-block';
import Hero from './hero';
import type { ReactNode } from 'react';
import HeroSlider from './hero-slider';
import PostsBlock from './posts-block';
import ProductsBlock from './products-block';
import TextBlock from './text-block';
import Tiles from './tiles';
import { groupBanners } from '@/lib/blocks';
import type { Config } from '@/payload-types';
import type { PageBlock } from '@/types';

type Props = {
  title: string;
  description?: string;
  blocks: PageBlock[];
  locale: Config['locale'];
  // Under the heading, with it: a post's day and cover. A post keeps its heading over a banner.
  children?: ReactNode;
};

// A page's blocks in the admin's order, under the page's own heading unless a banner opens it and
// is the page's h1; banners in a row are one slider.
const PageBlocks = ({
  title,
  description,
  blocks,
  locale,
  children,
}: Props) => {
  const heading = children !== undefined || blocks[0]?.blockType !== 'hero';
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 sm:px-6 lg:px-16">
      {heading && (
        <div className="pt-10 sm:pt-16">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
      {groupBanners(blocks).map((block, index) => {
        if (Array.isArray(block)) {
          // Banners take the column's whole width, past its padding.
          const slides = block.map((banner, slide) => (
            <Hero
              key={banner.id ?? slide}
              block={banner}
              first={!heading && index === 0 && slide === 0}
            />
          ));
          return (
            <div
              key={block[0].id ?? index}
              className="-mx-4 sm:-mx-6 lg:-mx-16"
            >
              {slides.length > 1 ? <HeroSlider slides={slides} /> : slides}
            </div>
          );
        }
        const key = block.id ?? index;
        switch (block.blockType) {
          case 'products':
            return <ProductsBlock key={key} block={block} locale={locale} />;
          case 'tiles':
            return <Tiles key={key} block={block} locale={locale} />;
          case 'brands':
            return <BrandsBlock key={key} block={block} locale={locale} />;
          case 'posts':
            return <PostsBlock key={key} block={block} locale={locale} />;
          case 'consultation':
            return <ConsultationBlock key={key} block={block} />;
          case 'text':
            return <TextBlock key={key} block={block} />;
        }
      })}
    </main>
  );
};

export default PageBlocks;
