'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import RegisterForm from './register-form';
import SignInForm from './sign-in-form';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Inside the dialog's content, so a closed dialog opens on sign-in again.
const Views = ({ onClose }: { onClose?: () => void }) => {
  const t = useTranslations('Account');
  const router = useRouter();
  const [view, setView] = useState<'signIn' | 'register'>('signIn');
  const signingIn = view === 'signIn';
  return (
    <>
      <DialogHeader className="pr-8">
        <DialogTitle className="text-lg">
          {t(signingIn ? 'signInTitle' : 'registerTitle')}
        </DialogTitle>
      </DialogHeader>
      {signingIn ? (
        <SignInForm
          onLeave={onClose}
          onSignedIn={() => {
            onClose?.();
            router.refresh();
          }}
        />
      ) : (
        <RegisterForm />
      )}
      <p className="text-center text-sm text-muted-foreground">
        {t(signingIn ? 'newHere' : 'haveAccount')}{' '}
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={() => setView(signingIn ? 'register' : 'signIn')}
        >
          {t(signingIn ? 'register' : 'signIn')}
        </Button>
      </p>
    </>
  );
};

// The way in, over whatever page the shopper is on (`useAccountEntry` opens it). `/account` keeps the
// same forms for a letter's link and for a browser without JavaScript.
const AccountDialog = ({
  open,
  onOpenChange,
  onCloseAutoFocus,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  // /canvas only: a button of its own.
  trigger?: ReactNode;
}) => {
  const t = useTranslations('Account');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {/* A phone keeps 300 px for Turnstile's widget inside the padding. */}
      <DialogContent
        closeLabel={t('close')}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1rem)] overflow-y-auto p-5 sm:max-w-md sm:p-6"
      >
        <Views onClose={() => onOpenChange?.(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
