---
id: adr-20261106-values-out-of-server-logs
type: adr
status: accepted
date: 2026-11-06
domains: []
paths:
  - src/lib/server-log.ts
  - tests/server-log.test.ts
  - src/instrumentation.ts
summary: Why the server's own log gets an error cut to its first line, the database's code and its frames, at Payload's logger and the console, and not a Drizzle patch or no logs
reviewed_at: 2026-11-06
---
# The server's log gets an error's first line, the database's code and its frames, cut where it is printed

## Context

RULES.md keeps a shopper's data out of logs, and our own code logs a failed query by its first line.
Measured on `next start` (2026-11-05): Payload's logger and Next printed the whole error anyway.
Drizzle's `DrizzleQueryError` carries the query's values on its message's second line and in `params`,
and the database's error, its `cause`, carries the row in `detail`. Payload logs a REST, GraphQL or
admin failure as `logger.error({ err })`, and pino takes the message from the error's whole text. Next
prints a failed render, route or server action through `console.error` with `util.inspect`, values,
`params` and `cause` included. A sign-in with a NUL in its email put the email in the log.

## Decision

- `src/lib/server-log.ts` turns an error into its first line, the database's code from its cause, Next's
  `digest`, and its frames: the stack less the exact header V8 builds from the name and the message.
  A stack that does not start with that header gives no frames, as its first lines could be the message.
- Payload's logger keeps its own output (`defaultLoggerOptions`) with an `err` serializer and a hook
  that cuts every message to its first line, and gives `{ err }` a message of its own, as pino would
  otherwise print the error's whole text.
- `register()` wraps `console.error` and `console.warn` on Node, with or without a DSN, before Sentry
  wraps them, so Sentry still sees the error itself and keeps what `keepWhatFailed` lists.

## Alternatives

- **A patch of Drizzle** (`patch-package`). One place, but the database's `detail` stays on the cause,
  which Next prints, and the patch is carried over each update.
- **Payload's and Next's logs switched off.** Nothing leaks, but the host's log is the only place a
  server failure's stack is kept: Sentry has none (adr-20261105-errors-in-sentry).
- **A filter on `process.stdout` and `stderr` by text.** A guess on what a shopper can type, the kind
  that failed three times for Sentry; pino-pretty may write to the descriptor past `process.stdout`.

## Consequences

- The host's log no longer says which value failed, a duplicate phone for one; it keeps the table and
  columns, the database's code (`23505`) and the place in the code.
- A library that prints past Payload's logger and the console would print the error whole again; none
  does today. Neither is a crash that Node prints itself.
- A database message that holds a value on its first line (`invalid input syntax for type uuid: "…"`)
  passes as the cause's code only; our own code's `whatFailed` still passes such a message.
- Undoing it is a revert; nothing is stored.
