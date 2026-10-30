import Anthropic from '@anthropic-ai/sdk';
import type { PayloadRequest } from 'payload';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiDraftEndpoint } from '@/collections/ai-draft-endpoint';
import { Products, requireReview } from '@/collections/products';
import { toFill } from '@/lib/ai-draft';
import { medicalClaims } from '@/lib/claims';
import { aiDraft, aiDraftRequest } from '@/lib/validators';

const draft = {
  shortDescription: 'Легкий крем для сухої шкіри.',
  purpose: 'Зволожує і заспокоює.',
  actives: [
    { name: 'Гіалуронова кислота', role: 'Утримує вологу.' },
    { name: ' ', role: 'Без назви — не рядок.' },
  ],
  howToUse: 'Нанесіть увечері.',
  warnings: '',
};

describe('the wording checklist', () => {
  it('finds the words of a medical claim, in either language', () => {
    expect(
      medicalClaims(
        'Лікує акне та ДЕРМАТИТ, гарантовано назавжди. Cures eczema; clinically proven.',
      ),
    ).toEqual([
      'лікує',
      'дерматит',
      'гарантовано',
      'назавжди',
      'cures',
      'eczema',
      'clinically proven',
    ]);
    expect(
      medicalClaims('Протизапальна дія; anti-inflammatory; heals'),
    ).toEqual(['протизапальна', 'anti-inflammatory', 'heals']);
  });

  it('leaves cosmetic words alone', () => {
    expect(
      medicalClaims(
        'Здорова на вигляд шкіра. A healthy glow; a night treatment; кліренс; лікар-косметолог радить.',
      ),
    ).toEqual([]);
  });

  it('names a word once', () => {
    expect(medicalClaims('лікує, лікує')).toEqual(['лікує']);
  });
});

describe('«Заповнити з AI»', () => {
  it('fills only the empty texts, and the actives when there are none', () => {
    const { fields, actives } = toFill(draft, {
      purpose: 'Написала косметолог.',
      howToUse: '  ',
      actives: 0,
    });
    expect(fields).toEqual([
      { path: 'shortDescription', value: 'Легкий крем для сухої шкіри.' },
      { path: 'howToUse', value: 'Нанесіть увечері.' },
    ]);
    expect(actives).toEqual([draft.actives[0]]);
  });

  it('never adds actives to a product that has them', () => {
    expect(
      toFill(draft, { actives: [{ id: 'a', name: 'Ніацинамід' }] }).actives,
    ).toEqual([]);
  });

  it('has no INCI to give: the answer carries none', () => {
    expect(Object.keys(aiDraft.shape)).not.toContain('inci');
    expect(aiDraft.parse({ ...draft, inci: 'AQUA' })).not.toHaveProperty(
      'inci',
    );
  });

  it('asks for a name and some material', () => {
    expect(
      aiDraftRequest.safeParse({ name: 'Крем', material: 'коротко' }).success,
    ).toBe(false);
    expect(
      aiDraftRequest.safeParse({ name: ' ', material: 'а'.repeat(200) })
        .success,
    ).toBe(false);
    expect(
      aiDraftRequest.safeParse({ name: 'Крем', material: 'а'.repeat(200) })
        .success,
    ).toBe(true);
  });
});

describe('the AI endpoint', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const call = (user: object | null, body: unknown) =>
    aiDraftEndpoint.handler({
      user,
      json: async () => body,
    } as unknown as PayloadRequest);
  const cosmetologist = { id: 2, role: 'cosmetologist' };
  const body = { name: 'Крем', material: 'Матеріал бренду. '.repeat(10) };

  it('answers only an admin role', async () => {
    expect((await call(null, body)).status).toBe(403);
    expect((await call({ id: 3 }, body)).status).toBe(403);
  });

  it('says AI is not set up without a key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const response = await call(cosmetologist, body);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/AI не налаштовано/);
  });

  it('refuses short material before calling the model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const parse = vi.spyOn(Anthropic.Messages.prototype, 'parse');
    const response = await call(cosmetologist, { name: 'Крем', material: 'x' });
    expect(response.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it('returns the parsed draft, and a refusal as an error', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const parse = vi
      .spyOn(Anthropic.Messages.prototype, 'parse')
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        parsed_output: draft,
      } as never)
      .mockResolvedValueOnce({
        stop_reason: 'refusal',
        parsed_output: null,
      } as never);
    const response = await call(cosmetologist, body);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(draft);
    expect(parse.mock.calls[0][0]).toMatchObject({
      model: 'claude-haiku-5-5',
      messages: [{ role: 'user', content: expect.stringContaining('Крем') }],
    });
    expect((await call(cosmetologist, body)).status).toBe(502);
  });
});

describe('publishing a draft that waits for review', () => {
  const run = (
    data: Record<string, unknown>,
    originalDoc?: Record<string, unknown>,
  ) =>
    requireReview({
      data,
      originalDoc,
      req: { t: (key: string) => key },
    } as never);

  it('runs on every save of a product', () => {
    expect(Products.hooks!.beforeChange).toContain(requireReview);
  });

  it('keeps the status from being cleared in the admin', () => {
    // Cleared, an AI draft would read as a product from before the statuses and publish.
    const review = Products.fields.find(
      (field) => 'name' in field && field.name === 'review',
    );
    expect(review).toMatchObject({ admin: { isClearable: false } });
  });

  it('refuses to publish an AI or imported draft', () => {
    for (const review of ['ai', 'imported'])
      expect(() => run({ _status: 'published', review })).toThrow();
  });

  it('publishes a reviewed product, and one from before the statuses', () => {
    expect(run({ _status: 'published', review: 'reviewed' })).toBeTruthy();
    expect(run({ _status: 'published', review: null })).toBeTruthy();
  });

  it('keeps the status a partial update does not send', () => {
    expect(() =>
      run({ _status: 'published', price: 50000 }, { review: 'ai' }),
    ).toThrow();
    expect(
      run({ _status: 'published', price: 50000 }, { review: 'reviewed' }),
    ).toBeTruthy();
  });

  it('saves any draft', () => {
    expect(run({ _status: 'draft', review: 'ai' })).toBeTruthy();
  });
});
