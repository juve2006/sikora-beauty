'use client';

import { useTranslations } from 'next-intl';
import AccountField from './account-field';

// A number as the shopper says it, after the +380 they see: `accountPhone` takes it with or without
// its 0. One country and no list: Nova Poshta delivers in Ukraine only. The flag's colours are the
// flag's, not the theme's (convention-storefront-components).
const PhoneField = ({ errors }: { errors?: string[] }) => {
  const t = useTranslations('Account');
  return (
    <AccountField
      label={t('phone')}
      name="phone"
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      maxLength={20}
      required
      placeholder={t('phoneNational')}
      errors={errors}
      before={
        <>
          <svg viewBox="0 0 3 2" className="h-3.5 w-5 rounded-sm" aria-hidden>
            <rect width="3" height="1" fill="#0057b7" />
            <rect y="1" width="3" height="1" fill="#ffd700" />
          </svg>
          {t('phonePrefix')}
        </>
      }
    />
  );
};

export default PhoneField;
