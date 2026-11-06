'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Copies one of a transfer's details for the shopper's banking app, and says so for a moment. On a
// phone only the icon shows; a reader hears which detail it copies.
const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const t = useTranslations('Checkout');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        navigator.clipboard?.writeText(value).then(
          () => setCopied(true),
          () => {},
        )
      }
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite" className="max-sm:sr-only">
        {copied ? t('copied') : t('copy')}
      </span>
      <span className="sr-only">: {label}</span>
    </Button>
  );
};

export default CopyButton;
