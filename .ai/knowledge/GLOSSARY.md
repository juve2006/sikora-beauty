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
concerns and returns a routine.

Informal synonyms: підбір догляду, анкета, quiz.
Use in: source code, schema, API, documentation.

## Routine

The care finder's result: products in stock arranged by step, from cleansing to SPF.

Informal synonyms: рутина, схема догляду.
Use in: source code, schema, API, documentation.

## Consultation Request

A shopper's request to be contacted by the cosmetologist, stored with a status and sent to
Telegram.

Informal synonyms: заявка на консультацію, консультація.
Use in: source code, schema, API, documentation.

## Order

A shopper's checkout: a snapshot of products and prices, contacts, the NP warehouse, the payment
method and a forward-only status.

Informal synonyms: замовлення.
Use in: source code, schema, API, documentation.

## Manager Confirmation

The step where the owner or the cosmetologist confirms an order's availability with the shopper
before payment.

Informal synonyms: підтвердження, дзвінок.
Use in: source code, schema, API, documentation.

## Payment Link

A monobank invoice link the manager sends to a shopper after confirmation, in launch step 1.

Informal synonyms: посилання на оплату.
Use in: source code, schema, API, documentation.

## Cash On Delivery

Payment collected by Nova Poshta when the shopper receives the parcel.

Informal synonyms: накладений платіж, COD.
Use in: source code, schema, API, documentation.

## Invoice

A monobank acquiring payment request created for an order; its status arrives by webhook.

Informal synonyms: рахунок mono.
Use in: source code, schema, API, documentation.

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
