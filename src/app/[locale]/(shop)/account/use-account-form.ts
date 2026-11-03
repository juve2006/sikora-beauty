'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useRef,
} from 'react';
import type { z } from 'zod';
import { turnstileToken } from '@/components/shared/consultation/turnstile';
import { parseAccountForm } from '@/lib/validators';
import type { AccountState } from '@/types';

const idle: AccountState = { status: 'idle' };

type Options = {
  action: (previous: AccountState, form: FormData) => Promise<AccountState>;
  schema: z.ZodObject;
  // The form sends a letter: Cloudflare's token first.
  turnstile?: boolean;
  // What the form does on the action's answer: leave the page.
  onAnswer?: (state: AccountState) => void;
  // /canvas only: a state to start from.
  initialState?: AccountState;
};

// What an account's forms share. The same schema checks the fields here, before Turnstile's token is
// spent, and in the server action. Submitted by hand rather than through `action`: React resets a
// form after its action, and a failed one must keep what the shopper typed. An action that never
// reached the server — offline, or one a new deploy replaced — is a failed form, not an error page.
// Each form says `method="post"`: pressed before hydration it would otherwise put the password in
// the address.
export const useAccountForm = ({
  action,
  schema,
  turnstile = false,
  onAnswer,
  initialState = idle,
}: Options) => {
  const form = useRef<HTMLFormElement>(null);
  const [state, submit, pending] = useActionState(
    async (
      previous: AccountState,
      read: () => FormData,
    ): Promise<AccountState> => {
      const parsed = parseAccountForm(schema, read());
      if (!parsed.data) return { status: 'invalid', errors: parsed.errors };
      if (turnstile) await turnstileToken(read);
      try {
        return await action(previous, read());
      } catch {
        return { status: 'failed' };
      }
    },
    initialState,
  );

  useEffect(() => {
    // A state to start from is shown, not answered: /canvas would scroll to its invalid form.
    if (state === initialState) return;
    if (state.status === 'invalid')
      form.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus();
    onAnswer?.(state);
    // The work is for a new answer only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return {
    state,
    pending,
    form,
    errors: state.status === 'invalid' ? state.errors : {},
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const element = event.currentTarget;
      startTransition(() => submit(() => new FormData(element)));
    },
  };
};
