import ConsultationBlock from './consultation-block';
import Hero from './hero';
import ProductsBlock from './products-block';
import TextBlock from './text-block';
import Tiles from './tiles';
import type { Config } from '@/payload-types';
import type { PageBlock } from '@/types';

type Props = {
  title: string;
  description?: string;
  blocks: PageBlock[];
  locale: Config['locale'];
};

// A page's blocks in the admin's order, under the page's own heading unless a banner opens it.
const PageBlocks = ({ title, description, blocks, locale }: Props) => (
  <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
    {blocks[0]?.blockType !== 'hero' && (
      <div className="pt-10 sm:pt-16">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    )}
    {blocks.map((block, index) => {
      const key = block.id ?? index;
      switch (block.blockType) {
        case 'hero':
          return <Hero key={key} block={block} first={index === 0} />;
        case 'products':
          return <ProductsBlock key={key} block={block} locale={locale} />;
        case 'tiles':
          return <Tiles key={key} block={block} locale={locale} />;
        case 'consultation':
          return <ConsultationBlock key={key} block={block} />;
        case 'text':
          return <TextBlock key={key} block={block} />;
      }
    })}
  </main>
);

export default PageBlocks;
