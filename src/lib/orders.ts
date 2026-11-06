import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  VOLUME_UNIT_LABELS,
} from '@/lib/constants';
import type { Product } from '@/payload-types';
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

// Paid ahead, by a transfer, only when every line is in stock: a made-to-order line may not come,
// and its money would go back by hand (adr-20261028-two-step-launch).
export const canPrepay = (lines: { availability?: string | null }[]) =>
  lines.every(({ availability }) => availability === 'in_stock');

// Whether an order is paid only moves forward too: a mistaken mark is told in the note.
export const canMovePayment = (from: PaymentStatus, to: PaymentStatus) =>
  PAYMENT_STATUSES.indexOf(to) >= PAYMENT_STATUSES.indexOf(from);
