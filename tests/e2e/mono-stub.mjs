// monobank acquiring for the end-to-end run (playwright.config.ts): an invoice, its page with
// «Оплатити» and «Відмовити», and the webhook each sends, signed by this stub's own key as mono signs
// its. «Пізніше» goes back without the webhook, which `/send/<id>/<status>` sends when the test says;
// `/set/<id>/<status>` only changes what `invoice/status` answers: a webhook that was lost. An
// invoice for down@example.com is refused: mono when it is down.
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { createServer } from 'node:http';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});
const pem = publicKey.export({ type: 'spki', format: 'pem' });
const invoices = new Map();

const webhook = async (invoiceId, status) => {
  const invoice = invoices.get(invoiceId);
  invoice.status = status;
  const { webHookUrl, amount } = invoice;
  const body = JSON.stringify({ invoiceId, status, amount, ccy: 980 });
  await fetch(webHookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sign': sign('sha256', Buffer.from(body), privateKey).toString(
        'base64',
      ),
    },
    body,
  });
};

createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4012');
  const answer = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', async () => {
    if (
      url.pathname.startsWith('/api/merchant/') &&
      request.headers['x-token'] !== 'e2e-mono'
    ) {
      answer(403, { errCode: 'forbidden' });
      return;
    }
    if (url.pathname === '/api/merchant/pubkey') {
      answer(200, { key: Buffer.from(pem).toString('base64') });
      return;
    }
    if (url.pathname === '/api/merchant/invoice/status') {
      const invoiceId = url.searchParams.get('invoiceId');
      const asked = invoices.get(invoiceId);
      if (asked) {
        const { status = 'created', amount } = asked;
        answer(200, { invoiceId, status, amount, ccy: 980 });
      } else answer(400, { errCode: 'NOT_FOUND' });
      return;
    }
    if (url.pathname === '/api/merchant/invoice/create') {
      const invoice = JSON.parse(body);
      if (invoice.merchantPaymInfo.customerEmails[0] === 'down@example.com') {
        answer(500, { errCode: 'unavailable' });
        return;
      }
      const invoiceId = randomUUID();
      invoices.set(invoiceId, invoice);
      answer(200, {
        invoiceId,
        pageUrl: `http://127.0.0.1:4012/pay/${invoiceId}`,
      });
      return;
    }
    const [, step, invoiceId, status] = url.pathname.split('/');
    const invoice = invoices.get(invoiceId);
    if (!invoice) {
      answer(404, {});
      return;
    }
    if (step === 'pay' && !status) {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(
        `<!doctype html><title>mono</title><p>${invoice.amount}</p>` +
          ['success|Оплатити', 'failure|Відмовити', 'later|Пізніше']
            .map((link) => link.split('|'))
            .map(
              ([to, name]) => `<a href="/pay/${invoiceId}/${to}">${name}</a>`,
            )
            .join(' '),
      );
      return;
    }
    if (step === 'pay') {
      if (status !== 'later') await webhook(invoiceId, status);
      response.writeHead(302, { Location: invoice.redirectUrl });
      response.end();
      return;
    }
    if (step === 'send') {
      await webhook(invoiceId, status);
      answer(200, {});
      return;
    }
    if (step === 'set') {
      invoice.status = status;
      answer(200, {});
      return;
    }
    answer(404, {});
  });
}).listen(4012, '127.0.0.1');
