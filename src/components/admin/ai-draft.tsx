'use client';

import {
  Button,
  TextareaInput,
  useConfig,
  useForm,
  useLocale,
} from '@payloadcms/ui';
import { useState } from 'react';

import { toFill } from '@/lib/ai-draft';
import type { AiDraft, ProductTexts } from '@/types';

// In Ukrainian: drafts the product's empty texts from its brand's material, pasted here. It saves
// nothing and marks the product «Чернетка AI», which keeps it from being published until a person
// has read it (adr-20261028-reviewed-ai-content-drafts). The material is not stored.
const AiDraftField = () => {
  const locale = useLocale();
  const { config } = useConfig();
  const { getData, dispatchFields, addFieldRow, setModified } = useForm();
  const [material, setMaterial] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  if (locale.code !== 'uk') return null;

  async function draft() {
    setBusy(true);
    setStatus('Пишу чернетку…');
    try {
      const response = await fetch(
        `${config.serverURL}${config.routes.api}/products/ai-draft`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: getData().name ?? '', material }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        return setStatus(body.error ?? `Помилка ${response.status}`);
      // Read the form again: someone may have typed while the model wrote.
      const { fields, actives } = toFill(
        body as AiDraft,
        getData() as ProductTexts,
      );
      if (!fields.length && !actives.length)
        return setStatus(
          'Усі поля вже заповнені: очистіть ті, які AI має написати',
        );
      fields.forEach(({ path, value }) =>
        dispatchFields({ type: 'UPDATE', path, value }),
      );
      actives.forEach(({ name, role }, rowIndex) =>
        addFieldRow({
          path: 'actives',
          schemaPath: 'actives',
          rowIndex,
          subFieldState: {
            name: { initialValue: name, value: name, valid: true },
            role: { initialValue: role, value: role, valid: true },
          },
        }),
      );
      dispatchFields({ type: 'UPDATE', path: 'review', value: 'ai' });
      setModified(true);
      setStatus(
        `Заповнено полів: ${fields.length + (actives.length ? 1 : 0)}. ` +
          'Прочитайте їх і позначте «Перевірено» перед публікацією.',
      );
    } catch (error) {
      setStatus(
        `Не вдалося: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field-type">
      <TextareaInput
        path="aiMaterial"
        label="Матеріал бренду для AI"
        description="Текст зі сторінки бренду, буклета чи від дистриб’ютора — лише про цей товар. Не зберігається."
        rows={6}
        value={material}
        onChange={(event) => setMaterial(event.target.value)}
      />
      <Button
        buttonStyle="secondary"
        size="medium"
        margin={false}
        disabled={busy || !material.trim()}
        onClick={draft}
      >
        Заповнити з AI
      </Button>
      <p role="status">{status}</p>
    </div>
  );
};

export default AiDraftField;
