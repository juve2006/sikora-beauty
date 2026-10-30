'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FilterPanel from './filter-panel';
import type { FilterProps } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// A phone's filters: a button with how many are chosen, the panel in a sheet from the bottom. The
// sheet stays open while filters change, and its button shows how many products they leave.
const FiltersSheet = ({
  total,
  selected,
  ...filters
}: FilterProps & { total: number; selected: number }) => {
  const t = useTranslations('Catalog');
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal data-icon="inline-start" />
          {t('filters')}
          {selected > 0 && <Badge>{selected}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent closeLabel={t('close')} aria-describedby={undefined}>
        <SheetHeader className="pb-0">
          <SheetTitle>{t('filters')}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4">
          <FilterPanel {...filters} />
        </div>
        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button>{t('show', { count: total })}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FiltersSheet;
