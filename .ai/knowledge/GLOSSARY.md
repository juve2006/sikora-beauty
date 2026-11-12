# Glossary

Canonical ubiquitous language for this project. One entry per term. Use the canonical
term in source code, database schema, APIs, documentation and commit messages.

Entry format:

```
## <Canonical Term>

One-sentence definition.

Informal synonyms: <words people say instead>.
Use in: source code, schema, API, documentation.
```

## ROSYNASKIN

The store's name, written ROSYNASKIN in text — titles, letters, pages — and ROSYNA SKIN with YOUR
BEAUTY EDIT in its logo. `sikora-beauty` is the id of the repository, its spec and its services
(Vercel, Blob, Sentry), never shown to shoppers; the seller is still ФОП Сікора.

Informal synonyms: Rosyna Skin, назва магазину; earlier Sikora Beauty.
Use in: UI strings, documentation.

## Zone

The top level of the catalog by where a product is applied: face, body, hair and scalp.

Informal synonyms: зона застосування, area, body area.
Use in: source code, schema, API, documentation.

## Category

A product type within one zone, such as serums or SPF under face; zones and categories form one
tree.

Informal synonyms: розділ, підкатегорія, product type.
Use in: source code, schema, API, documentation.

## Skin Type

The baseline type of a shopper's skin: normal, dry, oily or combination; a product filter.

Informal synonyms: тип шкіри.
Use in: source code, schema, API, documentation.

## Skin Condition

A temporary or reactive state of the skin — dehydrated, sensitive, redness-prone, breakout-prone,
impaired barrier; a product filter separate from skin type.

Informal synonyms: стан шкіри.
Use in: source code, schema, API, documentation.

## Skin Concern

A goal a shopper wants care for — acne and breakouts, pigmentation, dehydration, sensitivity and
redness, barrier support, first signs of ageing; a product filter with its own landing pages.

Informal synonyms: потреба шкіри, skin need.
Use in: source code, schema, API, documentation.

## Brand

One of the professional skincare brands the store sells, such as Dr.Spiller or Institutum.

Informal synonyms: бренд, виробник.
Use in: source code, schema, API, documentation.

## Collection

A curated group of products on the storefront — new, bestsellers, sets, minis — marked by flags on
the product. Not a Payload collection: say "Payload collection" for a data collection in code.

Informal synonyms: добірка, новинки, бестселери, набори, мініатюри.
Use in: source code, schema, API, documentation.

## Product

One sellable item with one volume and one price, carrying the rich fields.

Informal synonyms: товар, SKU, позиція.
Use in: source code, schema, API, documentation.

## Rich Fields

The product's expert content beyond name and price: purpose and expected cosmetic effect,
recommended skin type and condition, actives and their role, how to use, warnings and INCI.

Informal synonyms: ричні поля, опис, контент.
Use in: documentation.

## Active

An ingredient listed on the product page with an explanation of its role.

Informal synonyms: активний компонент, active ingredient.
Use in: source code, schema, API, documentation.

## Text Review

A product's status for its texts: an AI draft («Чернетка AI») or an import («Імпорт») waits until
a person marks it «Перевірено», and the product cannot be published before. Not shoppers' reviews
of products.

Informal synonyms: перевірка текстів, AI draft, чернетка AI.
Use in: source code (`review`), schema, documentation.

## INCI

The product's full ingredient list in INCI names, copied from a source, never generated.

Informal synonyms: склад, ingredients.
Use in: source code, schema, API, documentation.

## Availability

A product's stock status: in stock, made to order (with days), or out of stock; set by hand in the
admin.

Informal synonyms: наявність, stock status.
Use in: source code, schema, API, documentation.

## Made To Order

An availability where the product is ordered from the distributor after the shopper orders it;
such an order cannot be paid online.

Informal synonyms: під замовлення, preorder.
Use in: source code, schema, API, documentation.

## Related Product

A product the cosmetologist links to another to be shown on its page, in the order they set; one
that is not published is left out.

Informal synonyms: супутні товари, goes well with, cross-sell.
Use in: source code (`related`), schema, API, documentation.

## Care Finder

The "pick my care" questionnaire that maps a shopper's answers to skin type, condition and
concerns and returns a routine. Payload global `care-finder`, «Підбір догляду»; page
`/care-finder`. An answer is its array row's id.

