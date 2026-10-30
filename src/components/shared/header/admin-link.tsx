'use client';

import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { adminSession } from '@/lib/validators';
import { Button } from '@/components/ui/button';

// Payload's session cookie is HttpOnly, so the browser asks who is signed in: reading the cookie on
// the server would make every page dynamic, the product pages' cache gone. One request per page
// load, shared by the header and the phone's menu.
let session: Promise<boolean> | undefined;
const signedIn = () =>
  (session ??= fetch('/api/users/me')
    .then((response) => response.json())
    .then((body) => Boolean(adminSession.safeParse(body).data?.user))
    .catch(() => false));

// The admin's link, for an owner or a cosmetologist who is signed in; it opens nothing by itself.
// Next's Link, not next-intl's: the admin's path has no language. It is another root layout, so the
// navigation is a full load, and nothing is prefetched. `/canvas` fixes `shown` instead of asking.
const AdminLink = ({
  className,
  shown: fixed,
}: {
  className?: string;
  shown?: boolean;
}) => {
  const t = useTranslations('Nav');
  const [shown, setShown] = useState(fixed ?? false);
  useEffect(() => {
    if (fixed === undefined) signedIn().then(setShown);
  }, [fixed]);
  if (!shown) return null;
  return (
    <Button asChild variant="ghost" size="sm" className={className}>
      <NextLink href="/admin" prefetch={false}>
        {t('admin')}
      </NextLink>
    </Button>
  );
};

export default AdminLink;
