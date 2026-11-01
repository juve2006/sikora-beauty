import { ROUTINE_STEP_PRODUCTS } from '@/lib/constants';
import type {
  FinderQuestion,
  FinderStep,
  ListingProduct,
  SkinKey,
  SkinTerm,
} from '@/types';

// The care finder's matching (GLOSSARY: Care Finder, Routine): answers → skin terms → products
// that carry them. Pure, so the rules are tested without a database (task `care-finder`).

const SKIN_KEYS: SkinKey[] = ['type', 'condition', 'concern'];

// What the chosen answers mean: every chosen answer's terms, each once. `complete` when each
// question has a chosen answer; an id the questionnaire no longer has counts for nothing.
export function profile(questions: FinderQuestion[], chosen: string[]) {
  const answers = questions
    .flatMap((question) => question.answers)
    .filter((answer) => chosen.includes(answer.id));
  const terms = Object.fromEntries(
    SKIN_KEYS.map((key) => [
      key,
      answers
        .flatMap((answer) => answer.terms[key])
        .filter(
          (term, index, all) =>
            all.findIndex(({ slug }) => slug === term.slug) === index,
        ),
    ]),
  ) as Record<SkinKey, SkinTerm[]>;
  const complete = questions.every((question) =>
    question.answers.some((answer) => chosen.includes(answer.id)),
  );
  return { complete, terms };
}

const shared = (a: string[], b: string[]) =>
  a.filter((slug) => b.includes(slug)).length;

// The routine: per step, up to ROUTINE_STEP_PRODUCTS of its categories' products, the closest to
// the answers first — a shared condition or concern counts one, a named skin type one more — then
// the newest. A product that names skin types but not the shopper's is left out; one that names
// none suits every skin. A product goes to the first step it is shown in.
export function routine<
  T extends Pick<ListingProduct, 'id' | 'createdAt' | 'terms'> & {
    categories: number[];
  },
>(steps: FinderStep[], terms: Record<SkinKey, string[]>, products: T[]) {
  const shown = new Set<number>();
  return steps.map((step) => {
    const picked = products
      .filter(
        (product) =>
          !shown.has(product.id) &&
          product.categories.some((id) => step.categories.includes(id)) &&
          (terms.type.length === 0 ||
            product.terms.type.length === 0 ||
            shared(product.terms.type, terms.type) > 0),
      )
      .map((product) => ({
        product,
        score:
          shared(product.terms.condition, terms.condition) +
          shared(product.terms.concern, terms.concern) +
          Math.min(shared(product.terms.type, terms.type), 1),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.product.createdAt.localeCompare(a.product.createdAt),
      )
      .slice(0, ROUTINE_STEP_PRODUCTS)
      .map(({ product }) => product);
    picked.forEach(({ id }) => shown.add(id));
    return { ...step, products: picked };
  });
}

// The answers as a consultation request keeps them: each answered question with its chosen
// answers, one per line, so the cosmetologist reads them as they were after the questionnaire
// changes.
export const answersText = (questions: FinderQuestion[], chosen: string[]) =>
  questions
    .flatMap(({ question, answers }) => {
      const labels = answers
        .filter((answer) => chosen.includes(answer.id))
        .map(({ label }) => label);
      return labels.length > 0 ? [`${question} — ${labels.join(', ')}`] : [];
    })
    .join('\n');
