# Build backlog

What to build next, why, and how we will know it is done. Ordered by value per unit of risk, not by how interesting it is. Every item here is buildable **before** the owner's ZIP arrives, using clearly-labelled test fixtures — the committed catalogue stays empty until real products exist.

Status legend: **done** · **ready** (no blockers) · **needs owner** (blocked on a decision or file from the owner).

---

## Shipped in the 29 October 2026 round (items 1–7 below)

| # | Item | Evidence |
| --- | --- | --- |
| 1 | Per-product share pages with real previews | `scripts/lib/prerender.mjs` + 10 unit tests; `check-build` fails when a published product has no page; live smoke test requests each page from `/prerender.json`. See `docs/SHARE-PAGES.md` |
| 2 | Photo pipeline: 480 px card, 1200 × 630 share crop, `srcset`/`sizes`, measured `width`/`height`, lazy | `scripts/build-photo-variants.mjs`, `src/catalog/photo-variants.json`, `ProductPhoto.tsx`; measured 296 kB → 41 kB per card. See `docs/PHOTO-PIPELINE.md` |
| 3 | 1080 × 1080 Status price cards | `npm run export:cards` → `public/downloads/cards/<slug>.jpg` (157 kB measured on a 1080 × 1080 card with a photo, budget 300 kB), only for published products with a confirmed price |
| 4 | UNBS / PDPO pack record, owner-first | `src/lib/compliance.ts` + 17 unit tests, `ComplianceNotes`/`ComplianceEditor`, builder section + notes panel, `/policies#pack-record` |
| 5 | Aggregate, cookieless counting — **off by default** | `src/lib/analytics.ts` + 4 tests; nothing is collected until `VITE_CF_BEACON_TOKEN` is set. See `docs/PRIVACY-ANALYTICS.md` |
| 6 | Browser-local order ledger | `/studio/ledger`, `src/order/ledger.ts` + 17 tests: paste parsing, statuses, CSV, JSON backup, storage sanitising |
| 7 | Owner guide, written for a phone | `docs/OWNER-GUIDE.md` → `npm run guide` → printable PDF + HTML copy in `public/downloads/` |

### Verified on the live URL (29 October 2026, commit `bc2b183`)

Everything below was checked in a real browser against `https://purityskin.pages.dev`, at 390 × 844 and 1280 × 900, with no console or page errors:

| Check | Result |
| --- | --- |
| Deployment smoke test (extended) | 16 checks passed: build output, `/shop` prerendered title and canonical, `/prerender.json` readable, honest "no products yet" note, PDF/HTML/builder downloads |
| `/studio/ledger` | loads, paste parses `2 × Live check (test only) (30 ml) — UGX 96,000`, "not a backup" warning present, axe clean |
| `/studio/catalogue` | with the committed empty catalogue the notes panel is **absent** (nothing to report); with a browser draft it lists the gaps and the pack record reads `3 of 4 confirmed · 3 shown` |
| `/shop/<draft>` | 3 confirmed pack rows shown, unconfirmed batch code hidden |
| `/policies#pack-record` | section present; counting paragraph reads "This shop does not run analytics…"; **0** analytics scripts in the page |
| `/downloads/purity-skin-owner-guide.pdf` | HTTP 200, `application/pdf`, real `%PDF-` header, 526 kB; HTML copy 715 kB; builder 121 kB |
| CI | `Cloudflare Pages` and `verify` (lint, typecheck, 106 unit tests, embedded-Postgres tests, build, committed-dist check, Playwright + axe) both green |

### Known limitation of this environment

The full Playwright suite (54 tests) passes in CI but is flaky **in this 2 GB sandbox** when run with two workers: Chromium is killed mid-test (`Target crashed`). Running the suites with `--workers=1` gives 8/8 and 22/22. This is a local resource limit, not a product defect.

## Shipped in the previous round

