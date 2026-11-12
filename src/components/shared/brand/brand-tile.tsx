import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  logo: string | null;
  href?: string;
  className?: string;
};

// A brand as a rectangle, after totispharma's tiles: its logo, grey and inverted in the dark theme so
// a dark mark reads in both, or its name while it has none. A link names the brand by its logo; a
// tile that is no link stands beside the brand's heading, so its logo says nothing more. The ring is
// inset: a strip's sideways scroll would clip one drawn outside.
const BrandTile = ({ title, logo, href, className }: Props) => {
  const face = logo ? (
    <span className="relative h-1/2 w-3/4">
      <Image
        src={logo}
        alt={href ? title : ''}
        fill
        sizes="(min-width: 640px) 16rem, 50vw"
        className="object-contain grayscale dark:invert"
      />
    </span>
  ) : (
    <span className="text-center font-medium text-balance">{title}</span>
  );
  const tile = cn(
    'flex aspect-8/5 items-center justify-center rounded-lg bg-muted px-5 py-4',
    className,
  );
  return href ? (
    <Link
      href={href}
      className={cn(
        tile,
        'outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
      )}
    >
      {face}
    </Link>
  ) : (
    <div className={tile}>{face}</div>
  );
};

export default BrandTile;
