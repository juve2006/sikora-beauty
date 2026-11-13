import { after } from 'next/server';
import type { Endpoint, Payload } from 'payload';
import type { z } from 'zod';

import { hasRole } from '@/lib/access';
import {
  DELIVERY_DELETED,
  DELIVERY_FINAL,
  DELIVERY_NOT_COLLECTED,
  NOVA_POSHTA_API,
  SITE_URL,
  TRACK_LIMIT,
  TRACK_WITHIN,
  WAYBILL_AGAIN_AFTER,
  WAYBILL_STATUSES,
} from '@/lib/constants';
import { fromCron } from '@/lib/cron';
import { waybillBlock, waybillPayer } from '@/lib/orders';
import { formatDateTime, whatFailed } from '@/lib/utils';
import {
  npAnswer,
  npCities,
  npContacts,
  npCounterparties,
  npDocuments,
  npRecipients,
  npSettlements,
  npTracking,
  npWarehouses,
  waybillRequest,
} from '@/lib/validators';
import type { Order } from '@/payload-types';

// Nova Poshta's API 2.0: settlements and NP warehouses for the checkout, a waybill from the admin and
// the daily tracking. Delivery depends on orders, never the other way (ARCHITECTURE). The key is the
// developer's until the seller has her own, in NOVA_POSHTA_API_KEY; without one the search goes with an
// empty key, which it answers today but the docs do not promise. Whatever fails — the network, the
// time it is given, `success: false`, an answer of another shape — throws, and the checkout falls back
// to fields the shopper types (task `cart-and-checkout`). Not `server-only`: payload.config loads the
// endpoints, and so does `payload migrate`.

// What Nova Poshta itself refused. Its words are for the manager and may repeat a shopper's name, so
// the message, which logs print, holds only its codes.
class Refused extends Error {
  constructor(
    readonly words: string[],
    codes: string[],
  ) {
    super(`refused: ${codes.join(', ')}`);
  }
}

async function call(
  calledMethod: string,
  methodProperties: object,
  modelName = 'AddressGeneral',
  timeout = 5000,
) {
  const response = await fetch(
    process.env.NOVA_POSHTA_API_URL || NOVA_POSHTA_API,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.NOVA_POSHTA_API_KEY ?? '',
        modelName,
        calledMethod,
        methodProperties,
      }),
      signal: AbortSignal.timeout(timeout),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const answer = npAnswer.parse(await response.json());
  if (!answer.success) throw new Refused(answer.errors, answer.errorCodes);
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

// Without the key and the branch parcels leave from, no waybill is made: the developer's key on
// Production creates nothing by accident.
export const waybillsEnabled = () =>
  Boolean(
    process.env.NOVA_POSHTA_API_KEY &&
    process.env.NOVA_POSHTA_SENDER_CITY &&
    process.env.NOVA_POSHTA_SENDER_WAREHOUSE,
  );

// Who sends: the key's own counterparty and its contact, the same until the key changes, so kept
// between waybills. ponytail: the first of each; a key with several needs a choice in the admin.
let sender:
  { Sender: string; ContactSender: string; SendersPhone: string } | undefined;

async function waybillSender() {
  if (sender) return sender;
  const [{ Ref }] = npCounterparties.parse(
    await call(
      'getCounterparties',
      { CounterpartyProperty: 'Sender', Page: '1' },
      'Counterparty',
    ),
  );
  const [contact] = npContacts.parse(
    await call(
      'getCounterpartyContactPersons',
      { Ref, Page: '1' },
      'Counterparty',
    ),
  );
  sender = {
    Sender: Ref,
    ContactSender: contact.Ref,
    SendersPhone: contact.Phones,
  };
  return sender;
}

// The order holds the settlement's ref, a waybill wants its city's: any of its NP warehouses names it.
async function recipientCity(settlementRef: string) {
  const [{ CityRef }] = npCities.parse(
    await call('getWarehouses', {
      SettlementRef: settlementRef,
      Limit: '1',
      Page: '1',
    }),
  );
  return CityRef;
}

async function waybillRecipient({ firstName, lastName, phone }: Order) {
  const [recipient] = npRecipients.parse(
    await call(
      'save',
      {
        FirstName: firstName,
        MiddleName: '',
        LastName: lastName,
        Phone: phone.replace('+', ''),
        CounterpartyType: 'PrivatePerson',
        CounterpartyProperty: 'Recipient',
      },
      'Counterparty',
    ),
  );
  return {
    Recipient: recipient.Ref,
    ContactRecipient: recipient.ContactPerson.data[0].Ref,
  };
}

type Box = Pick<
  z.infer<typeof waybillRequest>,
  'weight' | 'width' | 'length' | 'height'
>;

