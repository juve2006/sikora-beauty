// Prices are stored as integer kopiyky (RULES.md); people read and type hryvnias.

export function formatHryvnias(kopiyky: number): string {
  const hryvnias = Math.trunc(kopiyky / 100)
  const rest = kopiyky % 100
  return rest === 0 ? String(hryvnias) : `${hryvnias},${String(rest).padStart(2, '0')}`
}

// schema.org's price: a dot and two decimals, still from integers — 124550 → "1245.50".
export function offerPrice(kopiyky: number): string {
  return `${Math.trunc(kopiyky / 100)}.${String(kopiyky % 100).padStart(2, '0')}`
}

// "1245", "1 245,5", "1245.50" → 124550; anything else → null.
export function parseHryvnias(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.replace(/\s/g, ''))
  if (!match) return null
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}
