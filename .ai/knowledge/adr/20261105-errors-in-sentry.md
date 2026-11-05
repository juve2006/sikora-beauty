---
id: adr-20261105-errors-in-sentry
type: adr
status: accepted
date: 2026-11-05
domains:
  - notify
  - orders
  - accounts
paths:
  - src/lib/sentry.ts
  - src/instrumentation.ts
  - src/instrumentation-client.ts
  - src/app/global-error.tsx
  - tests/sentry.test.ts
summary: Why failures reach Sentry through a list of what may leave, what is switched off because it bypasses beforeSend, and why the browser uses @sentry/browser
reviewed_at: 2026-11-05
---
# Errors reach Sentry through a list of what may leave, and nothing else is sent

## Context

The developer wanted failures seen as they happen while the owner tests the store, not from the
owner's words (2026-11-05). `launch readiness` had Sentry; this brings it ahead of the launch.

What shaped the decision:

- What is sent cannot be recalled, only deleted in Sentry by hand. RULES.md keeps a shopper's data out
  of logs and secrets in the host's environment.
- `@sentry/nextjs` 11 collects cookies, headers, HTTP bodies, query parameters, user data and stack
  variables by default (its `dataCollection` option, read 2026-11-05). Here those hold the site password
  (`authorization`), a session (`payload-token`), a shopper's name, phone and address (a server action's
  body), a letter's token that opens an account and Google's code (the query), and the bot's token (the
  address of the request to Telegram, in a breadcrumb). `onRequestError` puts the page's address in
  `contexts.nextjs`.
- A failure is caught in four places, and each needs its own way in. A server action catches its error
  and logs it, so `onRequestError` never hears of it; so does Payload, on its REST routes and the admin;
  only a failed render reaches `onRequestError`; the browser needs its own SDK.
- Vercel freezes a function once it answers, so an event still on its way may wait until the next
  request or be lost.

## Decision

- **A list, not a filter.** `keepWhatFailed` builds the event anew from what may leave: the error's type
  and text, the route, time, level, environment, release, platform and SDK and, from a browser, the stack's
  file, function, line and column and `debug_meta`, which finds a release's source maps. A text is cut to its first line, as
  a failed query's params follow it, and an email, a number, a query and the bot's token in it are masked,
  and so is the token in the path of Payload's `/verify/` route and of a staff letter's `/admin/reset/`
  link. A file's name is cut at `?` and `#` and loses that token too: the browser's SDK names a frame of
  an inline script, or of an error with no stack, by the page's whole address. A browser's frame stays
  only when its name is an address with no space or comma, it has a line number, and its name is not text
  of the error's own message; a message there holds no rows of a table, so this only backs the list up. A
  field a new version of the SDK adds stays out by itself.
  `dataCollection` turns off collecting too, so this is a second line and not the only one.
- **Only events leave.** `beforeSend` sees nothing else, so what passes it is switched off: no
  breadcrumbs, no sessions (process, requests or visits), no client reports, no tracing, no replay.
  Nor does a request to another service carry Sentry's headers (`tracePropagationTargets: []`), nor a
  page its tags: `withSentryConfig` turns on `clientTraceMetadata`, and `next.config.ts` takes it out.
- **The server** uses `@sentry/nextjs`: `onRequestError`, and `captureConsoleIntegration` for what is
  caught and logged, 9 places today and any later. RULES.md already says what a log may hold. Payload's
  `hooks.afterError` reports a status from 500 up. A custom endpoint that answers a failure itself logs
  it, like a server action. `beforeSend` also holds the function open: it reads Vercel's request context
  and passes `flush` to its `waitUntil`, as the SDK's own `vercelWaitUntil` does nothing outside the edge.
  It sends no stack (`stackParser: () => []`): the SDK's parser takes any line of `error.stack` with "at "
  in it for a frame, a failed query's params are among those lines, the time at the end of a row reads as a
  line and a column, and it decodes a file's name, so a comment like `Text me at https://t.me/ira please`
  made a frame of a shopper's row. Reviews broke three filters in turn: on a line number, on the shape of a
  name, and on whether the name is in the message.