// A branch to a branch or a locker, one seat, the delivery paid in cash at a branch: by the store
// from FREE_DELIVERY_FROM on, by the recipient below it (`waybillPayer`); NonCash needs a contract
// with Nova Poshta. The sum
// is the order's, in hryvnias from integer kopiyky without a float (RULES.md). `OptionsSeat` is what
// a locker requires and a branch accepts, so nothing asks which it is.
async function waybillProperties(
  order: Order,
  { weight, width, length, height }: Box,
) {
  const [from, city, to] = await Promise.all([
    waybillSender(),
    recipientCity(order.settlementRef ?? ''),
    waybillRecipient(order),
  ]);
  return {
    ...from,
    ...to,
    ServiceType: 'WarehouseWarehouse',
    PayerType: waybillPayer(order.total),
    PaymentMethod: 'Cash',
    CargoType: 'Parcel',
    DateTime: formatDateTime(new Date().toISOString()).slice(0, 10),
    SeatsAmount: '1',
    Weight: String(weight),
    OptionsSeat: [
      {
        // ponytail: Nova Poshta's volumetric weight, as its docs do not define this field; the first
        // real waybill confirms it.
        volumetricVolume: String((width * length * height) / 4000),
        volumetricWidth: String(width),
        volumetricLength: String(length),
        volumetricHeight: String(height),
        weight: String(weight),
      },
    ],
    Description: 'Косметичні засоби',
    Cost: `${Math.trunc(order.total / 100)}.${String(order.total % 100).padStart(2, '0')}`,
    CitySender: process.env.NOVA_POSHTA_SENDER_CITY,
    SenderAddress: process.env.NOVA_POSHTA_SENDER_WAREHOUSE,
    CityRecipient: city,
    RecipientAddress: order.warehouseRef,
    RecipientsPhone: order.phone.replace('+', ''),
  };
}

