import {
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  ValidationError,
} from 'payload';

import { availabilityLabels } from './products';
import { hasRole, isOwner, nobody, staffOrBuyer } from '@/lib/access';
import {
  AVAILABILITIES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENTS,
} from '@/lib/constants';
import { canMovePayment, canMoveStatus } from '@/lib/orders';

const statusLabels = {
  new: 'Нове',
  confirmed: 'Підтверджене',
  shipped: 'Відправлене',
  completed: 'Виконане',
  cancelled: 'Скасоване',
};

const paymentLabels = {
  cod: 'Післяплата',
  link: 'Посилання на оплату',
  transfer: 'Переказ на рахунок',
  card: 'Карткою на сайті',
};

const paymentStatusLabels = {
  awaiting: 'Очікує',
  paid: 'Оплачено',
  failed: 'Не пройшла',
  refunded: 'Повернено',
};

// Money in the admin is hryvnias, stored as integer kopiyky (RULES.md), as a product's price is.
const money = {
  components: {
    Field: '/components/admin/price-field',
    Cell: '/components/admin/price-cell',
  },
};

// What the shopper sent and what the order cost stay as they were at checkout, in the admin and
// through the API alike (RULES.md: a snapshot of names and prices); the manager changes the status
// and their note. A field nobody may update the admin shows read-only.
const sent = { update: nobody };

// An order's status only moves forward (RULES.md); a mistaken step is told in the note.
export const keepStatusForward: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (
    operation === 'update' &&
    data.status &&
    originalDoc?.status &&
    !canMoveStatus(originalDoc.status, data.status)
  ) {
    throw new ValidationError(
      {
        errors: [
          {
            label: 'Статус',
            message: 'Статус не повертається назад',
            path: 'status',
          },
        ],
      },
      req.t,
    );
  }
  return data;
};

// Whether it is paid only moves forward too (RULES.md): the manager marks a transfer they see on the
// account, or a payment by link or on delivery. A card's nobody changes here, as only monobank knows
// whether the card paid: its word is written past this hook, by `settle` (src/lib/monobank.ts). Only
// a card's new invoice makes a failed payment wait again (`payByCard`): for a mark that is taking it
// back.
export const keepPaymentForward: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const from = originalDoc?.paymentStatus;
  const to = data.paymentStatus;
  if (operation !== 'update' || !from || !to || from === to) return data;
  const message =
    !canMovePayment(from, to) || to === 'awaiting'
      ? 'Позначка оплати не знімається'
      : originalDoc.payment === 'card'
        ? 'Стан оплати карткою змінює лише monobank'
        : undefined;
  if (message) {
    throw new ValidationError(
      { errors: [{ label: 'Статус оплати', message, path: 'paymentStatus' }] },
      req.t,
    );
  }
  return data;
};

// A waybill made in Nova Poshta's cabinet is typed in by hand, and what the cron knew of the old number
// goes with it. An empty field takes no number away: a form opened before the waybill was made saves
// one, and the button would then make a second.
export const keepWaybill: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== 'update') return data;
  const kept = originalDoc?.waybillNumber;
  if (!data.waybillNumber) return { ...data, waybillNumber: kept ?? null };
  return data.waybillNumber === kept
    ? data
    : {
        ...data,
        deliveryCode: null,
        deliveryStatus: null,
        waybillRequestedAt: null,
      };
};

