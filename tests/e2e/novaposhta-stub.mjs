// Nova Poshta for the end-to-end run (playwright.config.ts): one settlement and two branches for any
// search, and HTTP 500 for the settlement «Збій» — Nova Poshta when it is down.
import { createServer } from 'node:http';

const settlement = {
  Ref: 'e715719e-4b33-11e4-ab6d-005056801329',
  Present: 'м. Бровари, Броварський р-н, Київська обл.',
  Warehouses: 2,
};
const warehouses = [
  {
    Ref: '5a39e5b2-e1c2-11e3-8c4a-0050568002cf',
    Description: 'Відділення №1: вул. Тестова, 1',
    WarehouseStatus: 'Working',
    DenyToSelect: '0',
  },
  {
    Ref: '7b422fc5-e1b8-11e3-8c4a-0050568002cf',
    Description: 'Поштомат №2: вул. Тестова, 2',
    WarehouseStatus: 'Working',
    DenyToSelect: '0',
  },
];

createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    const { calledMethod, methodProperties } = JSON.parse(body || '{}');
    if (String(methodProperties?.CityName).toLowerCase() === 'збій') {
      response.writeHead(500).end();
      return;
    }
    const data =
      calledMethod === 'searchSettlements'
        ? [{ TotalCount: 1, Addresses: [settlement] }]
        : calledMethod === 'getWarehouses'
          ? warehouses
          : [];
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ success: true, data, errors: [] }));
  });
}).listen(4010);
