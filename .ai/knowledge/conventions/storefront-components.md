---
id: convention-storefront-components
type: convention
status: active
domains:
  - storefront
paths:
  - "src/components/**"
  - "src/app/*/(shop)/**"
  - "src/app/*/page.tsx"
  - "src/app/*/icon.svg"
  - ".claude/skills/shadcn/**"
  - ".agents/skills/shadcn/**"
  - skills-lock.json
  - components.json
summary: "What a storefront component may, must and must not do: tokens only, both themes, strings from messages, on /canvas; how shadcn components and its agent skill are added"
reviewed_at: 2026-10-29
---
# Storefront components take their look from the theme tokens

## Practice

What every storefront component — `src/components/**`, and the pages under `src/app/[locale]/` —
may, must and must not do:

```
Storefront component (src/components/**, src/app/[locale]/**)

MAY:      compose src/components/ui/* (shadcn); edit a ui/* file in place when the design needs it
MUST:     take colours, fonts and radii from the theme tokens in src/app/[locale]/globals.css;
          work in the light and the dark theme; take every UI string from messages/;
          appear in /canvas in every variant and state; work at 360 px and on desktop,
          in both locales
MUST NOT: use a raw colour, font or radius value; import from @payloadcms/ui; read Payload
          outside a server component
```

- A shadcn component is added with `npx shadcn add <name>` — the CLI pinned in `devDependencies`,
  never `shadcn@latest` — and shown on `/canvas` in the same change. Variants and sizes nothing
  uses are deleted from it, not kept for later.
- The one place with raw colours is `src/app/[locale]/icon.svg`: a favicon cannot read CSS
  variables, so it repeats the light theme's `--primary` and `--primary-foreground`. It changes
  with them.
- On `/canvas` the names of components, variants and sizes are code identifiers and are not
  translated; every other string comes from the `Canvas` messages.
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
next-intl's `Link` instead of styling a link of its own.

## Rationale

The direction lives in one file (adr-20261029-storefront-look), so a later change of face stays a
token edit and not a rewrite of every page — only as long as no component carries a raw value.
Payload's UI belongs to the admin and would drag its styles into the storefront.
