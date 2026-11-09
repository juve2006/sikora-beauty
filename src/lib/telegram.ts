import 'server-only';

import type { Order } from '@/payload-types';
import type { ConsultationRequest } from '@/types';
import { TELEGRAM_TEXT_LIMIT } from '@/lib/constants';
import { formatHryvnias } from '@/lib/utils';
import { telegramAnswer } from '@/lib/validators';

// Messages to the owner's Telegram group: consultation requests and orders. Plain text, no
// `parse_mode`, so whatever a shopper types cannot break the markup.

// The lines a message has, then its link to the admin. A text too long loses the end of its lines,
// never the link: a message puts what the manager needs for the call first.
const withLink = (
  lines: (string | false | null | undefined)[],
  path: string,
  siteUrl: URL,
) => {
  const link = new URL(path, siteUrl).href;
  const text = lines.filter(Boolean).join('\n');
  const room = TELEGRAM_TEXT_LIMIT - link.length - 2;
  return `${text.length > room ? `${text.slice(0, room)}…` : text}\n${link}`;
};

export const consultationMessage = (
  request: Omit<ConsultationRequest, 'answers'> & {
    id: number;
    productName?: string;
    finderAnswers?: string;
  },
  siteUrl: URL,
) =>
  withLink(
    [
      'Новий запит на консультацію',
      `Ім'я: ${request.name}`,
      `Телефон: ${request.phone}`,
      request.productName && `Товар: ${request.productName}`,
      request.locale === 'en' && 'Мова: англійська',
      request.message && `Що турбує: ${request.message}`,
      request.finderAnswers && `Відповіді анкети:\n${request.finderAnswers}`,
    ],
    `/admin/collections/consultation-requests/${request.id}`,
    siteUrl,
  );

const paymentLabels = {
  cod: 'післяплата',
  link: 'посилання на оплату',
  transfer: 'переказ на рахунок',
  card: 'карткою на сайті',
};

const orderLine = ({
  name,
  brand,
  volume,
  quantity,
  price,
  availability,
  madeToOrderDays,
}: Order['lines'][number]) => {
  const product = [name, brand, volume].filter(Boolean).join(', ');
  const days = madeToOrderDays ? `, ${madeToOrderDays} дн.` : '';
  const waits =
    availability === 'made_to_order' ? ` (під замовлення${days})` : '';
  return `- ${product} × ${quantity} — ${formatHryvnias(price * quantity)} грн${waits}`;
};

// An order as it was saved. An address without Nova Poshta's refs was typed by hand, and the
// manager checks it on the call.
export const orderMessage = (order: Order, siteUrl: URL) =>
  withLink(
    [
      `Нове замовлення №${order.id} — ${formatHryvnias(order.total)} грн`,
      `Ім'я: ${order.firstName} ${order.lastName}`,
      `Телефон: ${order.phone}`,
      `Доставка: ${order.settlement}, ${order.warehouse}${order.settlementRef && order.warehouseRef ? '' : ' (введено вручну, перевірити)'}`,
      `Оплата: ${paymentLabels[order.payment]}`,
      order.locale === 'en' && 'Мова: англійська',
      order.comment && `Коментар: ${order.comment}`,
      'Товари:',
      ...order.lines.map(orderLine),
    ],
    `/admin/collections/orders/${order.id}`,
    siteUrl,
  );

// What became of a card's payment: paid or failed, as monobank says, or an invoice mono
// did not make, so the manager sends a link. The number and the sum only: the order's own message
// carries the rest.
export const cardMessage = (
  order: Pick<Order, 'id' | 'total'>,
  event: 'paid' | 'failed' | 'link',
  siteUrl: URL,
) =>
  withLink(
    [
      {
        paid: `Оплачено карткою: замовлення №${order.id}, ${formatHryvnias(order.total)} грн`,
        failed: `Оплата карткою не пройшла: замовлення №${order.id}, ${formatHryvnias(order.total)} грн`,
        link: `Рахунок mono не створився: замовлення №${order.id} — надішліть посилання`,
      }[event],
    ],
    `/admin/collections/orders/${order.id}`,
    siteUrl,
  );

// Without the bot's token and the group's id nothing is sent: what was sent waits in the admin.
export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(
      'Telegram is not set up: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID',
    );
    return;
  }
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  // The error names what Telegram said, never the URL: it carries the token.
  const answer = telegramAnswer.safeParse(
    await response.json().catch(() => undefined),
  );
  if (!answer.data?.ok) {
    throw new Error(
      `Telegram: ${answer.data?.description ?? `HTTP ${response.status}`}`,
    );
  }
}
