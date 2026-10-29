import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, Link, NavGroup } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, ServerProps } from 'payload'

import { CosmetikaImport } from './CosmetikaImport'
import { PricesCsv } from './PricesCsv'

// «Імпорт» (/admin/import): the owner's bulk tools. Their endpoints refuse anyone else as well
// (importEndpoints.ts); hiding the page only spares the cosmetologist a dead end.
export function ImportView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  // Payload sends a visitor who may not open the admin to the login from its own views, not from a
  // custom one: without this, anyone would see the admin's frame and menu here.
  if (!permissions.canAccessAdmin) redirect(`${req.payload.config.routes.admin}/login`)
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className="import-page">
        {/* The admin's reset leaves headings and paragraphs without margins. */}
        <style>{`
          .import-page h1 { margin-bottom: var(--base); }
          .import-page h2 { margin: calc(var(--base) * 2) 0 calc(var(--base) / 2); }
          .import-page p, .import-page ul, .import-page details { margin: 0 0 var(--base); }
        `}</style>
        <h1>Імпорт</h1>
        {req.user?.role === 'owner' ? (
          <>
            <CosmetikaImport />
            <PricesCsv />
          </>
        ) : (
          <p>Лише для власника.</p>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}

// The menu entry, after the collections' groups; the owner's only.
export function ImportNavLink({ payload, user }: ServerProps) {
  if (user?.role !== 'owner') return null
  return (
    <NavGroup label="Інструменти">
      <Link className="nav__link" href={`${payload.config.routes.admin}/import`} prefetch={false}>
        <span className="nav__link-label">Імпорт</span>
      </Link>
    </NavGroup>
  )
}
