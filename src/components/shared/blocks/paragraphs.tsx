import { cn } from 'cn';

// A text typed in the admin: paragraphs split by a blank line, a single line break kept.
const Paragraphs = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => (
  <div className={cn('flex flex-col gap-4 leading-relaxed', className)}>
    {text.split(/\n\s*\n/).map((paragraph, index) => (
      <p key={index} className="whitespace-pre-line">
        {paragraph.trim()}
      </p>
    ))}
  </div>
);

export default Paragraphs;
