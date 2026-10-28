# Counting visits, without tracking people

## The decision

The owner asked for measurement **only if it helps the shop scale, kept minimal**. So the rule here is: count visits in aggregate or count nothing, never track a person.

## What is collected today

**Nothing.** `src/lib/analytics.ts` ships with no token, injects no script, sets no cookie of its own, and writes nothing to `localStorage`. The site's own code counts zero events. `/policies` says exactly this, in plain words, because a policy page that describes a tracker the site does not run is a lie.

## What would be collected if the owner switches it on

Cloudflare Web Analytics, a cookieless service Cloudflare provides on its own edge:

| | |
| --- | --- |
| Page views | daily totals, per page |
| Referrer | the domain a visitor arrived from, aggregated |
| Country | aggregated at country level |
| Cookies | none |
| Device identifier | none |
| Cross-site tracking | none |
| Personal data stored by us | none |
| Consent banner needed | no, because nothing is stored on or read from the visitor's device |

Enquiries are **not** counted by the site. Every enquiry is a WhatsApp message, so the owner already has a complete, better record of them, including what was asked and whether it was delivered.

## How to switch it on

1. In the Cloudflare dashboard: **Analytics → Web Analytics → Add a site**, and add `purityskin.pages.dev`.
2. Copy the beacon token (a 32-character string; it is public, and appears in the page source of every site that uses it).
3. In the repository's GitHub **Variables** (not secrets — this value is public), add `VITE_CF_BEACON_TOKEN`.
4. Re-run the deploy. Add `VITE_CF_BEACON_TOKEN=...` to `npm run build` so Vite bakes it in.
5. `/policies` changes by itself: `analyticsEnabled` becomes true and the page switches to the paragraph that describes the counting.
6. Read the numbers in the Cloudflare dashboard, weekly: how many people opened the shop, and which products were opened most.

Nothing else changes. No script tag is written by hand into `index.html`, so there is no way for a tracker to appear on the site without a build that turned it on.

## How it is tested

`src/lib/analytics.test.ts` (4 tests) proves:

- with no token, `startAnalytics()` returns false and injects no script;
- a blank or whitespace token is treated as no token;
- with a token, exactly one beacon is added, with the token and `spa: false`;
- calling it twice does not add a second beacon;
- it sets no cookie and writes nothing to `localStorage` or `sessionStorage`.

## What we are deliberately not doing

- **Per-person funnels, sessions, heatmaps, "how many people put X in the enquiry list".** All of those need an identifier, and an identifier is a person.
- **Advertising pixels.** Nothing here should follow a customer to Instagram.
- **A counter Worker.** It would need a database of aggregates, a retention policy and a deployment of its own, to answer a question WhatsApp already answers.
