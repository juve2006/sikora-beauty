import 'server-only';

import { NOVA_POSHTA_API } from '@/lib/constants';
import { npAnswer, npSettlements, npWarehouses } from '@/lib/validators';

// Nova Poshta's API 2.0: settlements and NP warehouses for the checkout. Its key is the
// developer's, in NOVA_POSHTA_API_KEY; without one the request goes with an empty key, which the
// search answers today but the docs do not promise. Whatever fails — the network, five seconds,
// `success: false`, an answer of another shape — throws, and the checkout falls back to fields
// the shopper types (task `cart-and-checkout`).

async function call(calledMethod: string, methodProperties: object) {
  const response = await fetch(
    process.env.NOVA_POSHTA_API_URL || NOVA_POSHTA_API,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.NOVA_POSHTA_API_KEY ?? '',
        modelName: 'AddressGeneral',
        calledMethod,
        methodProperties,
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const answer = npAnswer.parse(await response.json());
  if (!answer.success) throw new Error(answer.errors.join('; '));
  return answer.data;
}

// The settlements whose names start with what the shopper typed, with an NP warehouse in them.
export async function searchSettlements(query: string) {
  const [found] = npSettlements.parse(
    await call('searchSettlements', {
      CityName: query,
      Limit: '10',
      Page: '1',
    }),
  );
  return (found?.Addresses ?? [])
    .filter((settlement) => settlement.Warehouses > 0)
    .map((settlement) => ({ ref: settlement.Ref, label: settlement.Present }));
}

// The settlement's NP warehouses that take parcels, matching a number or a street; the first ones
// for an empty query. A redirect to Nova Poshta's cached file of a whole city is followed by fetch
// itself, and its limit may not hold there: the list is cut again.
export async function searchWarehouses(ref: string, query: string) {
  const warehouses = npWarehouses.parse(
    await call('getWarehouses', {
      SettlementRef: ref,
      FindByString: query,
      Limit: '20',
      Page: '1',
    }),
  );
  return warehouses
    .filter(
      (warehouse) =>
        warehouse.WarehouseStatus === 'Working' &&
        warehouse.DenyToSelect !== '1',
    )
    .slice(0, 20)
    .map((warehouse) => ({ ref: warehouse.Ref, label: warehouse.Description }));
}
