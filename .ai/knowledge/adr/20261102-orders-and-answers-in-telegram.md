---
id: adr-20261102-orders-and-answers-in-telegram
type: adr
status: accepted
date: 2026-11-02
domains:
  - notify
  - orders
  - consultation
  - finder
paths:
  - src/lib/telegram.ts
  - src/lib/actions/order.actions.ts
  - src/lib/actions/consultation.actions.ts
  - docs/deploy.md
summary: A new order and a request's care finder answers reach the one Telegram group whole, address included, in after() from the saved record; a failed send only logs, and a message keeps within Telegram's limit with its admin link
reviewed_at: 2026-11-02
---
# A new order and a request's care finder answers reach the Telegram group whole, after the shopper's answer

Refines adr-20261030-consultation-requests: orders join requests in the same group, and a message
keeps within Telegram's limit. Refines adr-20261101-cart-and-checkout: its «No Telegram yet» ends
here. Refines adr-20261101-care-finder-answers-to-terms: the answers now also sit in the group.

## Context

In launch step 1 a manager confirms every order by phone (adr-20261028-two-step-launch), and until
now they had to watch `/admin` to learn of one. The developer asked for Telegram to be connected to
every entity that needs it at once, not feature by feature. A message carries a shopper's personal
data to an outside service and cannot be recalled. Source: task `telegram-notifications`, the
developer's decisions at its gate of 2026-11-02.

## Decision

- **Who is told of what.** A new order and a consultation request go to the one group of the owner
  and the cosmetologist. A status change, a search miss, the import and AI drafts tell nobody: a
  person did them in the admin, or nobody waits on them. Card payments and waybills decide for
  themselves in their own tasks.
- **An order's message is whole.** Its number and total, the name, the phone, the settlement and
  warehouse, the payment, the language when it is English, the comment, then each line's name,
  brand, volume, quantity, sum and made-to-order days, and a link to it in the admin. The manager
  calls with a tap and, until `np waybill`, writes the waybill from it. An address without Nova
  Poshta's refs is marked «введено вручну, перевірити», as the manager checks it on the call.
- **A request's message carries the care finder's answers in full,** before its link: the
  cosmetologist prepares for the call without opening the admin.
- **`placeOrder` tells Telegram in `after()`, from the saved record,** as `requestConsultation`
  does: the shopper does not wait for it. An order that was not saved tells nobody. A send that
  fails still answers `placed`, and the log gets only what Telegram said.
- **A message keeps within `TELEGRAM_TEXT_LIMIT` (4096).** Telegram refuses a longer text, and the
  whole message with it. `withLink` (`src/lib/telegram.ts`) cuts the end of the lines and keeps the
  link; the contacts and the total come first, so what is cut is the last products.
- **The group's id comes from a command.** A bot in privacy mode, Telegram's default, sees commands
  and service messages, not ordinary ones, so `docs/deploy.md` sends `/start@<bot>` before
  `getUpdates`, which keeps an update for at most 24 hours.

## Alternatives

- **An order's message without the address** — less data at Telegram, but the waybill still sends
  the manager to the admin.
- **Only the number, the total and a link** — no personal data at Telegram, but every order means
  the site password and a login on a phone, which is what the message is there to save. The
  developer chose the whole message.
- **Only a mark that a request has answers** — skin answers stay in the admin, and the cosmetologist
  goes there for every such request. A shopper may already write about their skin in «Що турбує»,
  which reaches Telegram. The developer chose the answers in full.
- **A queue and retries** — a table and a cron for a rare failure, when the order is kept anyway.
  Worth it if lost messages start to matter.
- **Several messages for a long order** — a loop and the risk of a part delivered, for an order of
  dozens of products.
- **A Telegram stub in e2e** — another server and a configurable address for one request a unit test
  sees just as well. The live check after the deploy covers the real `after()` and Telegram.
- **`afterChange`, or waiting for Telegram before the answer** — rejected already in
  adr-20261030-consultation-requests.

## Consequences

- A shopper's name, phone, address and skin answers stay in Telegram after the order or request is
  deleted in the admin, and everyone in the group reads them. Asked to delete a shopper's data, the
  owner deletes those messages by hand. This is the one place besides the admin roles that reads
  them.
- The consent lines under the forms say what is kept and do not name Telegram. The privacy page
  that `launch readiness` writes names it; its wording needs checking before the store opens.
- A lost message shows only in the host's log (`Telegram:`) until Sentry arrives; the order waits
  in the admin as «Нове» either way.
- A group that Telegram upgrades to a supergroup gets a new id, and sends fail until
  `TELEGRAM_CHAT_ID` is changed and Production redeployed.
- Test orders on Production reach the group too, once the variables are set.
- Undoing it: a revert, with no migration; the messages already sent stay in the group. Removing the
  two variables and redeploying stops the sending without a code change.
