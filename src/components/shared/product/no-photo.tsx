'use client';

import { cn } from 'cn';
import { ImageOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

const NoPhoto = ({ className }: { className?: string }) => {
  const t = useTranslations('Product');
  return (
    <div
      className={cn(
        'flex aspect-photo flex-col items-center justify-center gap-2 rounded-lg border bg-muted text-sm text-muted-foreground',
        className,
      )}
    >
      <ImageOff className="size-6" aria-hidden />
      {t('noPhoto')}
    </div>
  );
};

export default NoPhoto;