| # | Item | Why it mattered | Evidence |
| --- | --- | --- | --- |
| 1 | Enquiry list + one-message WhatsApp handoff (`/enquiry`) | A buyer wanting three items had to send three messages; the shop got worse as the catalogue grew | 18 unit + 6 e2e tests; prices re-read from the catalogue so a saved list cannot send a stale price |
| 2 | Brand from the real artwork (`brand-src/`, `npm run assets`) | The site was using an invented "PS" monogram and a pink palette the shop has never used | Header, footer, hero, icons, favicon, share card all derive from the WhatsApp profile picture |
| 3 | Absolute `og:image`/`og:url` | WhatsApp ignores relative image URLs, so every shared link previewed as nothing | New smoke check fails the deploy if it regresses |
| 4 | WhatsApp/Meta catalogue CSV (`npm run export:whatsapp` + builder button) | The owner would otherwise type every product twice — once here, once into WhatsApp | 6 unit tests; skips and reports anything without a price or photo |
| 5 | Builder UI redesign | An owner with ten products and a phone needed a form that shows progress and errors where they happen | axe clean at 390 px and 1280 px; two real defects found and fixed (hidden buttons, AA contrast) |
| 6 | Research note (`docs/PRODUCT-RESEARCH.md`) | The roadmap has to answer to UNBS/PDPO reality, not to a generic e-commerce template | Sourced; unverified items labelled |

---

## Next: do these while waiting for the ZIP

### 1. Per-product share pages with real previews — **ready**
**Why.** When someone shares `purityskin.pages.dev/shop/<slug>` in a WhatsApp group, Meta's crawler fetches the HTML without running JavaScript, so today every product shares the same generic card. This is the single highest-leverage customer-acquisition item, and it needs nothing but the catalogue.

**Build.** At build time, emit one static HTML file per published product (and one for `/shop`) containing: the product title, the confirmed price, the description, the photo, `og:image` pointing at that photo, and `Product` structured data (`priceCurrency: UGX`, `availability`, `brand`). The SPA stays as-is for real visitors; crawlers get the static snapshot.

**Done when.**
- `curl https://purityskin.pages.dev/shop/<slug>` returns HTML containing the product name and `UGX` price without executing JS.
- Facebook Sharing Debugger / WhatsApp preview shows the product photo and price.
- The build still regenerates deterministically, and `check-build` fails if a published product has no page.

**Risk.** Low. No new data, no server. **Effort.** ~half a day.

### 2. Photo pipeline: card variants and no layout shift — **ready**
**Why.** Photos are the only heavy asset. The builder caps them at 1600 px tall and 4:5; serving that into a 250 px card on mobile data in Kampala is wasteful, and a grid that jumps while images load feels broken.

**Build.** At build time emit `<slug>-card.jpg` (480 px wide, quality ~80) beside the full image. `ProductPhoto` gains `srcset`, `width`/`height` (4:5 intrinsic), and `loading="lazy"` with the first card eager. Show a low-contrast skeleton (the brand greige) while loading, never a broken frame.

**Done when.** A 12-product shop on a throttled 3G profile loads the grid with no layout shift (CLS ≈ 0), first card under 1.5 s, and total image weight under ~600 KB. Measured with Lighthouse, numbers recorded in `docs/PHOTO-PIPELINE.md`.

**Risk.** Low. **Effort.** ~half a day.

### 3. A printable price card for WhatsApp Status / Instagram Stories — **ready**
**Why.** The owner already posts to Status; today that means typing a price or screenshoting a chat. A square 1080×1080 card, generated from the same catalogue, keeps prices consistent everywhere and looks like the shop.

**Build.** A script (and a builder button) that renders one square image per published product: brand greige ground, the product photo, name, size, `UGX 48,000`, WhatsApp number. **No claims, no "before/after", no discounts** — those are the things that get a business into trouble.

**Done when.** `npm run export:cards` writes `public/downloads/cards/<slug>.png`, each under 300 KB, and the file can be sent straight to Status.

**Risk.** Low. **Effort.** ~2 hours with the existing ImageMagick pipeline.

### 4. UNBS / PDPO record fields — **ready**
**Why.** The research found UNBS actively seizing non-compliant cosmetics in Kampala and asking buyers to look for the Q-Mark. Being able to record and display what the owner has verified is both a compliance aid and a trust signal. It costs almost nothing.

**Build.** Four optional catalogue fields per product: `qmark_status` (`verified` / `not applicable` / `unverified`), `batch_lot`, `manufacturer`, `expiry`. Shown on the product page **only** when the owner filled them, with the date they were confirmed. A small "What this means" line links to `/policies`. Nothing is ever inferred.

