import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Paragraphs from './paragraphs';
import TrustBadges from './trust-badges';
import { photos } from '@/lib/product-page';
import { internalPath } from '@/lib/validators';
import type { BlockOf } from '@/types';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// A page's opening, as the client's mockup has it: the photo across the column behind the text, which
// stands on its left over a fade of the page's colour, so any photo keeps it legible in both themes;
// the page's h1 when it comes first, a subtitle, a text, a button to a page of this store and the
// store's three promises. Without a photo it stands on the muted surface.
const Hero = ({ block, first }: { block: BlockOf<'hero'>; first: boolean }) => {
  const Heading = first ? 'h1' : 'h2';
  const [photo] = photos(block.image ? [block.image] : []);
  // Checked on save; checked again, as an href.
  const link = internalPath.safeParse(block.buttonLink).data;
  return (
    <section className="relative isolate flex min-h-104 items-center overflow-hidden bg-muted">
      {photo && (
        <>
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            priority={first}
            sizes="(min-width: 1440px) 1440px, 100vw"
            className="-z-10 object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-r from-background/85 via-background/70 to-background/30 sm:via-background/60 sm:to-transparent"
          />
        </>
      )}
      <div className="flex w-full flex-col items-start gap-4 px-4 py-12 sm:px-10 sm:py-16 lg:px-16">
        <Heading className="max-w-2xl font-heading text-5xl leading-none tracking-tight text-balance text-primary sm:text-6xl lg:text-7xl">
          {block.title}
        </Heading>
        {block.subtitle && (
          <p className="max-w-xl text-xl text-balance sm:text-2xl">
            {block.subtitle}
          </p>
        )}
        {block.text && (
          <Paragraphs
            text={block.text}
            className="max-w-md text-muted-foreground sm:text-lg"
          />
        )}
        {link && block.buttonLabel && (
          <Button asChild size="lg" className="mt-2 rounded-full">
            <Link href={link}>
              {block.buttonLabel}
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        )}
        <TrustBadges className="mt-4" />
      </div>
    </section>
  );
};

export default Hero;
