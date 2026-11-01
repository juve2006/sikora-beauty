import 'server-only';

import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

import type { Config } from '@/payload-types';
import type { Finder, FinderStep, SkinKey, SkinTerm } from '@/types';
import { getListingProducts } from '@/lib/actions/product.actions';
import { routine } from '@/lib/finder';

// The storefront's reads of the care finder (GLOSSARY): the questionnaire in the page's language,
// and the routine its answers lead to — published products in stock only.

type Locale = Config['locale'];

const skinTerms = (
  terms:
    (number | { slug?: string | null; title: string })[] | null | undefined,
): SkinTerm[] =>
  (terms ?? []).flatMap((term) =>
    typeof term === 'object' && term.slug
      ? [{ slug: term.slug, title: term.title }]
      : [],
  );

const ids = (items: (number | { id: number })[]) =>
  items.map((item) => (typeof item === 'object' ? item.id : item));

// Whether the care finder is on: the header's menu offers it then. Cached per request.
export const isFinderOn = cache(async () => {
  const payload = await getPayload({ config });
  const { enabled } = await payload.findGlobal({
    slug: 'care-finder',
    depth: 0,
    overrideAccess: false,
    select: { enabled: true },
  });
  return Boolean(enabled);
});

// Cached per request: the page and its metadata read the same questionnaire.
export const getFinder = cache(async (locale: Locale): Promise<Finder> => {
  const payload = await getPayload({ config });
  const finder = await payload.findGlobal({
    slug: 'care-finder',
    locale,
    depth: 1,
    overrideAccess: false,
    populate: {
      'skin-types': { slug: true, title: true },
      'skin-conditions': { slug: true, title: true },
      'skin-concerns': { slug: true, title: true },
      categories: { slug: true },
    },
  });
  return {
    enabled: Boolean(finder.enabled),
    questions: (finder.questions ?? []).flatMap((question) =>
      question.id
        ? [
            {
              id: question.id,
              question: question.question,
              hint: question.hint ?? undefined,
              multiple: Boolean(question.multiple),
              answers: (question.answers ?? []).flatMap((answer) =>
                answer.id
                  ? [
                      {
                        id: answer.id,
                        label: answer.label,
                        terms: {
                          type: skinTerms(answer.skinTypes),
                          condition: skinTerms(answer.skinConditions),
                          concern: skinTerms(answer.skinConcerns),
                        },
                      },
                    ]
                  : [],
              ),
            },
          ]
        : [],
    ),
    steps: (finder.steps ?? []).flatMap((step) =>
      step.id
        ? [{ id: step.id, title: step.title, categories: ids(step.categories) }]
        : [],
    ),
  };
});

// The routine for the answers' terms: per step, the closest products of its categories.
export async function getRoutine(
  steps: FinderStep[],
  terms: Record<SkinKey, SkinTerm[]>,
  locale: Locale,
) {
  const categories = steps.flatMap((step) => step.categories);
  const products =
    categories.length > 0
      ? await getListingProducts(
          {
            and: [
              { availability: { equals: 'in_stock' } },
              { categories: { in: categories } },
            ],
          },
          locale,
        )
      : [];
  const slugs = (key: SkinKey) => terms[key].map(({ slug }) => slug);
  return routine(
    steps,
    {
      type: slugs('type'),
      condition: slugs('condition'),
      concern: slugs('concern'),
    },
    products,
  );
}
