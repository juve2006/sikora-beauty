import { describe, expect, it, vi } from 'vitest';

import { isFinderOn } from '@/lib/actions/finder.actions';
import { answersText, profile, routine } from '@/lib/finder';
import type { FinderAnswer, FinderQuestion, ListingProduct } from '@/types';
import { finderAnswers } from '@/lib/validators';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));

const payload = { findGlobal: vi.fn() };
vi.mock('payload', async (original) => ({
  ...(await original<typeof import('payload')>()),
  getPayload: async () => payload,
}));

const id = (n: number) => n.toString(16).padStart(24, '0');
const term = (slug: string) => ({ slug, title: slug });

const answer = (
  n: number,
  label: string,
  terms: Partial<Record<keyof FinderAnswer['terms'], string[]>> = {},
): FinderAnswer => ({
  id: id(n),
  label,
  terms: {
    type: (terms.type ?? []).map(term),
    condition: (terms.condition ?? []).map(term),
    concern: (terms.concern ?? []).map(term),
  },
});

const questions: FinderQuestion[] = [
  {
    id: id(100),
    question: 'Тип шкіри?',
    multiple: false,
    answers: [
      answer(1, 'Суха', { type: ['dry'] }),
      answer(2, 'Жирна', { type: ['oily'] }),
      answer(3, 'Не знаю'),
    ],
  },
  {
    id: id(200),
    question: 'Що покращити?',
    multiple: true,
    answers: [
      answer(4, 'Пігментація', { concern: ['pigmentation'] }),
      answer(5, 'Зневоднення', {
        condition: ['dehydrated'],
        concern: ['dehydration'],
      }),
      answer(6, 'Нічого'),
    ],
  },
];

const product = (
  n: number,
  categories: number[],
  terms: Partial<ListingProduct['terms']> = {},
) => ({
  id: n,
  categories,
  createdAt: `2026-10-${String(n).padStart(2, '0')}T00:00:00.000Z`,
  terms: { type: [], condition: [], concern: [], brand: [], ...terms },
});

const steps = [
  { id: 's1', title: 'Очищення', categories: [10] },
  { id: 's2', title: 'Сироватка', categories: [20] },
  { id: 's3', title: 'SPF', categories: [30] },
];
const ids = (result: ReturnType<typeof routine>) =>
  result.map((step) => step.products.map((item) => item.id));

describe('profile', () => {
  it('joins the terms of every chosen answer, each once', () => {
    const { complete, terms } = profile(questions, [id(1), id(4), id(5)]);
    expect(complete).toBe(true);
    expect(terms).toEqual({
      type: [term('dry')],
      condition: [term('dehydrated')],
      concern: [term('pigmentation'), term('dehydration')],
    });
  });

  it('is complete only when every question has a chosen answer', () => {
    expect(profile(questions, [id(1)]).complete).toBe(false);
    expect(profile(questions, [id(3), id(6)]).complete).toBe(true);
  });

  it('ignores an id the questionnaire no longer has', () => {
    const { complete, terms } = profile(questions, [id(1), id(99)]);
    expect(complete).toBe(false);
    expect(terms.type).toEqual([term('dry')]);
  });
});

describe('routine', () => {
  const dry = { type: ['dry'], condition: [], concern: ['pigmentation'] };

  it('leaves out a product that names other skin types, keeps one that names none', () => {
    const result = routine(steps, dry, [
      product(1, [10], { type: ['oily'] }),
      product(2, [10]),
      product(3, [10], { type: ['dry', 'oily'] }),
    ]);
    expect(ids(result)[0]).toEqual([3, 2]);
  });

  it('puts the closest first, then the newest, and stops at two', () => {
    const result = routine(steps, dry, [
      product(1, [20], { concern: ['pigmentation'] }),
      product(2, [20]),
      product(3, [20]),
      product(4, [20], { type: ['dry'], concern: ['pigmentation'] }),
    ]);
    expect(ids(result)[1]).toEqual([4, 1]);
  });

  it('gives a product to the first step it fits only', () => {
    const result = routine(steps, dry, [
      product(1, [10, 20]),
      product(2, [20]),
    ]);
    expect(ids(result)).toEqual([[1], [2], []]);
  });

  it('keeps a step with nothing to show, in the steps’ order', () => {
    const result = routine(steps, dry, [product(1, [30])]);
    expect(result.map((step) => step.title)).toEqual([
      'Очищення',
      'Сироватка',
      'SPF',
    ]);
    expect(ids(result)).toEqual([[], [], [1]]);
  });

  it('suits every product when no skin type was named', () => {
    const none = { type: [], condition: [], concern: [] };
    const result = routine(steps, none, [product(1, [10], { type: ['oily'] })]);
    expect(ids(result)[0]).toEqual([1]);
  });
});

describe('answersText', () => {
  it('writes each answered question with its chosen answers, one per line', () => {
    expect(answersText(questions, [id(2), id(4), id(5)])).toBe(
      'Тип шкіри? — Жирна\nЩо покращити? — Пігментація, Зневоднення',
    );
  });

  it('is empty for no answers the questionnaire has', () => {
    expect(answersText(questions, [id(99)])).toBe('');
  });
});

describe('finderAnswers', () => {
  it('reads comma-joined answer ids', () => {
    expect(finderAnswers.parse(`${id(1)},${id(4)}`)).toEqual([id(1), id(4)]);
  });

  it('reads anything else as no answers', () => {
    expect(finderAnswers.parse(undefined)).toEqual([]);
    expect(finderAnswers.parse('')).toEqual([]);
    expect(finderAnswers.parse(`${id(1)},<script>`)).toEqual([]);
    expect(
      finderAnswers.parse(Array.from({ length: 51 }, (_, n) => id(n)).join()),
    ).toEqual([]);
  });
});

describe('isFinderOn', () => {
  // The header's menu offers the care finder only once it is turned on in the admin.
  it('is on only when the admin ticked «Показувати на сайті»', async () => {
    payload.findGlobal.mockResolvedValueOnce({ enabled: null });
    expect(await isFinderOn()).toBe(false);
    payload.findGlobal.mockResolvedValueOnce({ enabled: true });
    expect(await isFinderOn()).toBe(true);
    expect(payload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'care-finder', overrideAccess: false }),
    );
  });
});
