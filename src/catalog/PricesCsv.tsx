'use client'

import { Button, useConfig } from '@payloadcms/ui'
import { type ChangeEvent, useState } from 'react'

import { formatHryvnias } from './price'
import type { PricePlan } from './prices'

const hryvnias = (kopiyky: number | null) => (kopiyky === null ? '—' : `${formatHryvnias(kopiyky)} грн`)
const cell = { padding: 'calc(var(--base) / 4) calc(var(--base) / 2)', textAlign: 'left' as const }

// The owner's price list: download, edit the `price` column, upload, check every change, apply.
// A file with an error is applied not at all.
export const PricesCsv = () => {
  const { config } = useConfig()
  const api = `${config.serverURL}${config.routes.api}/products/prices`
  const [file, setFile] = useState<string | null>(null)
  const [plan, setPlan] = useState<PricePlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  // A new key empties the file input after applying or cancelling.
  const [inputKey, setInputKey] = useState(0)

  async function send(text: string, apply: boolean) {
    setBusy(true)
    setStatus(apply ? 'Застосовую…' : 'Перевіряю файл…')
    try {
      const response = await fetch(apply ? `${api}?apply=1` : api, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? response.statusText)
      if (apply && body.applied !== undefined) {
        setStatus(`Оновлено цін: ${body.applied}.`)
        reset()
      } else {
        setPlan(body)
        setStatus(body.errors.length ? '' : body.changes.length ? '' : 'Жодна ціна не змінилась.')
      }
    } catch (error) {
      setStatus(`Не вдалося: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setFile(null)
    setPlan(null)
    setInputKey((key) => key + 1)
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0]
    if (!chosen) return
    const text = await chosen.text()
    setFile(text)
    await send(text, false)
  }

  return (
    <section>
      <h2>Ціни в CSV</h2>
      <p>
        Завантажте файл, змініть ціни в Excel чи Google Таблицях — стовпець price, у гривнях — і завантажте його назад.
        Зміниться лише ціна. Збережіть завантажений файл: повернений назад, він скасує зміни.
      </p>
      <div style={{ display: 'flex', gap: 'var(--base)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button el="anchor" url={api} buttonStyle="secondary" margin={false}>
          Завантажити ціни (CSV)
        </Button>
        <label>
          {'Завантажити змінений файл: '}
          <input key={inputKey} type="file" accept=".csv,text/csv" disabled={busy} onChange={choose} />
        </label>
      </div>
      <p role="status">{status}</p>
      {plan && plan.errors.length > 0 && (
        <>
          <p>Файл не застосовано — виправте ці рядки й завантажте його знову:</p>
          <ul>
            {plan.errors.map((error) => (
              <li key={error.line}>{`Рядок ${error.line}: ${error.message}`}</li>
            ))}
          </ul>
        </>
      )}
      {plan && plan.changes.length > 0 && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={cell}>Товар</th>
                  <th style={cell}>Було</th>
                  <th style={cell}>Стане</th>
                </tr>
              </thead>
              <tbody>
                {plan.changes.map((change) => (
                  <tr key={change.id} style={{ borderTop: '1px solid var(--theme-elevation-100)' }}>
                    <td style={cell}>
                      {change.name}
                      {change.draft && ' (чернетка — на сайті після публікації)'}
                    </td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{hryvnias(change.from)}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{hryvnias(change.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 'var(--base)', marginTop: 'var(--base)' }}>
            <Button margin={false} disabled={busy || plan.errors.length > 0} onClick={() => file && send(file, true)}>
              {`Застосувати (${plan.changes.length})`}
            </Button>
            <Button buttonStyle="secondary" margin={false} disabled={busy} onClick={reset}>
              Скасувати
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
