'use client';

import { UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

// The header's way to the account. It never asks who is signed in: the same link for everyone keeps
// the pages cached and adds no request; `/account` knows. Nothing is prefetched for the same reason.
// A phone has it in the menu sheet: a fifth button would not fit beside the logo at 360 px. The word
// waits for `lg`: with it the header passes the edge at 640 px.
const AccountLink = () => {
  const t = useTranslations('Nav');
  return (
    <Button asChild variant="ghost" size="sm" className="max-sm:hidden">
      <Link href="/account" prefetch={false}>
        <UserRound data-icon="inline-start" aria-hidden />
        <span className="max-lg:sr-only">{t('account')}</span>
      </Link>
    </Button>
  );
};

export default AccountLink;
