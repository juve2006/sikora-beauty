import type { Config } from 'payload';

type LoggerOptions = Extract<
  NonNullable<Config['logger']>,
  { options: unknown }
>['options'];

// A failed query's values sit on the second line of Drizzle's message, in its `params` and in the
// database's `detail` on its cause: a shopper's email, phone or name, which RULES.md keeps out of logs.
// Payload's logger and Next's `console.error` print an error whole, so they print these.

const firstLine = (text: string) => text.split('\n')[0];

// An error as the host's log may keep it: its first line, the database's code and the frames. The frames
// are the stack less its header, which V8 builds from the name and the message; a stack that does not
// start with it is left out, as its first lines could be the message.
export function loggable(error: Error): string {
  const { cause, digest } = error as { cause?: unknown; digest?: unknown };
  const header = Error.prototype.toString.call(error);
  const stack = String(error.stack ?? '');
  const { code, message } = (cause ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  return [
    firstLine(header),
    cause !== undefined &&
      ` (cause: ${typeof code === 'string' ? code : firstLine(String(message))})`,
    typeof digest === 'string' && ` digest: ${digest}`,
    stack.startsWith(header) && stack.slice(header.length),
  ]
    .filter(Boolean)
    .join('');
}

// Next prints a failed render, route or server action through `console.error` and `console.warn`.
export function keepRowsOutOfConsole() {
  for (const level of ['error', 'warn'] as const) {
    const print = console[level];
    console[level] = (...args: unknown[]) =>
      print.apply(
        console,
        args.map((arg) => (arg instanceof Error ? loggable(arg) : arg)),
      );
  }
}

// Payload's own output, with an error kept as above. pino takes a message from the error's whole text
// unless it is given one, and Payload pastes that text into some of its own; every message is cut to
// its first line. Payload logs whatever a route threw, so a thrown string or object is printed by its
// first line too, never field by field.
export const payloadLoggerOptions = {
  serializers: {
    err: (error: unknown) =>
      error instanceof Error
        ? { type: error.name, stack: loggable(error) }
        : firstLine(String(error)),
  },
  hooks: {
    logMethod(args, method) {
      const [first, ...rest] = args as unknown[];
      const after = rest.map((arg) =>
        typeof arg === 'string' ? firstLine(arg) : arg,
      );
      if (typeof first === 'string') {
        return method.apply(this, [firstLine(first), ...after] as never);
      }
      const object = first instanceof Error ? { err: first } : first;
      const { err, msg } = (object ?? {}) as { err?: unknown; msg?: unknown };
      const message =
        typeof msg === 'string'
          ? msg
          : after.length === 0 && err != null
            ? String((err as { message?: unknown }).message ?? err)
            : undefined;
      return method.apply(this, [
        message === undefined
          ? object
          : { ...(object as object), msg: firstLine(message) },
        ...after,
      ] as never);
    },
  },
} satisfies LoggerOptions;
