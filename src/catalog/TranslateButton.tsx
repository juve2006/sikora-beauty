'use client'

import { Button, useConfig, useDocumentInfo, useForm, useLocale } from '@payloadcms/ui'
import { useState } from 'react'

import { type ProductTexts, toTranslate } from './translate'

// Chrome's built-in Translator API (Chrome 138+ and Edge on desktop): free, no key, the text never
// leaves the machine. TypeScript's DOM types do not have it yet.
type Translator = { translate(text: string): Promise<string> }
declare const Translator: {
  availability(languages: Languages): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
  create(options: Languages & { monitor?(monitor: EventTarget): void }): Promise<Translator>
}
type Languages = { sourceLanguage: string; targetLanguage: string }

// In a locale other than uk: fills the product's empty texts from its Ukrainian version. It saves
// nothing — the cosmetologist reads the result, then saves or publishes it
// (adr-20261028-reviewed-ai-content-drafts).
export const TranslateButton = () => {
  const locale = useLocale()
  const { id, collectionSlug } = useDocumentInfo()
  const { config } = useConfig()
  const { getData, dispatchFields, setModified } = useForm()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  if (locale.code === 'uk') return null

  async function translate() {
    setBusy(true)
    try {
      if (!('Translator' in self)) return setStatus('Переклад працює в Chrome на комп’ютері')
      if (!id) return setStatus('Спершу збережіть товар українською')
      const languages = { sourceLanguage: 'uk', targetLanguage: locale.code }
      if ((await Translator.availability(languages)) === 'unavailable') {
        return setStatus('Chrome не перекладає з української на цю мову')
      }
      // Before the fetch: a first download needs the click, and the click does not last long.
      const translator = await Translator.create({
        ...languages,
        monitor: (monitor) =>
          monitor.addEventListener('downloadprogress', (event) =>
            setStatus(`Завантажую мовну модель… ${Math.round((event as ProgressEvent).loaded * 100)}%`),
          ),
      })
      const url = `${config.serverURL}${config.routes.api}/${collectionSlug}/${id}?locale=uk&fallback-locale=none&draft=true&depth=0`
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) throw new Error(`українська версія недоступна (${response.status})`)
      const jobs = toTranslate((await response.json()) as ProductTexts, getData() as ProductTexts)
      if (!jobs.length) return setStatus('Усі поля вже заповнені або українські порожні')
      setStatus('Перекладаю…')
      // All or nothing: a field filled before a failure would sit in an unmodified form, and leaving
      // the page would drop it without a warning.
      const values = await Promise.all(jobs.map(({ text }) => translator.translate(text)))
      jobs.forEach(({ path }, index) => dispatchFields({ type: 'UPDATE', path, value: values[index] }))
      setModified(true)
      setStatus(`Перекладено полів: ${jobs.length}. Перевірте їх перед публікацією.`)
    } catch (error) {
      setStatus(`Не вдалося перекласти: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field-type">
      <Button buttonStyle="secondary" size="medium" margin={false} disabled={busy} onClick={translate}>
        Перекласти з української
      </Button>
      <p role="status">{status}</p>
    </div>
  )
}