**Done when.** Fields round-trip through builder → JSON → shop; a product with none of them renders exactly as today; the policies page explains in plain words why the shop shows them.

**Risk.** Low — but do not let it imply the shop certifies anything it has not been told. **Effort.** ~half a day.

### 5. Aggregate enquiry counting, no people tracked — **ready**
**Why.** The owner needs to know if any of this works. Today there is no measurement at all, by design.

**Build.** Count two events only — "enquiry link clicked" and "product page opened" — as daily totals via Cloudflare's cookieless Web Analytics (or a tiny Worker counter). No cookies, no IDs, no IP storage, no consent banner, nothing personal.

**Done when.** A weekly number the owner can read ("11 enquiries, 4 about the same product") and a `docs/PRIVACY-ANALYTICS.md` stating exactly what is and is not collected.

**Risk.** Medium — it flips the site from "collects nothing" to "collects aggregate counts". Decide deliberately, and say so on `/policies`. **Effort.** ~2 hours.

### 6. Owner-side order log, kept local — **ready (with a warning)**
**Why.** The owner needs to remember who asked for what. But server-side customer records trigger PDPO registration duties (see research §6). 

**Build.** A local ledger in the owner's browser: paste the WhatsApp enquiry text, or type it, and get a simple list with date, items, total, and a status (`new` / `confirmed` / `delivered`). Export CSV. Nothing leaves the device, no account, no server.

**Done when.** The owner can answer "what did I promise last Tuesday?" from one screen, and the page states plainly that the data lives only in that browser.

**Risk.** Medium: browsers lose data. Must be paired with one-click CSV export, and the copy must say "this is not a backup". **Effort.** ~1 day.

### 7. Owner guide, written for a phone — **ready**
**Why.** Everything built so far assumes someone will explain it. A one-page guide — how to add a product, what the two confirmations mean, how to send the ZIP, why a price cannot be published without a photo decision — is the difference between a tool and a tool that gets used.

**Build.** `docs/OWNER-GUIDE.md` and a printable single-page PDF, in plain English, with the builder's own screenshots.

**Done when.** Someone who has never seen the site can add a product and export the ZIP using only the guide.

**Risk.** None. **Effort.** ~2 hours.

---

## Needs the owner before it can start

| # | Item | What is needed | Gate |
| --- | --- | --- | --- |
| 8 | **Integrate the catalogue** (JSON + photos + CSV) | The ZIP | Import script `npm run import:catalogue <zip>` with the validation gate; preview link; owner approval before it goes public |
| 9 | **Custom domain** | Choice + purchase of `purityskin.ug` / `.co.ug` / `.com`, DNS access | Canonical URLs, sitemap, OG and the WhatsApp catalogue feed all switch to the domain in one commit |
| 10 | **Second phone number** | What `256 769 486 125` is for (calls? deliveries?) | Publish it next to the WhatsApp number, or leave it out |
| 11 | **Order log with accounts** (Supabase) | PDPO registration **and** a written retention policy | Then: real login, roles, order history, inventory behind `/owner` |
| 12 | **Delivery sentence** | Real areas, fees and timing | Replaces "confirmed on WhatsApp" on the product page and in the enquiry message |

---

## Deliberately not building

- **Cart and checkout** — duplicates WhatsApp, invites fraud, requires PDPO registration and breaks the "no payment here" promise the whole trust argument rests on.
- **Customer accounts** — the shop's best line is "no account needed". Customers stay account-free, permanently.
- **An AI chatbot answering skin questions** — in a category where a wrong answer is a medical claim, a confident bot is a liability. The enquiry list already pre-fills the human conversation.
- **Stock counters** — without a reliable stock feed it would either lie or need daily manual edits. Better to say "confirmed on WhatsApp" than to show "12 left" that is wrong.
- **A light mode** — the shop is a photography surface, and the dark inversion is what makes product photos read. Not worth the double QA yet.

---

## How each item gets accepted

No item ships without all five:

1. Unit tests for the logic (money, validation, message text).
2. An end-to-end pass at 390 px **and** 1280 px, with no console errors.
3. axe: zero serious or critical violations.
4. `npm run check` green, committed `dist/` current, CI `verify` + `Cloudflare Pages` green.
5. A line in the docs saying what it does, what it deliberately does not do, and how it was verified — with real numbers, not adjectives.
