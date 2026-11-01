import { useTranslations } from 'next-intl';
import type { CardProduct, FinderStep, SkinKey, SkinTerm } from '@/types';
import ConsultationDialog from '@/components/shared/consultation/consultation-dialog';
import ProductCard from '@/components/shared/product/product-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type Props = {
  answers: string[];
  terms: Record<SkinKey, SkinTerm[]>;
  // null when the answers no longer make a routine: the questionnaire changed under them.
  steps: (FinderStep & { products: { card: CardProduct }[] })[] | null;
};

// The routine the care finder's answers lead to (GLOSSARY), under the page's heading: what the
// answers meant, then the steps in their order with their products. A step with nothing in stock,
// and anything the answers cannot say, is the cosmetologist's: the consultation carries the answers.
const Routine = ({ answers, terms, steps }: Props) => {
  const t = useTranslations('Finder');
  const consultation = useTranslations('Consultation');

  if (!steps) {
    return (
      <div className="mt-4 flex flex-col items-start gap-6">
        <p className="max-w-xl text-muted-foreground">{t('stale')}</p>
        <Button asChild>
          <Link href="/care-finder">{t('start')}</Link>
        </Button>
      </div>
    );
  }

  const profile = (['type', 'condition', 'concern'] as const).flatMap((key) =>
    terms[key].map((term) => ({ key: `${key}-${term.slug}`, ...term })),
  );
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        {profile.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">{t('profile')}</p>
            <ul className="flex flex-wrap gap-2">
              {profile.map((term) => (
                <li key={term.key}>
                  <Badge>{term.title}</Badge>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href="/care-finder">{t('again')}</Link>
        </Button>
      </div>
      <ol className="mt-10 flex flex-col gap-12">
        {steps.map((step, index) => (
          <li key={step.id}>
            <h2 className="text-lg font-semibold tracking-tight">
              {index + 1}. {step.title}
            </h2>
            {step.products.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {step.products.map(({ card }) => (
                  <li key={card.id}>
                    <ProductCard product={card} eager={index === 0} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted-foreground">{t('emptyStep')}</p>
            )}
          </li>
        ))}
      </ol>
      <section className="mt-14 flex flex-col items-start gap-4 rounded-xl bg-muted p-6 sm:p-8">
        <p className="max-w-xl">{t('disclaimer')}</p>
        <ConsultationDialog answers={answers}>
          <Button>{consultation('open')}</Button>
        </ConsultationDialog>
      </section>
    </>
  );
};

export default Routine;
