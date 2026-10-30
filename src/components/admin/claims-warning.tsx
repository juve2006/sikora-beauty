'use client';

import { Banner, useFormFields } from '@payloadcms/ui';

import { medicalClaims } from '@/lib/claims';

const labels: Record<string, string> = {
  name: 'Назва',
  shortDescription: 'Короткий опис',
  purpose: 'Призначення',
  actives: 'Активні компоненти',
  howToUse: 'Спосіб застосування',
  warnings: 'Застереження',
};

// The wording checklist at work: words of a medical claim in the texts of the locale being edited,
// found as they are typed. A warning, never a block — the cosmetologist decides (src/lib/claims.ts).
const ClaimsWarning = () => {
  const found = useFormFields(([fields]) => [
    ...new Set(
      Object.entries(fields).flatMap(([path, { value }]) => {
        const label = labels[path.split('.')[0]];
        return label && !path.endsWith('.id') && typeof value === 'string'
          ? medicalClaims(value).map((word) => `«${word}» — ${label}`)
          : [];
      }),
    ),
  ]);

  if (!found.length) return null;
  return (
    <Banner type="warning">
      Схоже на медичне твердження, перевірте формулювання:
      <ul>
        {found.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Banner>
  );
};

export default ClaimsWarning;
