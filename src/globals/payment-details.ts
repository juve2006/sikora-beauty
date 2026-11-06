import type { GlobalConfig } from 'payload';

import { isOwner } from '@/lib/access';
import { iban, taxCode } from '@/lib/validators';

// Where a shopper who chose a transfer sends the money: shown on the thank-you page of such an order,
// so anyone may read it, and only the owner changes it — an account taken over must not redirect the
// money. «Переказ на рахунок» is offered only once all three are filled in.
export const PaymentDetails: GlobalConfig = {
  slug: 'payment-details',
  label: 'Реквізити для оплати',
  admin: { group: 'Продажі' },
  access: { read: () => true, update: isOwner },
  fields: [
    {
      name: 'recipient',
      type: 'text',
      label: 'Отримувач',
      admin: { placeholder: 'ФОП Прізвище Імʼя По батькові' },
    },
    {
      name: 'iban',
      type: 'text',
      label: 'IBAN',
      admin: { placeholder: 'UA00 0000 0000 0000 0000 0000 0000 0' },
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string'
              ? value.replace(/\s/g, '').toUpperCase() || undefined
              : value,
        ],
      },
      validate: (value: unknown) =>
        !value ||
        iban.safeParse(value).success ||
        'Перевірте IBAN: UA і 27 цифр, як у виписці банку',
    },
    {
      name: 'code',
      type: 'text',
      label: 'РНОКПП або ЄДРПОУ',
      validate: (value: unknown) =>
        !value ||
        taxCode.safeParse(value).success ||
        'РНОКПП — 10 цифр, ЄДРПОУ — 8',
    },
  ],
};
