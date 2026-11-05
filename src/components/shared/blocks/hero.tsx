import Image from 'next/image';
import Paragraphs from './paragraphs';
import { photos } from '@/lib/product-page';
import { internalPath } from '@/lib/validators';
import type { BlockOf } from '@/types';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// A page's opening: the page's h1 when it comes first, a text, a button to a page of this store,
// and a photo beside them — under them on a phone.
const Hero = ({ block, first }: { block: BlockOf<'hero'>; first: boolean }) => {
  const Heading = first ? 'h1' : 'h2';
  const [photo] = photos(block.image ? [block.image] : []);
  // Checked on save; checked again, as an href.
  const link = internalPath.safeParse(block.buttonLink).data;
  return (
    <section className="grid items-center gap-8 py-10 sm:py-16 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col items-start gap-6">
        <Heading className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          {block.title}
        </Heading>
        {block.text && (
          <Paragraphs
            text={block.text}
            className="max-w-xl text-lg text-muted-foreground"
          />
        )}
        {link && block.buttonLabel && (
          <Button asChild size="lg">
            <Link href={link}>{block.buttonLabel}</Link>
          </Button>
        )}
      </div>
      {photo && (
        <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            priority={first}
            sizes="(min-width: 1024px) 680px, 100vw"
            className="object-cover"
          />
        </div>
      )}
    </section>
  );
};

export default Hero;
