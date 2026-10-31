---
id: convention-storefront-components
type: convention
status: active
domains:
  - storefront
paths:
  - "src/app/*/(shop)/**"
  - "src/app/*/icon.svg"
  - ".claude/skills/shadcn/**"
  - ".agents/skills/shadcn/**"
  - skills-lock.json
  - components.json
  - "public/samples/**"
  - "src/components/shared/**"
  - "src/components/ui/**"
summary: "What a storefront component may, must and must not do: tokens only, both themes, strings from messages, on /canvas; how shadcn components and its agent skill are added"
reviewed_at: 2026-10-31
---
# Storefront components take their look from the theme tokens

## Practice

What every storefront component — `src/components/shared/**`, `src/components/ui/**`, and the
pages and components under `src/app/[locale]/` — may, must and must not do. `src/components/admin/`
is not the storefront: it is Payload's admin, on Payload's UI.

```
Storefront component (src/components/shared/**, src/components/ui/**, src/app/[locale]/**)

MAY:      compose src/components/ui/* (shadcn); edit a ui/* file in place when the design needs it
MUST:     take colours, fonts and radii from the theme tokens in src/app/[locale]/globals.css;
          work in the light and the dark theme; take every UI string from messages/;
          appear in /canvas in every variant and state; work at 360 px and on desktop,
          in both locales
MUST NOT: use a raw colour, font or radius value; import from @payloadcms/ui; read Payload
          outside a server component, except through a server action in src/lib/actions/
          (suggestProducts, adr-20261031-search-in-memory) or AdminLink's /api/users/me
          (adr-20261030-header-menu-and-pages-from-payload)
```

- A component more than one page uses lives in `src/components/shared/<area>/`; one only one page
  uses, in that page's route folder (`/canvas` does not count). Either is a kebab-case file holding
  one component, `const Name = (…) => {…};` and `export default Name;`
  (adr-20261030-code-layout-nextjs-store).
- A shadcn component is added with `npx shadcn add <name>` — the CLI pinned in `devDependencies`,
  never `shadcn@latest` — formatted with `npm run format`, since the CLI writes its own style and
  the CI job `format` refuses it, and shown on `/canvas` in the same change. Variants and sizes nothing
  uses are deleted from it, not kept for later. A radius step it uses that the theme does not
  define (`rounded-4xl` in `Badge`) falls back to Tailwind's fixed default without an error, so the
  step is added to `@theme inline` in `globals.css` as shadcn's multiple of `--radius`.
- The one place with raw colours is `src/app/[locale]/icon.svg`: a favicon cannot read CSS
  variables, so it repeats the light theme's `--primary` and `--primary-foreground`. It changes
  with them.
- On `/canvas` the names of components, variants and sizes are code identifiers and are not
  translated; every other string comes from the `Canvas` messages. Its sample photos are drawn
  SVGs in `public/samples/`, not files from the catalog: `/canvas` needs no database content.
  A component that reads the store's data shows it through one that only takes props
  (`Tiles` → `TileGrid`, `Listing` from a page), and `/canvas` shows that one with samples.
- Agents get shadcn's own skill, vendored twice — `.claude/skills/shadcn/` (Claude Code) and
  `.agents/skills/shadcn/` (Codex) — and recorded in `skills-lock.json`. Its commands were changed
  from `shadcn@latest` to the local `shadcn`; `npx skills update` brings `@latest` back, so repeat
  that change after it. ESLint ignores both directories; `tsc` still checks the skill's `.tsx`
  examples, so an update can break `typecheck`. The skill is shadcn's text, not this project's
  knowledge.

## Example

`Button` in `src/components/ui/button.tsx` takes `bg-primary text-primary-foreground` and
`rounded-lg` from the tokens, keeps only the variants and sizes the storefront uses (its smallest
is 36 px, for a thumb on a 360 px phone), and `LanguageSwitcher` composes it with `asChild` around
a plain `<a>` — another language is a full page load (ARCHITECTURE) — instead of styling a link
of its own.

## Rationale

The direction lives in one file (adr-20261029-storefront-look), so a later change of face stays a
token edit and not a rewrite of every page — only as long as no component carries a raw value.
Payload's UI belongs to the admin and would drag its styles into the storefront.
