'use client';

import { cn } from 'cn';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import type { Photo } from '@/types';
import NoPhoto from '@/components/shared/product/no-photo';

// The first photo is the main one (the admin says so); thumbnails switch it.
const ProductGallery = ({ photos }: { photos: Photo[] }) => {
  const t = useTranslations('Product');
  const [current, setCurrent] = useState(0);
  if (photos.length === 0) return <NoPhoto />;

  const photo = photos[current];
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-card">
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="(min-width: 1024px) 480px, 100vw"
          fetchPriority={current === 0 ? 'high' : undefined}
          className="object-contain"
        />
      </div>
      {photos.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {photos.map((thumbnail, index) => (
            <li key={thumbnail.url}>
              <button
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={t('photo', { n: index + 1, total: photos.length })}
                aria-pressed={index === current}
                className={cn(
                  'relative block aspect-square w-full overflow-hidden rounded-md border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === current && 'border-primary ring-1 ring-primary',
                )}
              >
                <Image
                  src={thumbnail.url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductGallery;
