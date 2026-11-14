import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

// A block's heading row: its title, and on the right a link to everything it shows a part of, with
// an arrow, as the client's mockup has it.
const BlockHeading = ({
  title,
  href,
  label,
}: {
  title: string;
  href: string;
  label: string;
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <h2 className="font-heading text-3xl tracking-tight lg:text-5xl">
      {title}
    </h2>
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  </div>
);

export default BlockHeading;