// Takes the order for this one request: one statement, so a double press or a second tab finds
// nothing to take and Nova Poshta, which has no idempotency key, is asked once. `again` takes it back
// from a request that was never answered, once that request cannot still be on its way, and takes one
// a failed retry freed: its form still says «Створити ще раз». A waybill Nova Poshta says was deleted
// leaves the order free. Goes past the field's `update: nobody`.
const claimOrder = (payload: Payload, id: number, again: boolean) =>
  payload.db.updateOne({
    collection: 'orders',
    data: {
      waybillRequestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    options: { atomic: true },
    where: {
      and: [
        { id: { equals: id } },
        { status: { in: [...WAYBILL_STATUSES] } },
        {
          or: [
            { waybillNumber: { exists: false } },
            { deliveryCode: { equals: DELIVERY_DELETED } },
          ],
        },
        again
          ? {
              or: [
                { waybillRequestedAt: { exists: false } },
                {
                  waybillRequestedAt: {
                    less_than: new Date(
                      Date.now() - WAYBILL_AGAIN_AFTER,
                    ).toISOString(),
                  },
                },
              ],
            }
          : { waybillRequestedAt: { exists: false } },
      ],
    },
  });

const releaseOrder = (payload: Payload, id: number) =>
  payload.db.updateOne({
    collection: 'orders',
    data: { waybillRequestedAt: null, updatedAt: new Date().toISOString() },
    options: { atomic: true },
    where: { id: { equals: id } },
  });

// «Створити накладну» on an order, in Ukrainian for the manager. An admin role alone: nothing is read
// before it holds. A refusal or a failure before `save` frees the order for another try; a `save`
// nobody answered may have made a waybill, so the order stays taken and the manager looks in Nova
// Poshta's cabinet. ponytail: that look is by hand; `getDocumentList` could do it if it ever happens.
export const npWaybill: Endpoint = {
  path: '/np/waybill',
  method: 'post',
  handler: async (req) => {
    if (!hasRole({ req }))
      return Response.json(
        { error: 'Лише для адміністраторів' },
        { status: 403 },
      );
    const request = waybillRequest.safeParse(
      await req.json?.().catch(() => null),
    );
    if (!request.data)
      return Response.json(
        { error: 'Перевірте вагу й розміри коробки' },
        { status: 400 },
      );
    if (!waybillsEnabled())
      return Response.json(
        { error: 'Накладні не налаштовані' },
        { status: 503 },
      );
    const { id, again, ...box } = request.data;
    const order = await req.payload.findByID({
      collection: 'orders',
      id,
      depth: 0,
      overrideAccess: false,
      user: req.user,
      disableErrors: true,
    });
    const blocked = order ? waybillBlock(order) : 'Замовлення не знайдено';
    if (!order || blocked)
      return Response.json({ error: blocked }, { status: 409 });
    if (!(await claimOrder(req.payload, id, Boolean(again))))
      return Response.json(
        { error: 'Накладна вже створюється' },
        { status: 409 },
      );

    let number: string;
    let sent = false;
    try {
      const properties = await waybillProperties(order, box);
      sent = true;
      [{ IntDocNumber: number }] = npDocuments.parse(
        await call('save', properties, 'InternetDocumentGeneral', 15_000),
      );
    } catch (error) {
      console.error('Nova Poshta:', whatFailed(error));
      if (sent && !(error instanceof Refused))
        return Response.json({ lost: true }, { status: 504 });
      await releaseOrder(req.payload, id);
      return Response.json(
        {
          error:
            error instanceof Refused
              ? error.words.join('; ') || 'Нова Пошта відмовила'
              : 'Нова Пошта не відповідає, спробуйте ще раз',
        },
        { status: 502 },
      );
    }

    const status = 'Створено, ще не передано на відправку';
    try {
      await req.payload.db.updateOne({
        collection: 'orders',
        data: {
          waybillNumber: number,
          deliveryCode: '1',
          deliveryStatus: status,
          waybillRequestedAt: null,
          updatedAt: new Date().toISOString(),
        },
        options: { atomic: true },
        where: { id: { equals: id } },
      });
    } catch (error) {
      // The waybill exists and the order does not know it: the number is what finds it again.
      console.error(
        'Nova Poshta:',
        `waybill ${number} of order ${id} not saved:`,
        whatFailed(error),
      );
      return Response.json({ lost: true }, { status: 500 });
    }
    return Response.json({ number, status });
  },
};

// Writes what Nova Poshta says of a waybill now: `true` when this call changed it, so a cron run twice
// tells the manager of a parcel nobody collected once.
async function moveDelivery(
  payload: Payload,
  number: string,
  code: string,
  status: string,
) {
  const order = await payload.db.updateOne({
    collection: 'orders',
    data: {
      deliveryCode: code,
      deliveryStatus: status,
      updatedAt: new Date().toISOString(),
    },
    options: { atomic: true },
    where: {
      and: [
        { waybillNumber: { equals: number } },
        {
          or: [
            { deliveryCode: { exists: false } },
            { deliveryCode: { not_equals: code } },
          ],
        },
      ],
    },
  });
  if (!order) return false;
  if (DELIVERY_NOT_COLLECTED.includes(code)) {
    after(async () => {
      // Loaded here, not at the top: telegram.ts is `server-only`, and payload.config loads this file.
      const { parcelMessage, sendTelegram } = await import('@/lib/telegram');
      await sendTelegram(
        parcelMessage({ id: order.id }, number, status, SITE_URL),
      ).catch((error) => console.error('Telegram:', whatFailed(error)));
    });
  }
  return true;
}

// The day's look at the parcels still going, Nova Poshta having no webhook. Past the site password
// (src/proxy.ts), and nothing is read before the secret holds. It writes the delivery's status and
// nothing else: the order's status and its payment stay the manager's. No phone goes with the numbers:
// the key sees its own waybills. ponytail: one request, 100 numbers; more going at once need pages.
export const npTrack: Endpoint = {
  path: '/np/track',
  method: 'get',
  handler: async (req) => {
    if (!fromCron(req.headers.get('authorization')))
      return Response.json({ error: 'secret' }, { status: 401 });

    // No visitor's read: the cron's, once its secret holds, and only the numbers are selected.
    const { docs } = await req.payload.find({
      collection: 'orders',
      where: {
        and: [
          { waybillNumber: { exists: true } },
          {
            createdAt: {
              greater_than: new Date(Date.now() - TRACK_WITHIN).toISOString(),
            },
          },
          {
            or: [
              { deliveryCode: { exists: false } },
              { deliveryCode: { not_in: DELIVERY_FINAL } },
            ],
          },
        ],
      },
      sort: 'createdAt',
      depth: 0,
      limit: TRACK_LIMIT,
      pagination: false,
      overrideAccess: true,
      select: { waybillNumber: true },
    });
    if (!docs.length) return Response.json({ checked: 0, moved: 0 });

    let statuses: z.infer<typeof npTracking>;
    try {
      statuses = npTracking.parse(
        await call(
          'getStatusDocuments',
          {
            Documents: docs.map(({ waybillNumber }) => ({
              DocumentNumber: waybillNumber,
            })),
          },
          'TrackingDocumentGeneral',
          10_000,
        ),
      );
    } catch (error) {
      console.error('Nova Poshta:', whatFailed(error));
      return Response.json({ error: 'unavailable' }, { status: 502 });
    }
    const results = await Promise.allSettled(
      statuses.map(({ Number: number, StatusCode, Status }) =>
        moveDelivery(req.payload, number, StatusCode, Status),
      ),
    );
    for (const result of results)
      if (result.status === 'rejected')
        console.error('Nova Poshta:', whatFailed(result.reason));
    return Response.json({
      checked: docs.length,
      moved: results.filter(
        (result) => result.status === 'fulfilled' && result.value,
      ).length,
    });
  },
};