Informal synonyms: підбір догляду, анкета, quiz.
Use in: source code, schema, API, documentation.

## Routine

The care finder's result: products in stock arranged by step, from cleansing to SPF.

Informal synonyms: рутина, схема догляду.
Use in: source code, schema, API, documentation.

## Consultation Request

A shopper's request to be contacted by the cosmetologist, stored with a status and sent to
Telegram. Collection `consultation-requests`, «Запит на консультацію»; status `new`, `in_progress`
or `closed` — «Новий», «В роботі», «Закритий».

Informal synonyms: заявка на консультацію, консультація.
Use in: source code, schema, API, documentation.

## Page

A page of the store the owner builds in the admin from blocks: a title, a slug and blocks.
Collection `pages`, «Сторінка»; the slug `home` is the home page, any other is `/<slug>` («Про
нас» is `about`).

Informal synonyms: сторінка, головна, «Про нас».
Use in: source code, schema, API, documentation.

## Block

One part of a page, of one kind: `hero` («Головний банер»), `products` («Товари»), `tiles`
(«Плитки»), `consultation` («Консультація»), `text` («Текст»). A page shows its blocks in the
admin's order.

Informal synonyms: блок, секція.
Use in: source code, schema, documentation.

## Search Synonym

A group of spellings search takes for one another — a brand as shoppers write it in Cyrillic, an
active by its other name: «Dr.Spiller / доктор шпіллер / др шпіллер». No language. Collection
`search-synonyms`, «Синоніми пошуку»; one spelling per line, at least two.

Informal synonyms: синонім, написання.
Use in: source code, schema, documentation.

## Search Miss

A query the results page found nothing for, kept with how often it was searched, so a synonym
can be added. Collection `search-misses`, «Пошук без результатів»; at most `SEARCH_MISSES`
different queries.

Informal synonyms: пошук без результатів, порожній пошук.
Use in: source code, schema, documentation.

## Favorites

The products a shopper marked with a heart, kept in their browser as product ids, the newest first,
at most `FAVORITES_LIMIT`; shown at `/favorites`, «Обране». One favorite is a product in them.

Informal synonyms: обране, вибране, список бажань, wishlist.
Use in: source code, documentation.

## Cart

The products a shopper is about to order, kept in their browser as product ids with a quantity,
the newest first, at most `CART_LINES` lines and `CART_QUANTITY_MAX` of one product; shown and
ordered at `/cart`, «Кошик». One line of it is a cart line, `{id, qty}`.

Informal synonyms: кошик, корзина, basket.
Use in: source code, documentation.

## Order

A shopper's checkout: a snapshot of products and prices, contacts, the NP warehouse, the payment
method and a forward-only status. Collection `orders`, «Замовлення»; its number is its id; status
`new`, `confirmed`, `shipped`, `completed` or `cancelled` — «Нове», «Підтверджене», «Відправлене»,
«Виконане», «Скасоване»; payment `cod`, `link`, `transfer` or `card` — «Післяплата», «Посилання на
оплату», «Переказ на рахунок», «Карткою на сайті»; payment status `awaiting`, `paid`, `failed` or
`refunded` — «Очікує», «Оплачено», «Не пройшла», «Повернено», moved by one table and apart from the
status.

Informal synonyms: замовлення.
Use in: source code, schema, API, documentation.

## Order Line

A product in an order as it was at checkout: its name, brand, volume, price, quantity and
availability, with a link to the product. Field `lines` of `orders`, «Товари».

Informal synonyms: рядок замовлення, позиція, товар у замовленні.
Use in: source code, schema, documentation.

## Manager Confirmation

The step where the owner or the cosmetologist confirms an order's availability with the shopper
before payment.

Informal synonyms: підтвердження, дзвінок.
Use in: source code, schema, API, documentation.

## Payment Link

A monobank invoice link the manager sends to a shopper after confirmation, in launch step 1.

Informal synonyms: посилання на оплату.
Use in: source code, schema, API, documentation.

## Transfer

A shopper's payment ahead to the store's account by its IBAN, from any bank, for an order wholly in
stock; the manager marks the order paid on seeing it. Order payment `transfer`, «Переказ на
рахунок».

Informal synonyms: переказ, оплата за реквізитами, банківський переказ, bacs.
Use in: source code, schema, documentation.

## Card Payment

