import type { ErrorEvent, StackFrame } from '@sentry/nextjs';

// Two links have a token in their path: Payload's route to confirm a shopper's mail, and a letter's
// link to reset a staff password.
const tokenInPath: [RegExp, string] = [
  /\/(verify|reset)\/[^\s/?#]+/g,
  '/$1/[token]',
];

const masks: [RegExp, string][] = [
  [/bot\d+(:|%3A)[\w-]+/gi, 'bot[token]'],
  tokenInPath,
  [/[^\s<>"'(),:;]+(@|%40)[^\s<>"'(),:;]+/gi, '[email]'],
  // To the end of the line: a query quoted in a message may hold spaces.
  [/\?\S.*/g, '?[query]'],
  [/#\S*=.*/g, '#[query]'],
  [/\+?\d[\d\s().-]{7,}\d/g, '[phone]'],
];

// The first line only: a failed query carries its params on the next. A mail server's refusal names
// the address in the first, and a framework's message may quote the address of the page. An error's
// message may be anything, and a `beforeSend` that throws loses the event, so what is no text is left
// out and the event still goes.
function clean(text: unknown) {
  if (typeof text !== 'string') return undefined;
  return masks.reduce(
    (line, [pattern, mask]) => line.replace(pattern, mask),
    text.split(/[\r\n\u2028\u2029]/)[0] ?? '',
  );
}

// A frame of an inline script, or of an error with no stack, is named by the page's whole address. Not
// `clean`, as its masks would break a hashed file's name.
const fileName = (file: string | undefined) =>
  file?.replace(/[?#].*/s, '').replace(...tokenInPath);

// Only a browser sends frames, and a message there holds no rows of a table. Its parsers read a message's
// lines too, so a real frame is named by an address with no space or comma, has a line number, and its
// name is not text of the error's message.
const isFrame = ({ filename = '', lineno }: StackFrame, message: unknown) =>
  typeof lineno === 'number' &&
  /^https?:[^\s,]*$/.test(filename) &&
  !(typeof message === 'string' && message.includes(filename));

// Where it failed, without the query: a letter's link carries a token that opens an account.
function pathOf(url: string | undefined) {
  return url && URL.canParse(url) ? new URL(url).pathname : undefined;
}

// What may leave for Sentry is a list, not what is taken out of everything else: `onRequestError` puts
// the page's address in `contexts`, and a new version of the SDK may add a field nobody has read.
export function keepWhatFailed(event: ErrorEvent): ErrorEvent {
  return {
    type: event.type,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    environment: event.environment,
    release: event.release,
    sdk: event.sdk,
    // Sentry finds a release's source maps by these: files' names and ids.
    debug_meta: event.debug_meta && {
      images: event.debug_meta.images?.map(
        (image) =>
          ({
            ...image,
            code_file: fileName(image.code_file),
          }) as typeof image,
      ),
    },
    transaction: clean(event.transaction ?? pathOf(event.request?.url)),
    message: clean(event.message),
    exception: event.exception && {
      values: event.exception.values?.map(
        ({ type, value, mechanism, stacktrace }) => ({
          type: clean(type),
          value: clean(value),
          mechanism: mechanism && {
            type: mechanism.type,
            handled: mechanism.handled,
          },
          stacktrace: stacktrace && {
            frames: stacktrace.frames
              ?.filter((frame) => isFrame(frame, value))
              .map(
                ({
                  filename,
                  function: name,
                  module,
                  lineno,
                  colno,
                  in_app,
                }) => ({
                  filename: fileName(filename),
                  function: name,
                  module,
                  lineno,
                  colno,
                  in_app,
                }),
              ),
          },
        }),
      ),
    },
  };
}

// Without a DSN (locally, on a Preview, in CI) nothing starts. No tracing, as `tracesSampleRate` is
// not set, and no replay. No breadcrumbs: they hold the addresses of requests, and Telegram's has the
// bot's token. `keepWhatFailed` is what decides; these keep the rest from being collected at all.
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  maxBreadcrumbs: 0,
  sendClientReports: false,
  // Telegram, Nova Poshta and Google have no use for Sentry's headers on our requests to them.
  tracePropagationTargets: [],
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    frameContextLines: 0,
  },
  beforeSend: keepWhatFailed,
};