// A shopper's order, waiting for the manager's confirmation (adr-20261028-two-step-launch). Their
// name, phone and NP warehouse are personal data: only an admin role and the shopper who ordered
// signed in read them, nobody creates an order through the API — `placeOrder` does, after Zod,
// Turnstile and repricing — and only the owner deletes one.
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Замовлення', plural: 'Замовлення' },
  admin: {
    group: 'Продажі',
    defaultColumns: [
      'id',
      'createdAt',
      'firstName',
      'lastName',
      'phone',
      'total',
      'payment',
      'paymentStatus',
      'status',
    ],
  },
  defaultSort: '-createdAt',
  access: {
    read: staffOrBuyer,
    create: nobody,
    update: hasRole,
    delete: isOwner,
  },
  hooks: { beforeChange: [keepStatusForward, keepPaymentForward, keepWaybill] },
  fields: [
    {
      name: 'lines',
      type: 'array',
      label: 'Товари',
      labels: { singular: 'Товар', plural: 'Товари' },
      required: true,
      minRows: 1,
      access: sent,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', label: 'Назва', required: true },
            { name: 'brand', type: 'text', label: 'Бренд' },
            { name: 'volume', type: 'text', label: "Об'єм" },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'price',
              type: 'number',
              label: 'Ціна, грн',
              required: true,
              admin: money,
            },
            {
              name: 'quantity',
              type: 'number',
              label: 'Кількість',
              required: true,
            },
            {
              name: 'availability',
              type: 'select',
              label: 'Наявність',
              options: AVAILABILITIES.map((value) => ({
                value,
                label: availabilityLabels[value],
              })),
            },
            {
              name: 'madeToOrderDays',
              type: 'number',
              label: 'Днів до відправки',
            },
          ],
        },
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Товар у каталозі',
        },
      ],
    },
    {
      name: 'total',
      type: 'number',
      label: 'Сума, грн',
      required: true,
      access: sent,
      admin: money,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          label: "Ім'я",
          required: true,
          access: sent,
        },
        {
          name: 'lastName',
          type: 'text',
          label: 'Прізвище',
          required: true,
          access: sent,
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Телефон',
          required: true,
          access: sent,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'settlement',
          type: 'text',
          label: 'Місто',
          required: true,
          access: sent,
        },
        {
          name: 'warehouse',
          type: 'text',
          label: 'Відділення або поштомат',
          required: true,
          access: sent,
        },
      ],
    },
    // Nova Poshta's refs when the shopper chose from its search; empty when it did not work and
    // they typed the address — the manager checks it on the call.
    {
      type: 'row',
      fields: [
        {
          name: 'settlementRef',
          type: 'text',
          label: 'Ref міста (НП)',
          access: sent,
        },
        {
          name: 'warehouseRef',
          type: 'text',
          label: 'Ref відділення (НП)',
          access: sent,
        },
      ],
    },
    {
      name: 'payment',
      type: 'select',
      label: 'Оплата',
      required: true,
      options: PAYMENTS.map((value) => ({
        value,
        label: paymentLabels[value],
      })),
      access: sent,
    },
    { name: 'comment', type: 'textarea', label: 'Коментар', access: sent },
    {
      name: 'locale',
      type: 'select',
      label: 'Мова',
      options: [
        { value: 'uk', label: 'Українська' },
        { value: 'en', label: 'Англійська' },
      ],
      access: sent,
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      required: true,
      defaultValue: 'new',
      options: ORDER_STATUSES.map((value) => ({
        value,
        label: statusLabels[value],
      })),
      admin: { position: 'sidebar', isClearable: false },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      label: 'Статус оплати',
      required: true,
      defaultValue: 'awaiting',
      options: PAYMENT_STATUSES.map((value) => ({
        value,
        label: paymentStatusLabels[value],
      })),
      admin: { position: 'sidebar', isClearable: false },
    },
    // A card's invoice at monobank, by which its webhook finds the order: written by the server
    // only, read by staff.
    {
      name: 'monoInvoiceId',
      type: 'text',
      label: 'Рахунок mono',
      unique: true,
      index: true,
      access: { read: hasRole, update: nobody },
      admin: { position: 'sidebar' },
    },
    // Nova Poshta's waybill: the button makes it (src/lib/novaposhta.ts), or the manager types the
    // number of one made in its cabinet. What the cron and the button write nobody changes here, and a
    // shopper reads none of it.
    {
      type: 'ui',
      name: 'waybill',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/waybill-field' },
      },
    },
    {
      name: 'waybillNumber',
      type: 'text',
      label: 'Номер накладної',
      unique: true,
      index: true,
      access: { read: hasRole },
      validate: (value: string | null | undefined) =>
        !value ||
        /^\d{14}$/.test(value) ||
        'Номер накладної: 14 цифр без пробілів',
      admin: { position: 'sidebar' },
    },
    {
      name: 'waybillRequestedAt',
      type: 'date',
      access: { read: hasRole, update: nobody },
      admin: { hidden: true },
    },
    {
      name: 'deliveryCode',
      type: 'text',
      access: { read: hasRole, update: nobody },
      admin: { hidden: true },
    },
    {
      name: 'deliveryStatus',
      type: 'text',
      access: { read: hasRole, update: nobody },
      admin: { hidden: true },
    },
    // The thank-you page finds the order by it, never by its number, which anyone could count
    // through: only the browser that placed the order has it, and nobody reads it back.
    {
      name: 'returnToken',
      type: 'text',
      unique: true,
      index: true,
      access: { read: nobody, update: nobody },
      admin: { hidden: true },
    },
    // Staff's own: a shopper reads their order through the API too.
    {
      name: 'managerNote',
      type: 'textarea',
      label: 'Нотатка менеджера',
      access: { read: hasRole },
      admin: { position: 'sidebar' },
    },
    // Whose it is: set only at checkout, from the session, never by an email that matches
    // (adr-20261103-customer-accounts). A guest's order has none, as has one whose account is gone.
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      label: 'Покупець',
      access: sent,
      admin: { position: 'sidebar' },
    },
  ],
};
