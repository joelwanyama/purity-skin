# Ordering: the enquiry list

There is no cart and no checkout. A customer builds a list of what they want to ask about, then sends it as one WhatsApp message. This document records what that list does and does not do.

## What it is

- **A message builder.** Adding a product only assembles text. It reserves nothing, prices nothing beyond the published price, and takes no payment.
- **Account-free.** The list lives in the customer's own browser under `purity.enquiry.v1`. No sign-in, no email, no server write.
- **Price-honest.** Only `product_id` and `quantity` are stored. Names, sizes and prices are re-read from the published catalogue on every render, so a saved list can never show or send an old price.
- **Self-healing.** If a product is unpublished while a list is saved, it drops out with a visible notice ("… is no longer listed, so it was removed from this list") rather than lingering as a phantom item.
- **No fake totals.** When no item in the list has a published price, the message says the prices still need confirming instead of printing `UGX 0`. When only some prices exist, the total is labelled "Total of the prices listed so far".

## The message

```
Hello PURITY SKIN, I would like to check these items:
1. Barrier Repair Serum — 30 ml — 1 × UGX 48,000
2. Daily Bar — 100 g — 2 × UGX 24,000 (UGX 12,000 each)
Total of listed prices: UGX 72,000 — delivery is not included.
My note: I am in Ntinda, is Saturday delivery possible?
This is an enquiry, not a paid order.
```

The customer's optional note is capped at 400 characters and whitespace-collapsed. The message is built by `buildEnquiryMessage()` in `src/order/enquiry.ts` and is covered by unit tests.

## Where it appears

| Surface | Behaviour |
| --- | --- |
| Product card (`/shop`, home) | One action: **Add** → becomes **In enquiry · n** |
| Product detail | **Ask about this product** (direct WhatsApp) and **Add to enquiry**, with a line stating nothing is reserved or paid |
| Reminder bar | Appears once something is added: item count, listed total, "nothing paid online", link to review. Dismissible; comes back when the list changes |
| `/enquiry` | Quantities (1–10), remove, optional note, totals, "Send this list on WhatsApp", "Keep browsing", two-step "Clear list" |
| Search engines | `/enquiry` is `noindex` via `_headers` and page metadata |

## Limits, stated on purpose

- Quantities stop at 10. Above that the shop wants to talk first, and the enquiry page simply stops incrementing.
- 30 distinct products per list; a repeated add merges into the existing line.
- The list does not sync between devices or browsers. That is the trade for requiring no account.
- Clearing storage, or a private window, clears the list. The customer is told the list lives in this browser and stays available so they can send it again.

## Tests

- `src/order/enquiry.test.ts` — quantities, merging, stale prices, unpublished products, unpriced items, message wording, corrupt saved data, blocked storage.
- `e2e/enquiry.spec.ts` — the flow end to end on desktop and a phone viewport, using a clearly-labelled test fixture (`e2e/fixtures.ts`). The committed catalogue is untouched and stays empty until the owner supplies real products.
