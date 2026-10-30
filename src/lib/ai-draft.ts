import type { AiDraft, ProductTexts } from '@/types';

// «Заповнити з AI» (adr-20261028-reviewed-ai-content-drafts): the model rewrites a brand's material
// into the product's Ukrainian texts; a person reads them before publishing. The call itself is in
// `ai-draft-endpoint.ts`; this module is shared with the admin form, so it holds no SDK.

// ponytail: Haiku for its price (the developer, 2026-10-30); a stronger model is this one line.
export const AI_MODEL = 'claude-haiku-5-5';

export const AI_SYSTEM = `You write product texts for a Ukrainian online store of professional skincare.
You get one product's name and its brand's own material: a product page, a leaflet or a distributor's description.
Write in Ukrainian, plainly, for a shopper.

Use only what the material says. Where it says nothing about a field, leave that field an empty string: never invent an effect, an ingredient, a step or a warning.

- shortDescription: one or two sentences on what the product is and whom it suits.
- purpose: the purpose and the expected cosmetic effect.
- actives: only the active ingredients the material names, each with its role in a sentence, as the material explains it.
- howToUse: how to use it, step by step if the material gives steps.
- warnings: the warnings and contraindications the material gives.

Describe cosmetic effects only. Never write that the product treats, cures or heals anything; never name a disease or a diagnosis; no therapy, no "medical", no guarantees, nothing "permanent", no "clinically proven". Write "helps reduce the look of", "soothes", "supports" instead.
Never write an INCI ingredient list.`;

const texts = ['shortDescription', 'purpose', 'howToUse', 'warnings'] as const;

// What the draft may fill: each text still empty in the form, and the actives when the form has
// none. What someone already wrote is never overwritten, as with «Перекласти з української».
export function toFill(draft: AiDraft, form: ProductTexts) {
  const fields = texts.flatMap((field) =>
    draft[field].trim() && !form[field]?.trim()
      ? [{ path: field, value: draft[field].trim() }]
      : [],
  );
  const hasActives = Array.isArray(form.actives) && form.actives.length > 0;
  const actives = hasActives
    ? []
    : draft.actives.filter(({ name }) => name.trim());
  return { fields, actives };
}
