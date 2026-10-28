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
| Finish | free-text notes for the handover |

It also previews the product card exactly as the shop renders it, so what the owner approves is what customers see.

## What it exports

**Download everything (ZIP)** — built in-page with a minimal stored-ZIP writer, so no library or network is required:

```
catalog.data.json                    → src/catalog/catalog.data.json
images/<product-slug>-01.jpg         → public/images/products/
INTEGRATION-NOTES.txt                → what was entered, blocked items, checklist, owner notes
```

**Download catalogue JSON only** — just the catalogue, for quick edits.

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

## Behaviour worth knowing

- **Photos live in memory only.** After a reload or an import, a product that already has `image_path` shows "PHOTO ON FILE" instead of a broken image, and the owner can re-attach the file if it needs to be included again.
- **Nothing is uploaded.** All processing is local; photos are cropped with a canvas.
- **Autosave** keeps work in `localStorage`; if storage is blocked (some previews), the tool still works and says so.
- **Leaving the page** prompts only when there are changes since the last download.
- **Import is safe**: invalid JSON is rejected without touching existing work, and duplicate slugs are repaired.

## Verification performed (2026-10-28)

- Fill → crop → publish → ZIP round trip in headless Chromium from `file://`, with all network requests blocked: no console or page errors.
- ZIP passes `unzip -t`; the exported `catalog.data.json` is accepted by `parseCatalog` with zero warnings, keeping the product published at UGX 48,000 with `photo_state: ready`.
- Publishing is refused until both confirmations are ticked; claim wording ("cures", "treats", "permanent") is flagged live.
- Axe: no serious or critical violations on desktop (1280×1000) or mobile (390×844); no horizontal overflow at either width.
- Storage-blocked environment: still fully usable.
- Re-import of the exported JSON preserves shop details, price and status without rendering broken images.
