'use server';

import config from '@payload-config';
import { after } from 'next/server';
import { getPayload } from 'payload';

import type { ConsultationState } from '@/types';
import { getFinder } from '@/lib/actions/finder.actions';
import { SITE_URL } from '@/lib/constants';
import { answersText } from '@/lib/finder';
import { consultationMessage, sendTelegram } from '@/lib/telegram';
import { verifyTurnstile } from '@/lib/turnstile';
import { parseConsultationForm } from '@/lib/validators';

// The one way a consultation request is created (the collection's `create` is closed to everyone):
// the form's fields, then Turnstile, then the record — with the Local API's access skipped, as only
// this action writes. Telegram is told after the answer: a request it does not get still waits in
// the admin, so the shopper is never told it failed.
export async function requestConsultation(
  _: ConsultationState,
  form: FormData,
): Promise<ConsultationState> {
  const parsed = parseConsultationForm(form);
  if (!parsed.data) return { status: 'invalid', errors: parsed.errors };
  const { token, answers, ...request } = parsed.data;
  if (!(await verifyTurnstile(token))) return { status: 'failed' };

  try {
    const payload = await getPayload({ config });
    // A product that is gone or not published is dropped; the request is kept.
    const [product] = request.product
      ? (
          await payload.find({
            collection: 'products',
            where: { id: { equals: request.product } },
            locale: request.locale,
            select: { name: true },
            depth: 0,
            limit: 1,
            overrideAccess: false,
          })
        ).docs
      : [];
    // The care finder's answers as the questionnaire reads them now, in Ukrainian for the
    // cosmetologist; ids it no longer has are dropped.
    const finderAnswers =
      answers.length > 0
        ? answersText((await getFinder('uk')).questions, answers)
        : '';
    const { id } = await payload.create({
      collection: 'consultation-requests',
      data: {
        ...request,
        product: product?.id,
        finderAnswers: finderAnswers || undefined,
        status: 'new',
      },
    });
    after(() =>
      sendTelegram(
        consultationMessage(
          { ...request, id, productName: product?.name },
          SITE_URL,
        ),
      ).catch((error) => console.error('Telegram:', error)),
    );
    return { status: 'sent' };
  } catch (error) {
    // Only what went wrong: a failed query carries its params, and the database's detail the
    // failing row — the shopper's name and phone.
    const { message, cause } = error as {
      message?: string;
      cause?: { message?: string };
    };
    console.error(
      'Consultation request:',
      cause?.message ?? message?.split('\n')[0],
    );
    return { status: 'failed' };
  }
}
