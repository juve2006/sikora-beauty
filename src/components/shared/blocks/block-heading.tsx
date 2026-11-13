import { Link } from '@/i18n/navigation';

// A block's heading row: its title, and on the right a link to everything it shows a part of.
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
    <h2 className="font-heading text-2xl font-semibold tracking-tight">
      {title}
    </h2>
    <Link
      href={href}
      className="shrink-0 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
    </Link>
  </div>
);

export default BlockHeading;
