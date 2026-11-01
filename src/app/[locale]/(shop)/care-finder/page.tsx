import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import FinderQuestions from './finder-questions';
import Routine from './routine';
import { getFinder, getRoutine } from '@/lib/actions/finder.actions';
import { profile } from '@/lib/finder';
import { finderAnswers } from '@/lib/validators';
import { alternates } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ a?: string | string[] }>;
};

// Rendered on every request and never at build: the layout's header reads Payload, and `next build`
// has no database (RULES.md). The care finder is read on every request too: `enabled` turns it off.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Finder' });
  // A routine is one shopper's answers: the questionnaire is indexed, its results are not.
  if ((await searchParams).a !== undefined)
    return { title: t('routine'), robots: { index: false } };
  return {
    title: t('title'),
    description: t('description'),
    alternates: alternates('/care-finder', locale),
  };
}

// The care finder (GLOSSARY): its questions, then, with the answers' ids in `a`, the routine they
// lead to. Off, or not written yet, it is not there.
const CareFinderPage = async ({ params, searchParams }: Props) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const finder = await getFinder(locale);
  if (!finder.enabled || finder.questions.length === 0) notFound();
  const { a } = await searchParams;
  const t = await getTranslations('Finder');
  const answers = a === undefined ? null : finderAnswers.parse(a);
  const { complete, terms } = profile(finder.questions, answers ?? []);
  const steps = complete ? await getRoutine(finder.steps, terms, locale) : null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <h1 className="pt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:pt-8">
        {answers && steps ? t('routine') : t('title')}
      </h1>
      {answers ? (
        <Routine answers={answers} terms={terms} steps={steps} />
      ) : (
        <>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {t('description')}
          </p>
          <FinderQuestions questions={finder.questions} />
        </>
      )}
    </main>
  );
};

export default CareFinderPage;
