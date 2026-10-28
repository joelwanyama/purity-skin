# Catalogue builder (standalone HTML)

`PURITY_SKIN_Catalogue_Builder.html` is one self-contained file the shop owner can open in Chrome — from a USB stick, a Downloads folder, or offline on a phone hotspot. It needs no server, no install, no internet, and no account.

It is also published at `/downloads/purity-skin-catalogue-builder.html` once the site is deployed, so it can be sent as a link.

## What it collects

| Section | Fields |
| --- | --- |
| Shop details | business name, WhatsApp number (digits normalised), location, optional delivery summary |
| Products | name, page link (slug, auto-generated and editable), product type, pack size, price in UGX, draft/published, one-line summary, description |
| Photo | one image per product, centre-cropped to 4:5 and resized to ≤1600 px tall, converted to JPEG (quality 0.86) |
| Publish checks | "name, size and price are real" + "wording and claims checked", with live error/warning lists that mirror `src/catalog/validation.ts` |
| Pack record (owner only, optional) | UNBS Q-Mark as seen on the pack, manufacturer, batch/lot, expiry — each with an "I checked this on the pack" confirmation date, plus a switch for showing confirmed values to customers |
| Finish | free-text notes for the handover |

It also previews the product card exactly as the shop renders it, so what the owner approves is what customers see.

The pack record is described in `docs/CATALOGUE.md` and in section 4 of `docs/OWNER-GUIDE.md`. Two rules hold in the builder exactly as they hold in the app: a value reaches a customer only when it is recorded **and** confirmed **and** customer display is switched on, and a "Q-Mark not found" answer is never shown to customers at all.

## What it exports

**Download everything (ZIP)** — built in-page with a minimal stored-ZIP writer, so no library or network is required:

```
catalog.data.json                    → src/catalog/catalog.data.json
images/<product-slug>-01.jpg         → public/images/products/
whatsapp-catalog.csv                 → Meta Commerce Manager / WhatsApp Business catalogue feed
INTEGRATION-NOTES.txt                → what was entered, blocked items, checklist, owner notes
```

The CSV is the same catalogue as a product feed: one row per published product that has both a price and a photo, with the title, the description, `48000 UGX`, the product link and an absolute photo URL. Anything missing a price or a photo is left out rather than guessed. It can also be downloaded on its own with **WhatsApp catalogue CSV**.

**Download catalogue JSON only** — just the catalogue, for quick edits.

**WhatsApp catalogue CSV** — the feed above, on its own, for uploading to the WhatsApp Business catalogue so the same products are not typed twice.

Both are validated against the same parser the app uses (`parseCatalog`), which also demotes any product marked `published` that fails the gate, so an unsafe file cannot reach the shop.

## Integration

```sh
# 1. from the ZIP
cp catalog.data.json src/catalog/catalog.data.json
mkdir -p public/images/products && cp images/*.jpg public/images/products/

# 2. verify against the app's own parser and gate
npm run test && npm run lint

# 3. check it renders, then publish
npm run dev            # /shop should show the products
npm run publish:build  # rebuild + commit dist (Pages publishes the repo)
git push origin main && git push origin deploy
```

Photos referenced in the JSON are root-relative (`/images/products/<slug>-01.jpg`), which is exactly where the ZIP puts them.

## Important notes (added 2026-10-29)

A panel directly under the header, above the product list, listing every gap in every product's pack record: warnings first (Q-Mark looked for and not found, expiry already passed), then values recorded but not confirmed, then blanks. Each product name in the panel is a button that selects that product and scrolls to its editor.

The panel's chip reads `All records complete`, `N to fix` or `N products to fill in`, so the state is legible without opening anything.

`INTEGRATION-NOTES.txt` in the ZIP repeats this: each product gets a `pack record: N of 4 confirmed, shown to customers: …` line and a `pack record to do: …` line, and the checklist gains `Pack records complete: N of M`.

## Interface (refined 2026-10-29)

- **Three-step strip** at the top (Shop details → Products → Download) that fills in as you go and scrolls to each section.
- **Product rail** with a thumbnail, a completion meter per product and a one-glance chip: `Draft`, `Live`, or a count of blocking checks.
- **Addressable errors.** A problem appears under the field that causes it, and only after you have typed in that field or tried to publish — scanning an empty form never paints it red.
- **Readiness pill** beside the product title ("4 of 8 done" → "Ready — can publish" → "Published").
- **Grouped editor** (Basics · Words · Photo · Publish checks · Live preview) instead of one long form.
- **Mobile action bar** with the product count, "Add product" and "Download", so the primary action is always reachable with a thumb.
- **Keyboard:** `Ctrl/⌘ + S` downloads the ZIP, `Alt + A` adds a product.
- Palette, type and spacing now follow the shop's own brand (greige accent, serif headings); every text/background pair passes WCAG AA and axe reports no violations at desktop or phone widths.

## Behaviour worth knowing

- **Photos live in memory only.** After a reload or an import, a product that already has `image_path` shows "PHOTO ON FILE" instead of a broken image, and the owner can re-attach the file if it needs to be included again.
- **Nothing is uploaded.** All processing is local; photos are cropped with a canvas.
- **Autosave** keeps work in `localStorage`; if storage is blocked (some previews), the tool still works and says so.
- **Leaving the page** prompts only when there are changes since the last download.
- **Import is safe**: invalid JSON is rejected without touching existing work, and duplicate slugs are repaired.

## Verification performed (2026-10-29, pack record)

- Filled a product, selected `Seen on the pack`, and confirmed it: the line changed to `Confirmed from the pack on 28 Oct 2026` and the customer display switch became enabled. Recorded-but-unconfirmed (`B-2291`) stayed marked `hidden from customers`, and the summary read `2 of 4 confirmed · 0 shown to customers`.
- Exported the ZIP and read `catalog.data.json`: `compliance` present with real `confirmed_on` timestamps on the confirmed fields, `null` on the unconfirmed batch, `""` on the untouched expiry — no invented values.
- Reload persistence: `p-qmark` still `verified`, notes panel still listed the remaining gaps.
- Both widths (390 × 844 and 1280 × 900): no console errors, no page errors.

## Verification performed (2026-10-28)

- Fill → crop → publish → ZIP round trip in headless Chromium from `file://`, with all network requests blocked: no console or page errors.
- ZIP passes `unzip -t`; the exported `catalog.data.json` is accepted by `parseCatalog` with zero warnings, keeping the product published at UGX 48,000 with `photo_state: ready`.
- Publishing is refused until both confirmations are ticked; claim wording ("cures", "treats", "permanent") is flagged live.
- Axe: no serious or critical violations on desktop (1280×1000) or mobile (390×844); no horizontal overflow at either width.
- Storage-blocked environment: still fully usable.
- Re-import of the exported JSON preserves shop details, price and status without rendering broken images.
