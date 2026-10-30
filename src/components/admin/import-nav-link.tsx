import { Link, NavGroup } from '@payloadcms/ui';
import type { ServerProps } from 'payload';

// The menu entry, after the collections' groups; the owner's only.
const ImportNavLink = ({ payload, user }: ServerProps) => {
  if (user?.role !== 'owner') return null;
  return (
    <NavGroup label="Інструменти">
      <Link
        className="nav__link"
        href={`${payload.config.routes.admin}/import`}
        prefetch={false}
      >
        <span className="nav__link-label">Імпорт</span>
      </Link>
    </NavGroup>
  );
};

export default ImportNavLink;
