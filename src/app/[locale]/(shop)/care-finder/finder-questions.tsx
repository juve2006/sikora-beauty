'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { FinderQuestion } from '@/types';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

type Props = {
  questions: FinderQuestion[];
  // /canvas only: the question to start from.
  start?: number;
};

// The care finder's questionnaire: one question a screen, back and forth in the browser; the last
// one puts the answers' ids in the address, where the page builds the routine, so the history
// keeps one entry. A choice never moves on by itself: arrow keys choose a radio too.
const FinderQuestions = ({ questions, start = 0 }: Props) => {
  const t = useTranslations('Finder');
  const router = useRouter();
  // The answers' ids: /canvas shows the questionnaire several times.
  const id = useId();
  const [step, setStep] = useState(start);
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    // The focus follows the shopper to the next question, not onto the first one on arrival.
    if (moved.current) heading.current?.focus();
  }, [step]);

  const question = questions[step];
  const picked = chosen[question.id] ?? [];
  const last = step === questions.length - 1;
  const go = (to: number) => {
    moved.current = true;
    setStep(to);
  };
  const choose = (answer: string, on: boolean) =>
    setChosen({
      ...chosen,
      [question.id]: !question.multiple
        ? [answer]
        : on
          ? [...picked, answer]
          : picked.filter((other) => other !== answer),
    });
  // The admin's hint, and that several answers may be chosen.
  const hints = [
    question.hint && { id: `${id}-hint`, text: question.hint },
    question.multiple && { id: `${id}-multiple`, text: t('multiple') },
  ].filter((hint) => !!hint);

  return (
    <form
      className="mt-6 flex max-w-xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!last) return go(step + 1);
        // Ids and commas only: the address stays readable, the commas unescaped.
        const a = questions.flatMap((item) => chosen[item.id] ?? []).join(',');
        startTransition(() => router.push(`/care-finder?a=${a}`));
      }}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {t('progress', { step: step + 1, total: questions.length })}
        </p>
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
      <fieldset
        aria-labelledby={`${id}-question`}
        aria-describedby={hints.map((hint) => hint.id).join(' ') || undefined}
        className="flex flex-col gap-3"
      >
        <h2
          id={`${id}-question`}
          ref={heading}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight text-balance outline-none"
        >
          {question.question}
        </h2>
        {hints.map((hint) => (
          <p
            key={hint.id}
            id={hint.id}
            className="-mt-1 text-sm text-muted-foreground"
          >
            {hint.text}
          </p>
        ))}
        {question.answers.map((answer) => (
          <label
            key={answer.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type={question.multiple ? 'checkbox' : 'radio'}
              name={`${id}-${question.id}`}
              value={answer.id}
              checked={picked.includes(answer.id)}
              onChange={(event) => choose(answer.id, event.target.checked)}
              className="size-4 shrink-0 accent-primary"
            />
            {answer.label}
          </label>
        ))}
      </fieldset>
      <div className="flex gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => go(step - 1)}>
            {t('back')}
          </Button>
        )}
        <Button
          type="submit"
          className="ml-auto"
          disabled={picked.length === 0 || pending}
        >
          {!last ? t('next') : pending ? t('finishing') : t('finish')}
        </Button>
      </div>
    </form>
  );
};

export default FinderQuestions;
