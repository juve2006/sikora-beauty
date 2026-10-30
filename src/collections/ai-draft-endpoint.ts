import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { Endpoint } from 'payload';

import { hasRole } from '@/lib/access';
import { AI_MODEL, AI_SYSTEM } from '@/lib/ai-draft';
import { aiDraft, aiDraftRequest } from '@/lib/validators';

// «Заповнити з AI» (ai-draft.tsx): drafts a product's texts from its brand's material and writes
// nothing — the form shows the draft, a person reads it (adr-20261028-reviewed-ai-content-drafts).
// Either role: both fill in the catalog.

const answer = (error: string, status: number) =>
  Response.json({ error }, { status });

function failure(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError)
    return 'ключ ANTHROPIC_API_KEY недійсний';
  if (error instanceof Anthropic.RateLimitError)
    return 'забагато запитів, спробуйте за хвилину';
  if (error instanceof Anthropic.APIError)
    return `відповів ${error.status}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

export const aiDraftEndpoint: Endpoint = {
  path: '/ai-draft',
  method: 'post',
  handler: async (req) => {
    if (!hasRole({ req }))
      return answer('Лише для власника чи косметолога', 403);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
      return answer('AI не налаштовано: немає ANTHROPIC_API_KEY', 503);
    const body = aiDraftRequest.safeParse(await req.json?.().catch(() => null));
    if (!body.success) return answer(body.error.issues[0].message, 400);
    const { name, material } = body.data;
    try {
      // Well inside a function's time; a request that hangs fails instead of using it up.
      const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
      const response = await client.messages.parse({
        model: AI_MODEL,
        max_tokens: 16_000,
        system: AI_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Product: ${name}\n\nBrand material:\n${material}`,
          },
        ],
        // The answer is input from outside too (RULES.md): parsed against the schema, or null.
        output_config: { format: zodOutputFormat(aiDraft) },
      });
      if (response.stop_reason === 'refusal')
        return answer('AI відмовився писати цей текст: заповніть вручну', 502);
      if (!response.parsed_output)
        return answer(
          'AI повернув незрозумілу відповідь: спробуйте ще раз',
          502,
        );
      return Response.json(response.parsed_output);
    } catch (error) {
      return answer(`AI: ${failure(error)}`, 502);
    }
  },
};
