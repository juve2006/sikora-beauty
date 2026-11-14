import Image from 'next/image';
import Paragraphs from './paragraphs';
import { photos } from '@/lib/product-page';
import type { BlockOf } from '@/types';

// A heading and its text, and a photo beside them — under them on a phone: the about page, the
// terms, anything else.
const TextBlock = ({ block }: { block: BlockOf<'text'> }) => {
  const [photo] = photos(block.image ? [block.image] : []);
  return (
    <section className="grid gap-8 pt-8 pb-6 lg:grid-cols-[minmax(0,65ch)_1fr] lg:gap-12">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {block.title}
        </h2>
        <Paragraphs text={block.text} className="mt-4" />
      </div>
      {photo && (
        <div className="relative aspect-4/3 self-start overflow-hidden rounded-xl bg-muted">
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 760px, 100vw"
            className="object-cover"
          />
        </div>
      )}
    </section>
  );
};

export default TextBlock;
