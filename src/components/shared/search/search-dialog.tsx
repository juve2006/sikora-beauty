'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Form from 'next/form';
import { useEffect, useState } from 'react';
import SearchSuggestions, {
  type SuggestionsStatus,
} from './search-suggestions';
import { suggestProducts } from '@/lib/actions/suggest.actions';
import type { CardProduct } from '@/types';
import { getPathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// A pause in typing before the suggestions are asked for.
const DELAY = 250;

// The header's search: a field in a dialog, the closest products under it as the shopper types,
// the results page on Enter. The form is a plain GET to /search, so it works before the script
// runs. The query stays when the dialog closes.
const SearchDialog = () => {
  const t = useTranslations('Search');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // The last answer, and the query it answers: a newer query shows it dimmed until its own comes.
  const [found, setFound] = useState<{
    query: string;
    products: CardProduct[];
    failed?: boolean;
  }>({ query: '', products: [] });
  const typed = query.trim();

  useEffect(() => {
    if (typed.length < 2) return;
    let current = true;
    const timer = setTimeout(() => {
      suggestProducts(typed, locale).then(
        (products) => current && setFound({ query: typed, products }),
        () => current && setFound({ query: typed, products: [], failed: true }),
      );
    }, DELAY);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [typed, locale]);

  const status: SuggestionsStatus =
    typed.length < 2
      ? 'idle'
      : found.query !== typed
        ? 'loading'
        : found.failed
          ? 'failed'
          : 'done';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search data-icon="inline-start" aria-hidden />
          {/* A phone's header keeps one line: the icon, named by the same word. */}
          <span className="max-sm:sr-only">{t('open')}</span>
        </Button>
      </DialogTrigger>
      {/* At the top, not centred: a phone's keyboard takes the lower half. */}
      <DialogContent
        closeLabel={t('close')}
        aria-describedby={undefined}
        className="top-4 max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1rem)] translate-y-0 overflow-y-auto p-5 sm:top-[10vh] sm:max-w-lg sm:p-6"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">{t('title')}</DialogTitle>
        </DialogHeader>
        <Form
          action={getPathname({ href: '/search', locale })}
          role="search"
          onSubmit={() => setOpen(false)}
        >
          <Input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            aria-label={t('label')}
            placeholder={t('placeholder')}
          />
        </Form>
        <SearchSuggestions
          status={status}
          query={typed}
          products={status === 'idle' ? [] : found.products}
          onPick={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
