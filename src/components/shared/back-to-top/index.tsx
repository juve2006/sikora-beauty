'use client';

import { ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { scrollToTop, useScrolledDown } from '@/lib/back-to-top';

// The way back up from far down a page. Its surface is opaque, as the footer under it is in the
// primary colour too, and it is not there at the top, so Tab never lands on it.
const BackToTop = () => {
  const t = useTranslations('Nav');
  const scrolledDown = useScrolledDown();
  if (!scrolledDown) return null;
  return (
    <Button
      aria-label={t('backToTop')}
      className="fixed right-4 bottom-4 z-40 size-11 rounded-full text-primary shadow-md dark:bg-background dark:hover:bg-muted"
      onClick={scrollToTop}
      size="icon"
      variant="outline"
    >
      <ChevronUp className="size-7" strokeWidth={1.5} />
    </Button>
  );
};

export default BackToTop;
