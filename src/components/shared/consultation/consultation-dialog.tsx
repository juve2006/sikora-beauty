'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import ConsultationForm from './consultation-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// «Отримати консультацію»: the button it is given opens the form. From a product page the request
// carries the product. Closed, the form unmounts, so it opens empty again.
const ConsultationDialog = ({
  product,
  children,
}: {
  product?: { id: number; name: string };
  children: ReactNode;
}) => {
  const t = useTranslations('Consultation');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* A phone keeps 300 px for Turnstile's widget inside the padding. */}
      <DialogContent
        closeLabel={t('close')}
        className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1rem)] overflow-y-auto p-5 sm:max-w-md sm:p-6"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <ConsultationForm product={product} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationDialog;
