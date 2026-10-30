import { revalidatePath } from 'next/cache';
import type { PayloadRequest } from 'payload';

type Change = {
  doc?: { _status?: string | null };
  previousDoc?: { _status?: string | null };
  req: PayloadRequest;
};

// Price and availability reach the storefront on save, not on a timer (spec `sikora-beauty`).
// A draft save leaves the storefront alone; publishing or unpublishing refreshes it. Outside a Next
// request (seed, migrations) revalidation throws, so those pass `context.disableRevalidate`.
export function revalidateStorefront<T extends Change>({
  doc,
  previousDoc,
  req,
}: T) {
  if (
    !req.context.disableRevalidate &&
    (doc?._status !== 'draft' || previousDoc?._status === 'published')
  ) {
    revalidatePath('/', 'layout');
  }
  return doc;
}

// What every catalog collection but products runs after a change: products keep their own hooks.
export const storefrontHooks = {
  afterChange: [revalidateStorefront],
  afterDelete: [revalidateStorefront],
};