- **The browser** uses `@sentry/browser` with only global handlers, linked errors, dedupe and the page's
  address. `@sentry/nextjs` adds tracing that nothing starts: measured on every page's gzipped code, 129
  KB without Sentry, 189 with `@sentry/nextjs`, 162 this way. `__SENTRY_TRACING__` in `compiler.define`
  did not shrink it.
- **`global-error.tsx` keeps Next's own page** and adds the report. It imports it from Next's `dist`, a
  private path, but the version is pinned and a move fails the build; Sentry's example, `next/error`,
  shows a worse page than the one it replaced.
- **Nothing starts without `NEXT_PUBLIC_SENTRY_DSN`**, set on Production only. Source maps need
  `SENTRY_AUTH_TOKEN`; without it none are made, and with it they go to Sentry and are deleted from the
  build. Sentry's IP setting is the owner of the account's to set (`docs/deploy.md`, step 15), as Sentry
  sees a browser's address by itself.

## Alternatives

- **Server only.** No weight in the browser, but the form, the cart and the favorites live there, and
  that is what the owner would see break.
- **Sentry's wizard or `@sentry/agent-plugin`.** They write their own configuration, with what is listed
  above switched on; the plugin installs on the whole machine, for a coding assistant, and the site does
  not need it. It can be added later, to read errors from the assistant.
- **`@payloadcms/plugin-sentry`.** The same `afterError`, plus a package.
- **Turning off collecting and deleting known fields.** Quiet when a new version adds a field.
- **Filtering the server's frames, or giving its parser only the `    at ` lines that end a stack.** Either
  keeps the file and the line, and each is one more guess about a text a shopper can write.
- **`captureException` in each of the 9 places.** More edits, and forgotten in the tenth.
- **Errors in the Telegram group.** The owner reads it, and without grouping one failure is a hundred
  messages.
- **Only Vercel's logs.** What there was: nobody is told.
- **A tunnel through the site.** It gets past ad blockers, but loads the server and needs an exception in
  `src/proxy.ts`. Some browser events do not arrive; acceptable.

## Consequences

- `console.error` on the server is now an outward message: what it logs leaves the machine, cut and
  masked. A masked first line still would not hide a name, so the rule on logs is what holds that.
- Every page carries 33 KB more gzipped code on Production, and on a deployment without the DSN too, as
  the import is static.
- An event has no browser, no user and no request, so "only on Safari" or "only this shopper" cannot be
  read from it.
- A server failure in Sentry has no file or line, and Sentry groups it by its text, so two failures with
  the same text read as one. Without a stack the SDK's `Dedupe` also drops a failure whose first error has
  the same text as the one right before it, on any route, so a run of one failure shows as one event until
  another comes between; that spares the plan's monthly events. What nobody catches has its stack in the
  host's logs; what is caught and logged names its place in its first words.
- A failure in the browser in the moments before the SDK starts is not reported.
- A frame outside the site's own scripts (`<anonymous>`, a browser extension) is left out of the stack.
- On the server, an error whose `message` is no text is lost: `@sentry/nextjs`'s own processor calls
  `.includes` on it before `beforeSend` and the SDK drops the event. The browser, on `@sentry/browser`, has
  no such processor. Nothing here throws such an error; a library could.
- `src/app/global-error.tsx` follows Next's private path; an upgrade that moves it fails the build.
- A server failure on Production can be checked without harm: `POST /api/customers/login` with a NUL
  in the email answers 500 and writes nothing (`docs/deploy.md`).
- On `production host` the DSN is needed while the image is built, not only at run time.
- Undoing it: removing `NEXT_PUBLIC_SENTRY_DSN` and redeploying stops the sending without a code change;
  a revert has no migration. What was sent stays in Sentry until deleted there.
