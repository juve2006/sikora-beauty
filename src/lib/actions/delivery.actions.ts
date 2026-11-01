'use server';

import { unstable_cache } from 'next/cache';

import { searchSettlements, searchWarehouses } from '@/lib/novaposhta';
import { settlementQuery, warehouseQuery } from '@/lib/validators';
import type { DeliveryAnswer, DeliveryOption } from '@/types';

// The checkout's search for a settlement and an NP warehouse, through Nova Poshta on the server, so
// its key never reaches the browser. An answer is kept twelve hours, by what was asked: Nova Poshta
// asks for its directories to be cached and refreshes warehouses daily. A failure is not kept.
const HALF_DAY = 12 * 60 * 60;
const settlements = unstable_cache(searchSettlements, ['np-settlements'], {
  revalidate: HALF_DAY,
});
const warehouses = unstable_cache(searchWarehouses, ['np-warehouses'], {
  revalidate: HALF_DAY,
});

// Nova Poshta refuses Latin letters: the shopper is asked to type the name in Ukrainian.
const LATIN = /[a-z]/i;

async function ask(
  find: () => Promise<DeliveryOption[]>,
): Promise<DeliveryAnswer> {
  try {
    return { status: 'found', options: await find() };
  } catch (error) {
    // What failed, never what the shopper typed.
    console.error('Nova Poshta:', (error as Error).message);
    return { status: 'unavailable' };
  }
}

export async function findSettlements(query: string): Promise<DeliveryAnswer> {
  const parsed = settlementQuery.safeParse(query);
  if (!parsed.success) return { status: 'found', options: [] };
  if (LATIN.test(parsed.data)) return { status: 'latin' };
  return ask(() => settlements(parsed.data.toLowerCase()));
}

export async function findWarehouses(
  ref: string,
  query: string,
): Promise<DeliveryAnswer> {
  const parsed = warehouseQuery.safeParse({ ref, query });
  if (!parsed.success) return { status: 'found', options: [] };
  if (LATIN.test(parsed.data.query)) return { status: 'latin' };
  return ask(() =>
    warehouses(parsed.data.ref, parsed.data.query.toLowerCase()),
  );
}
