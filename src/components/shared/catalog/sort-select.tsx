'use client';

import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { SORTS } from '@/lib/constants';
import { listingSearch } from '@/lib/listing';
import type { ListingParams, Sort } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';

// The chosen order shows at once, before the server's new list arrives, as FilterPanel's boxes do.
const SortSelect = ({
  params,
  basePath,
}: {
  params: ListingParams;
  basePath: string;
}) => {
  const t = useTranslations('Catalog');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(params.sort);
  return (
    <Select
      value={shown ?? 'default'}
      onValueChange={(value) => {
        const sort = value === 'default' ? undefined : (value as Sort);
        startTransition(() => {
          setShown(sort);
          router.push(`${basePath}${listingSearch(params, { sort })}`, {
            scroll: false,
          });
        });
      }}
    >
      <SelectTrigger aria-label={t('sort')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {(['default', ...SORTS] as const).map((sort) => (
          <SelectItem key={sort} value={sort}>
            {t(`sorts.${sort}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SortSelect;
