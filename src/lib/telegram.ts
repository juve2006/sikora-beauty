import 'server-only';

import type { ConsultationRequest } from '@/types';
import { telegramAnswer } from '@/lib/validators';

// Messages to the owner's Telegram group: consultation requests now, orders later. Plain text, no
// `parse_mode`, so whatever a shopper types cannot break the markup.

export const consultationMessage = (
  request: ConsultationRequest & { id: number; productName?: string },
  siteUrl: URL,
) =>
  [
    'Новий запит на консультацію',
    `Ім'я: ${request.name}`,
    `Телефон: ${request.phone}`,
    request.productName && `Товар: ${request.productName}`,
    request.locale === 'en' && 'Мова: англійська',
    request.message && `Що турбує: ${request.message}`,
    new URL(`/admin/collections/consultation-requests/${request.id}`, siteUrl)
      .href,
  ]
    .filter(Boolean)
    .join('\n');

// Without the bot's token and the group's id nothing is sent: the request waits in the admin.
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
