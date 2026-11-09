// Nova Poshta for the end-to-end run (playwright.config.ts): one settlement and two branches for any
// search, and HTTP 500 for the settlement «Збій» — Nova Poshta when it is down. A waybill gets the next
// number, and every parcel it is asked about was refused.
import { createServer } from 'node:http';

const CITY = 'db5c88e0-391c-11dd-90d9-001a92567626';
// From the clock: a run again on the same database must not repeat a number.
let lastWaybill = Number(`2045${String(Date.now()).slice(-10)}`);

const settlement = {
  Ref: 'e715719e-4b33-11e4-ab6d-005056801329',
  Present: 'м. Бровари, Броварський р-н, Київська обл.',
  Warehouses: 2,
};
const warehouses = [
  {
    Ref: '5a39e5b2-e1c2-11e3-8c4a-0050568002cf',
    Description: 'Відділення №1: вул. Тестова, 1',
    CityRef: CITY,
    WarehouseStatus: 'Working',
    DenyToSelect: '0',
  },
  {
    Ref: '7b422fc5-e1b8-11e3-8c4a-0050568002cf',
    Description: 'Поштомат №2: вул. Тестова, 2',
    CityRef: CITY,
    WarehouseStatus: 'Working',
    DenyToSelect: '0',
  },
];

createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    const { modelName, calledMethod, methodProperties } = JSON.parse(
      body || '{}',
    );
    if (String(methodProperties?.CityName).toLowerCase() === 'збій') {
      response.writeHead(500).end();
      return;
    }
    const data =
      calledMethod === 'searchSettlements'
        ? [{ TotalCount: 1, Addresses: [settlement] }]
        : calledMethod === 'getWarehouses'
          ? warehouses
          : calledMethod === 'getCounterparties'
            ? [{ Ref: '11111111-1111-4111-8111-111111111111' }]
            : calledMethod === 'getCounterpartyContactPersons'
              ? [
                  {
                    Ref: '22222222-2222-4222-8222-222222222222',
                    Phones: '380671112233',
                  },
                ]
              : calledMethod === 'save' && modelName === 'Counterparty'
                ? [
                    {
                      Ref: '33333333-3333-4333-8333-333333333333',
                      ContactPerson: {
                        data: [{ Ref: '44444444-4444-4444-8444-444444444444' }],
                      },
                    },
                  ]
                : calledMethod === 'save'
                  ? [{ IntDocNumber: String(++lastWaybill) }]
                  : calledMethod === 'getStatusDocuments'
                    ? methodProperties.Documents.map(({ DocumentNumber }) => ({
                        Number: DocumentNumber,
                        StatusCode: '103',
                        Status: 'Відмова від отримання',
                      }))
                    : [];
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ success: true, data, errors: [] }));
  });
}).listen(4010);
