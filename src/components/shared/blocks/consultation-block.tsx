import { useTranslations } from 'next-intl';
import Paragraphs from './paragraphs';
import type { BlockOf } from '@/types';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import { Button } from '@/components/ui/button';

// An invitation to ask the cosmetologist, with the header's dialog.
const ConsultationBlock = ({ block }: { block: BlockOf<'consultation'> }) => {
  const t = useTranslations('Consultation');
  return (
    <section className="mt-8 mb-6 flex flex-col items-start gap-5 rounded-xl bg-muted p-6 sm:p-10">
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
        {block.title}
      </h2>
      {block.text && (
        <Paragraphs
          text={block.text}
          className="max-w-2xl text-muted-foreground"
        />
      )}
      <ConsultationDialog>
        <Button size="lg">{t('open')}</Button>
      </ConsultationDialog>
    </section>
  );
};

export default ConsultationBlock;
