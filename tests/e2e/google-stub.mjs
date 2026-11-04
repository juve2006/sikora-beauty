// Google for the end-to-end run (playwright.config.ts): it signs in whoever the test last named at
// `/next`, and holds to what the real one does: a code works once, and only with its verifier.
// `declined` is someone cancelling at Google, `tokenStatus` its token endpoint failing.
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

let next = {};
let exchanges = 0;
const codes = new Map();

const jwt = (claims) =>
  ['{}', JSON.stringify(claims), '']
    .map((part) => Buffer.from(part).toString('base64url'))
    .join('.');

createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4011');
  const answer = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  if (url.pathname === '/auth') {
    const back = new URL(url.searchParams.get('redirect_uri'));
    back.searchParams.set('state', url.searchParams.get('state'));
    if (next.declined) back.searchParams.set('error', 'access_denied');
    else {
      const code = randomUUID();
      codes.set(code, {
        challenge: url.searchParams.get('code_challenge'),
        identity: next,
      });
      back.searchParams.set('code', code);
    }
    response.writeHead(302, { Location: back.href });
    response.end();
    return;
  }
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    if (url.pathname === '/next') {
      next = JSON.parse(body);
      answer(200, {});
    } else if (url.pathname === '/exchanges') {
      answer(200, { exchanges });
    } else if (url.pathname === '/token') {
      exchanges += 1;
      const form = new URLSearchParams(body);
      const entry = codes.get(form.get('code'));
      codes.delete(form.get('code'));
      const proved =
        entry &&
        createHash('sha256')
          .update(form.get('code_verifier') ?? '')
          .digest('base64url') === entry.challenge;
      if (
        !proved ||
        form.get('client_id') !== 'e2e-client' ||
        form.get('client_secret') !== 'e2e-secret'
      ) {
        answer(400, { error: 'invalid_grant' });
        return;
      }
      const { tokenStatus, ...claims } = entry.identity;
      if (tokenStatus) {
        answer(tokenStatus, {});
        return;
      }
      answer(200, {
        id_token: jwt({
          iss: 'https://accounts.google.com',
          aud: 'e2e-client',
          exp: Math.floor(Date.now() / 1000) + 3600,
          email_verified: true,
          ...claims,
        }),
      });
    } else answer(404, {});
  });
}).listen(4011, '127.0.0.1');
