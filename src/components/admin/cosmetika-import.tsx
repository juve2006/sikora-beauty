'use client';

import { Button, useConfig } from '@payloadcms/ui';
import { useState } from 'react';

type Planned = {
  id: number;
  name: string;
  exists: boolean;
  warnings: string[];
};

type Plan = { products: Planned[]; errors: { id: unknown; message: string }[] };

type Result = {
  id: number;
  name?: string;
  status: 'created' | 'skipped' | 'failed';
  message?: string;
};

// Five products are about a dozen photos: one request takes seconds, well inside a function's time.
const portion = 5;

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// Creates drafts of the products cosmetika.com.ua has of our brands and we do not. The page sends
// them a portion at a time; leaving it stops the import, and «Перевірити» shows what is left.
const CosmetikaImport = () => {
  const { config } = useConfig();
  const api = `${config.serverURL}${config.routes.api}/products/cosmetika`;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const fresh = plan?.products.filter((product) => !product.exists) ?? [];
  const failed = results.filter((result) => result.status === 'failed');

  async function check() {
    setBusy(true);
    setResults([]);
    setStatus('Читаю cosmetika.com.ua…');
    try {
      const response = await fetch(api, { credentials: 'include' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? response.statusText);
      setPlan(body);
      setStatus('');
    } catch (error) {
      setStatus(`Не вдалося: ${message(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    const ids = fresh.map((product) => product.id);
    const done: Result[] = [];
    setBusy(true);
    try {
      for (let start = 0; start < ids.length; start += portion) {
        setStatus(`Імпортовано ${start} з ${ids.length}…`);
        const response = await fetch(api, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids.slice(start, start + portion) }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? response.statusText);
        done.push(...body.results);
        setResults([...done]);
      }
      const count = (status: Result['status']) =>
        done.filter((result) => result.status === status).length;
      setStatus(
        `Готово. Створено чернеток: ${count('created')}, вже були: ${count('skipped')}, не вдалося: ${count('failed')}.`,
      );
      setPlan(null);
    } catch (error) {
      setStatus(
        `Зупинено: ${message(error)}. «Перевірити» покаже, що лишилось.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Товари з cosmetika.com.ua</h2>
      <p>
        Створює чернетки товарів Dr. Spiller, Instytutum і Braderm з фото,
        описом і ціною. Товари, що вже є, не змінює. Наявність виставляє власник
        перед публікацією.
      </p>
      <div style={{ display: 'flex', gap: 'var(--base)', flexWrap: 'wrap' }}>
        <Button
          buttonStyle="secondary"
          margin={false}
          disabled={busy}
          onClick={check}
        >
          Перевірити
        </Button>
        {plan && (
          <Button margin={false} disabled={busy || !fresh.length} onClick={run}>
            {`Імпортувати нові (${fresh.length})`}
          </Button>
        )}
      </div>
      <p role="status">{status}</p>
      {plan && (
        <>
          <p>{`Нових: ${fresh.length}, вже є: ${plan.products.length - fresh.length}.`}</p>
          {plan.errors.map((error) => (
            <p
              key={String(error.id)}
            >{`Товар ${String(error.id)}: ${error.message}`}</p>
          ))}
          {fresh.some((product) => product.warnings.length) && (
            <details>
              <summary>Що заповнити вручну після імпорту</summary>
              <ul>
                {fresh
                  .filter((product) => product.warnings.length)
                  .map((product) => (
                    <li
                      key={product.id}
                    >{`${product.name}: ${product.warnings.join('; ')}`}</li>
                  ))}
              </ul>
            </details>
          )}
        </>
      )}
      {failed.length > 0 && (
        <ul>
          {failed.map((result) => (
            <li
              key={result.id}
            >{`${result.name ?? result.id}: ${result.message}`}</li>
          ))}
        </ul>
      )}
      {results.some((result) => result.status === 'created') && !busy && (
        <p>
          <a
            href={`${config.routes.admin}/collections/products?where[_status][equals]=draft`}
          >
            Відкрити чернетки
          </a>
        </p>
      )}
    </section>
  );
};

export default CosmetikaImport;
