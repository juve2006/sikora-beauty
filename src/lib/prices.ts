import { z } from 'zod'

import { formatHryvnias, parseHryvnias } from './price'

// The owner's price list: every product's price as a CSV, edited in Excel or Google Sheets and
// uploaded back (task `catalog-import`). Only `slug` and `price` are read; the rest is for people.

export type PricedProduct = {
  id: number
  slug: string
  name: string
  brand: string
  volume: string
  price: number | null
  // The latest version is a draft: a new price reaches the storefront once it is published.
  draft: boolean
}

const columns = ['slug', 'name', 'brand', 'volume', 'price'] as const

const cell = (value: string) => (/[;",\n\r]|^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

// `;` is Excel's separator in Ukrainian; the BOM makes it read UTF-8, so the names are not garbled.
export function toCsv(products: PricedProduct[]): string {
  const rows = products.map((product) =>
    columns.map((column) =>
      column === 'price' ? (product.price === null ? '' : formatHryvnias(product.price)) : cell(product[column]),
    ),
  )
  return '﻿' + [columns, ...rows].map((row) => row.join(';')).join('\r\n') + '\r\n'
}

// RFC 4180 with the separator of the header line: Excel writes `;`, Google Sheets `,`.
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, '')
  const separator = /[;,]/.exec(input.split(/\r?\n/, 1)[0])?.[0] ?? ';'
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (quoted) {
      if (char !== '"') value += char
      else if (input[i + 1] === '"') value += input[++i]
      else quoted = false
    } else if (char === '"') quoted = true
    else if (char === separator) {
      row.push(value)
      value = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++
      rows.push([...row, value])
      row = []
      value = ''
    } else value += char
  }
  if (value || row.length) rows.push([...row, value])
  return rows
}

const priceRow = z.object({
  slug: z.string().trim().min(1, 'Немає адреси товару (slug)'),
  // An empty cell leaves the price as it is.
  price: z
    .string()
    .trim()
    .refine((value) => value === '' || parseHryvnias(value) !== null, 'Ціна — не сума в гривнях, як 1245 або 1245,50')
    .transform((value) => (value === '' ? null : parseHryvnias(value))),
})

export type PriceChange = { id: number; slug: string; name: string; from: number | null; to: number; draft: boolean }
export type PricePlan = { changes: PriceChange[]; errors: { line: number; message: string }[] }

// Every change the file asks for, and every row it cannot apply. A file with errors is applied not
// at all: a half-applied price list is harder to see than a refused one.
export function planPrices(text: string, products: PricedProduct[]): PricePlan {
  const [header = [], ...rows] = parseCsv(text)
  const names = header.map((name) => name.trim().toLowerCase())
  const slugAt = names.indexOf('slug')
  const priceAt = names.indexOf('price')
  if (slugAt < 0 || priceAt < 0) {
    return { changes: [], errors: [{ line: 1, message: 'У першому рядку немає стовпців slug і price' }] }
  }
  const bySlug = new Map(products.map((product) => [product.slug, product]))
  const seen = new Map<string, number>()
  const plan: PricePlan = { changes: [], errors: [] }
  rows.forEach((row, index) => {
    const line = index + 2
    if (row.every((value) => !value.trim())) return
    const parsed = priceRow.safeParse({ slug: row[slugAt] ?? '', price: row[priceAt] ?? '' })
    if (!parsed.success) return plan.errors.push({ line, message: parsed.error.issues[0].message })
    const { slug, price } = parsed.data
    const product = bySlug.get(slug)
    if (!product) return plan.errors.push({ line, message: `Товару з адресою «${slug}» немає` })
    if (seen.has(slug)) return plan.errors.push({ line, message: `Товар «${slug}» уже є в рядку ${seen.get(slug)}` })
    seen.set(slug, line)
    if (price !== null && price !== product.price) {
      plan.changes.push({ id: product.id, slug, name: product.name, from: product.price, to: price, draft: product.draft })
    }
  })
  return plan
}
