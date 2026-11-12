'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';

const pad = (n: number) => String(n).padStart(2, '0');

// A page's banners in a row, one at a time, as the client's mockup has them: the count «01 — 03» and
// the arrows at the bottom right, over the banner from md and under it below, where they would cover
// the promises; the keyboard's arrows and a swipe too, round in a loop. The banners are
// rendered on the server and passed in.
const HeroSlider = ({ slides }: { slides: ReactNode[] }) => {
  const t = useTranslations('Hero');
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const select = () => setCurrent(api.selectedScrollSnap());
    api.on('select', select);
    return () => {
      api.off('select', select);
    };
  }, [api]);

  return (
    <Carousel setApi={setApi} opts={{ loop: true }} aria-label={t('label')}>
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem
            key={index}
            aria-label={t('position', {
              current: index + 1,
              total: slides.length,
            })}
          >
            {slide}
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex items-center justify-end gap-3 px-4 py-4 md:absolute md:right-10 md:bottom-12 md:p-0 lg:right-16">
        <p
          aria-hidden
          className="mr-2 flex items-center gap-3 text-sm text-muted-foreground tabular-nums"
        >
          {pad(current + 1)}
          <span className="h-px w-8 bg-current" />
          {pad(slides.length)}
        </p>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full"
          onClick={() => api?.scrollPrev()}
          aria-label={t('previous')}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => api?.scrollNext()}
          aria-label={t('next')}
        >
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </Carousel>
  );
};

export default HeroSlider;
