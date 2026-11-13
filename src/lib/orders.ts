import {
  DELIVERY_DELETED,
  FREE_DELIVERY_FROM,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  VOLUME_UNIT_LABELS,
  WAYBILL_STATUSES,
} from '@/lib/constants';
import type { Order, Product } from '@/payload-types';
import type { CartLine, OrderStatus, PaymentStatus } from '@/types';

// An order's arithmetic and its way through, apart from Payload so a test reads them alone.

type Priced = Pick<
  Product,
  | 'id'
  | 'name'
  | 'price'
  | 'volume'
  | 'volumeUnit'
  | 'availability'
  | 'madeToOrderDays'
> & { brand: string };

// The order's lines as the database prices them now, kept as they are (RULES.md: an order keeps a
// snapshot of names and prices), and their sum in kopiyky. A product gone, taken off the store or
// out of stock, or a sum other than the one the shopper was shown, is a cart that changed under
// the order: nothing is ordered, and the shopper looks again.
export function priceOrder(
  lines: CartLine[],
  products: Priced[],
  shown: number,
) {
  const snapshot = [];
  for (const { id, qty } of lines) {
    const product = products.find((product) => product.id === id);
    if (!product || product.availability === 'out_of_stock') return null;
    snapshot.push({
      product: id,
      name: product.name,
      brand: product.brand,
      volume: product.volume
        ? `${product.volume} ${product.volumeUnit ? VOLUME_UNIT_LABELS[product.volumeUnit] : ''}`.trim()
        : undefined,
      price: product.price,
      quantity: qty,
      availability: product.availability,
      madeToOrderDays:
        product.availability === 'made_to_order'
          ? product.madeToOrderDays
          : undefined,
    });
  }
  const total = snapshot.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  return total === shown ? { lines: snapshot, total } : null;
}

const forward = ORDER_STATUSES.filter((status) => status !== 'cancelled');

// An order's status only moves forward (RULES.md): to a later step, or to cancelled before it is
// completed; nothing leaves a completed or a cancelled order. Saving the same status is no move.
export function canMoveStatus(from: OrderStatus, to: OrderStatus) {
  if (from === to) return true;
  if (from === 'completed' || from === 'cancelled') return false;
  if (to === 'cancelled') return true;
  return forward.indexOf(to) > forward.indexOf(from);
}

// Paid ahead, by a transfer or a card, only when every line is in stock: a made-to-order line may
// not come, and its money would go back by hand (adr-20261028-two-step-launch).
export const canPrepay = (lines: { availability?: string | null }[]) =>
  lines.every(({ availability }) => availability === 'in_stock');

// Where a payment may go next: the manager's marks and monobank's word read this. A failed card may
// still be paid — whether mono lets the same invoice be tried again is not known, and a lost payment
// is worse — and a paid one only comes back as a refund. `failed → awaiting` is a card's new invoice
// alone, which `payByCard` writes itself: the hook refuses it as a mark.
const paymentMoves: Record<PaymentStatus, PaymentStatus[]> = {
  awaiting: ['paid', 'failed'],
  failed: ['paid', 'awaiting'],
  paid: ['refunded'],
  refunded: [],
};

// Whether an order is paid only moves forward too: a mistaken mark is told in the note. Saving the
// same status is no move.
export const canMovePayment = (from: PaymentStatus, to: PaymentStatus) =>
  from === to || paymentMoves[from].includes(to);

// The payments that may become `next`: what a statement that moves one asks of the row, so the table
// holds without reading it first.
export const movesTo = (next: PaymentStatus) =>
  PAYMENT_STATUSES.filter((from) => paymentMoves[from].includes(next));

const monoPayments: Partial<Record<string, PaymentStatus>> = {
  success: 'paid',
  failure: 'failed',
  expired: 'failed',
  reversed: 'refunded',
};

// What an invoice's status from monobank makes of an order's payment, or nothing for a status still
// on its way (`created`, `processing`, `hold`). mono moves an invoice only forward itself, so a word
// `movesTo` refuses is a repeat or an old one. `expired` is `failed`: for the shopper and the manager
// alike there is no money, and another try or a call.
export const monoPayment = (status: string) => monoPayments[status];

// Whether the shopper may ask monobank for another invoice: the order is still going, nothing is
// paid, and its invoice was refused or never made.
export const cardRetryable = ({
  payment,
  status,
  paymentStatus,
  monoInvoiceId,
}: Pick<Order, 'payment' | 'status' | 'paymentStatus' | 'monoInvoiceId'>) =>
  payment === 'card' &&
  (status === 'new' || status === 'confirmed') &&
  (paymentStatus === 'failed' ||
    (paymentStatus === 'awaiting' && !monoInvoiceId));

// Why the button may not make this order's waybill, or nothing when it may: the admin's form shows
// the reason and the endpoint refuses by it. A number whose parcel Nova Poshta says was deleted no
// longer counts as a waybill.
export function waybillBlock({
  status,
  paymentStatus,
  settlementRef,
  warehouseRef,
  waybillNumber,
  deliveryCode,
}: Pick<
  Order,
  | 'status'
  | 'paymentStatus'
  | 'settlementRef'
  | 'warehouseRef'
  | 'waybillNumber'
  | 'deliveryCode'
>) {
  if (waybillNumber && deliveryCode !== DELIVERY_DELETED)
    return 'Накладна вже є';
  if (status === 'new') return 'Спершу підтвердьте замовлення';
  if (!(WAYBILL_STATUSES as readonly string[]).includes(status))
    return 'Замовлення вже закрите';
  if (!settlementRef || !warehouseRef)
    return 'Адресу введено вручну: створіть накладну в кабінеті НП і впишіть номер';
  if (paymentStatus !== 'paid') return 'Замовлення ще не оплачене';
  return null;
}

// Who pays Nova Poshta for the waybill: the store from FREE_DELIVERY_FROM on, as the storefront
// promises, the recipient below it. The order's total is its goods alone, in kopiyky.
export const waybillPayer = (total: number) =>
  total >= FREE_DELIVERY_FROM ? 'Sender' : 'Recipient';

// The order's lines as monobank's invoice wants them for the fiscal receipt: each with a code, here
// the product's id — its name once the product is gone — and its price per unit in kopiyky.
export const basketOrder = (lines: Order['lines']) =>
  lines.map(({ name, quantity, price, product }) => ({
    name,
    qty: quantity,
    sum: price,
    total: price * quantity,
    code: String((typeof product === 'object' ? product?.id : product) ?? name),
    unit: 'шт',
  }));
