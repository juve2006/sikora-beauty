'use client';

import {
  Button,
  TextInput,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormFields,
} from '@payloadcms/ui';
import { useState } from 'react';

import {
  DELIVERY_DELETED,
  DELIVERY_NOT_COLLECTED,
  WAYBILL_AGAIN_AFTER,
  WAYBILL_BOX,
} from '@/lib/constants';
import { waybillBlock } from '@/lib/orders';
import type { Order } from '@/payload-types';

const sizes = [
  ['weight', 'Вага, кг'],
  ['width', 'Ширина, см'],
  ['length', 'Довжина, см'],
  ['height', 'Висота, см'],
] as const;

const LOST =
  'Нова Пошта не відповіла, накладна могла створитися. Перевірте кабінет НП: якщо вона є, впишіть номер нижче';

// In Ukrainian: the order's waybill. The server decides, by the same `waybillBlock`; this form reads
// the order as it stands on the page.
const WaybillForm = ({ enabled }: { enabled: boolean }) => {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const { dispatchFields } = useForm();
  const order = useFormFields(([fields]) => ({
    status: fields.status?.value,
    paymentStatus: fields.paymentStatus?.value,
    settlementRef: fields.settlementRef?.value,
    warehouseRef: fields.warehouseRef?.value,
    waybillNumber: fields.waybillNumber?.value,
    deliveryCode: fields.deliveryCode?.value,
    deliveryStatus: fields.deliveryStatus?.value,
    waybillRequestedAt: fields.waybillRequestedAt?.value,
  })) as Pick<
    Order,
    | 'status'
    | 'paymentStatus'
    | 'settlementRef'
    | 'warehouseRef'
    | 'waybillNumber'
    | 'deliveryCode'
    | 'deliveryStatus'
    | 'waybillRequestedAt'
  >;
  const [openedAt] = useState(() => Date.now());
  const [box, setBox] = useState(WAYBILL_BOX);
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false);
  const [notice, setNotice] = useState('');

  const made = order.waybillNumber && order.deliveryCode !== DELIVERY_DELETED;
  const blocked = waybillBlock(order);
  // A request kept on the order: another tab's, still going, or one nobody answered.
  const asked = order.waybillRequestedAt
    ? openedAt - Date.parse(order.waybillRequestedAt)
    : null;
  const unanswered = lost || (asked !== null && asked >= WAYBILL_AGAIN_AFTER);
  const going = busy || (asked !== null && !unanswered);

  async function create(again: boolean) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(
        `${config.serverURL}${config.routes.api}/np/waybill`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...box, again }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (body.lost) return setLost(true);
      if (!response.ok)
        return setNotice(body.error ?? `Помилка ${response.status}`);
      setLost(false);
      // The form's own copy too: a later save writes what it holds.
      for (const [path, value] of [
        ['waybillNumber', body.number],
        ['deliveryCode', '1'],
        ['deliveryStatus', body.status],
        ['waybillRequestedAt', null],
      ])
        dispatchFields({ type: 'UPDATE', path, value });
    } catch {
      setNotice('Немає зв’язку. Оновіть сторінку й перевірте, чи є номер');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field-type">
      <h4>Накладна Нової Пошти</h4>
      {order.deliveryStatus && (
        <p
          role="status"
          style={
            DELIVERY_NOT_COLLECTED.includes(order.deliveryCode ?? '')
              ? { color: 'var(--theme-error-500)' }
              : undefined
          }
        >
          {order.deliveryStatus}
          {made && '. Оновлюється раз на добу'}
        </p>
      )}
      {made ? null : !enabled ? (
        <p>Накладні не налаштовані</p>
      ) : blocked ? (
        <p>{blocked}</p>
      ) : (
        <>
          {sizes.map(([name, label]) => (
            <TextInput
              key={name}
              path={`waybill-${name}`}
              label={label}
              value={box[name]}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setBox({ ...box, [name]: event.target.value.replace(',', '.') })
              }
            />
          ))}
          {unanswered && !busy && <p role="alert">{LOST}</p>}
          <Button
            buttonStyle={unanswered ? 'secondary' : 'primary'}
            size="medium"
            margin={false}
            disabled={going}
            onClick={() => create(unanswered)}
          >
            {going
              ? 'Створюю…'
              : unanswered
                ? 'Створити ще раз'
                : 'Створити накладну'}
          </Button>
          {notice && <p role="alert">{notice}</p>}
        </>
      )}
    </div>
  );
};

export default WaybillForm;
