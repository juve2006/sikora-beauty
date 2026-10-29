// What «Перекласти з української» fills in a product's other locale: each text still empty there
// whose Ukrainian text exists. What someone already wrote is never overwritten.
const texts = ['name', 'shortDescription', 'purpose', 'howToUse', 'warnings'] as const

type Active = { id?: string | null; name?: string | null; role?: string | null }
// The admin form's data holds an array without rows as its row count, 0.
export type ProductTexts = { [K in (typeof texts)[number]]?: string | null } & { actives?: Active[] | number | null }

// Actives rows are shared by the locales, only their texts are not: rows match by id.
export function toTranslate(uk: ProductTexts, other: ProductTexts): { path: string; text: string }[] {
  const pairs: [path: string, from?: string | null, to?: string | null][] = texts.map((field) => [
    field,
    uk[field],
    other[field],
  ])
  const ukActives = Array.isArray(uk.actives) ? uk.actives : []
  const otherActives = Array.isArray(other.actives) ? other.actives : []
  otherActives.forEach((active, row) => {
    const source = ukActives.find(({ id }) => id === active.id)
    for (const field of ['name', 'role'] as const) pairs.push([`actives.${row}.${field}`, source?.[field], active[field]])
  })
  return pairs.flatMap(([path, from, to]) => (from?.trim() && !to?.trim() ? [{ path, text: from }] : []))
}