A shopper's payment ahead by card, Apple Pay or Google Pay on monobank's page, right after placing an
order wholly in stock; only mono's word, by its webhook or when asked, marks it paid or failed. Order payment `card`, «Карткою на
сайті». Not a Payment Link, which the manager sends after confirmation.

Informal synonyms: оплата карткою, онлайн-оплата, оплата на сайті.
Use in: source code, schema, documentation.

## Payment Details

The store's account a transfer goes to: the recipient, the IBAN and the RNOKPP or EDRPOU. Global
`payment-details`, «Реквізити для оплати»; the owner keeps it.

Informal synonyms: реквізити, рахунок магазину.
Use in: source code, schema, documentation.

## Return Token

An order's secret, answered to the browser that placed it, by which the thank-you page
`/cart/thanks?t=` finds the order. Field `returnToken` of `orders`; nobody reads it through the API.

Informal synonyms: токен замовлення.
Use in: source code, schema, documentation.

## Cash On Delivery

Payment collected by Nova Poshta when the shopper receives the parcel. Not offered at the start
(adr-20261109-waybills-and-prepayment-only-start): the checkout refuses it, and the value stays for
the orders that hold it.

Informal synonyms: накладений платіж, COD.
Use in: source code, schema, API, documentation.

## Invoice

A monobank acquiring payment request created for an order; its status arrives by webhook, or mono is
asked for it. Field
`monoInvoiceId` of `orders`, «Рахунок mono»; never the store's account a transfer goes to.

Informal synonyms: рахунок mono.
Use in: source code, schema, API, documentation.

## Reconciliation

Asking monobank itself where an invoice stands, as a webhook may be lost and an expired invoice has
none: on the shopper's return from mono's page and by a daily cron.

Informal synonyms: звірка.
Use in: source code (`monoReconcile`), documentation.

## Fiscal Receipt

The receipt the tax rules require for a card payment, issued through Checkbox from the monobank
cabinet.

Informal synonyms: фіскальний чек, чек ПРРО.
Use in: documentation.

## NP Warehouse

A Nova Poshta branch or parcel locker where a shopper collects the parcel, as the Nova Poshta API
names it. Never the store's own stock.

Informal synonyms: відділення, поштомат, warehouse.
Use in: source code, schema, API, documentation.

## Waybill

A Nova Poshta shipment document created for an order.

Informal synonyms: ТТН, накладна, express waybill.
Use in: source code, schema, API, documentation.

## Delivery Status

What Nova Poshta says of a parcel, kept on the order as its code and words (`deliveryCode`,
`deliveryStatus`) and refreshed by a daily cron. Never the order's own status or its payment status.

Informal synonyms: статус доставки, статус НП.
Use in: source code, schema, documentation.

## Shopper

Someone buying from the store: a guest, or, with an account, a row of the Payload collection
`customers`, «Покупець», who signs in by a phone number or an email, in the dialog from the header
or at `/account`.

Informal synonyms: покупець, клієнт, customer.
Use in: source code (`customers`, `currentCustomer`), schema, API, documentation.

## Staff

Whoever has an admin role: a row of the Payload collection `users`, an owner or a cosmetologist.
A session alone does not make someone staff: a shopper has one too.

Informal synonyms: персонал, адмін.
Use in: source code (`isStaff`), documentation.

## Owner

The admin role that runs the store: orders, prices, availability, settings, users. Role value `owner`, «Власник».

Informal synonyms: власник, брат.
Use in: source code, schema, API, documentation.

## Cosmetologist

The admin role that reviews and publishes product content and answers consultation requests. Role value `cosmetologist`, «Косметолог».

Informal synonyms: косметолог.
Use in: source code, schema, API, documentation.

## Locale

The storefront language: `uk` (default, at `/`) or `en` (at `/en`).

Informal synonyms: мова, language.
Use in: source code, schema, API, documentation.

## Canvas

The `/canvas` page that shows every UI component in every variant and state at mobile and desktop
widths.

Informal synonyms: component gallery, storybook.
Use in: source code, documentation.

## Theme token

A CSS variable in `src/app/[locale]/globals.css` — `--primary`, `--background`, `--radius` and the
rest of shadcn's set — with a value for the light theme (`:root`) and one for the dark theme
(`.dark`); Tailwind classes such as `bg-primary` read it. Storefront components take colours and
radii only from theme tokens.

Informal synonyms: design token, CSS variable, токен.
Use in: source code, documentation.
