// Fails when messages/uk.json and messages/en.json do not have the same keys.
import { readFileSync } from 'node:fs'

const keys = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )

const read = (locale) =>
  new Set(keys(JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))))

const uk = read('uk')
const en = read('en')
const missing = [
  ...[...uk].filter((key) => !en.has(key)).map((key) => `en.json lacks ${key}`),
  ...[...en].filter((key) => !uk.has(key)).map((key) => `uk.json lacks ${key}`),
]

if (missing.length > 0) {
  console.error(missing.join('\n'))
  process.exit(1)
}
console.log(`messages: ${uk.size} keys, same in uk.json and en.json`)
