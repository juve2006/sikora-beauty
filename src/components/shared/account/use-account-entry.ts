'use client';

import { type MouseEvent, type RefObject, useRef, useState } from 'react';
import { isSignedIn } from '@/lib/actions/account.actions';
import { usePathname, useRouter } from '@/i18n/navigation';

// The links to the account: a click asks who is signed in, as no page may (`AccountLink`). Signed in,
// or no answer, it goes to `/account`, as a link in a new tab or without JavaScript does; signed out,
// the dialog opens. It has no trigger of its own, so it hands the focus back to what opened it, or to
// `focusBack` when that is gone by then; and the header outlives a page, so another address closes it.
export const useAccountEntry = (focusBack?: RefObject<HTMLElement | null>) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const opener = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }
  return {
    open,
    setOpen,
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      (focusBack ?? opener).current?.focus();
    },
    onClick: async (event: MouseEvent<HTMLElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      opener.current = event.currentTarget;
      if (await isSignedIn().catch(() => true)) router.push('/account');
      else setOpen(true);
    },
  };
};
