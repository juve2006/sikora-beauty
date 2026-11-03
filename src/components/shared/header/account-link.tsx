'use client';

import { UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import AccountDialog from '@/components/shared/account/account-dialog';
import { useAccountEntry } from '@/components/shared/account/use-account-entry';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

// The header's way to the account. No page asks who is signed in: that keeps the pages cached and adds
// no request; a click does (`useAccountEntry`). Nothing is prefetched for the same reason. A phone has
// it in the menu sheet: a fifth button would not fit beside the logo at 360 px. The word waits for
// `lg`: with it the header passes the edge at 640 px.
const AccountLink = () => {
  const t = useTranslations('Nav');
  const { open, setOpen, onCloseAutoFocus, onClick } = useAccountEntry();
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="max-sm:hidden">
        <Link href="/account" prefetch={false} onClick={onClick}>
          <UserRound data-icon="inline-start" aria-hidden />
          <span className="max-lg:sr-only">{t('account')}</span>
        </Link>
      </Button>
      <AccountDialog
        open={open}
        onOpenChange={setOpen}
        onCloseAutoFocus={onCloseAutoFocus}
      />
    </>
  );
};

export default AccountLink;
