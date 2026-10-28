# Catalogue, before the database

The shop's content is a single committed JSON file with an editor that runs in the browser. There is no backend yet, so this document is the honest description of how a product gets into the shop today.

> **This is not the protected owner workspace.** `/studio/catalogue` is a local drafting tool: anyone who opens it edits *their own browser copy* and can download a JSON file. Real owner access, product editing and stock arrive with the Supabase step, where accounts are invited and verified. Until then, publishing requires a Git commit by the repository owner.

## The standalone builder (for the shop owner)

`PURITY_SKIN_Catalogue_Builder.html` is a single offline file that collects the catalogue and exports a ZIP (JSON + pre-cropped, correctly named photos + handover notes). It is the easier path when someone other than a developer is filling in products: they open it in Chrome, work offline, and send back one file. Details and integration steps: `docs/BUILDER.md`.

## Files

| Path | Purpose |
| --- | --- |
| `src/catalog/catalog.data.json` | The committed catalogue. Ships empty on purpose. |
| `src/catalog/types.ts` | Domain types; field names mirror the planned Postgres columns. |
| `src/catalog/validation.ts` | Publish gate, claim screening, import normalisation. |
| `src/catalog/storage.ts` | Load/merge browser drafts, export, filtering helpers. |
| `src/catalog/useCatalog.ts` | React hook + context provider. |
| `src/pages/Studio.tsx` | `/studio/catalogue` editor (noindex). |

## The publish gate

A product can be `draft` or `published`. Only `published` products appear on the public site, and publishing is blocked until **all** of these pass:

1. Product name (2–70 characters), product type and pack size as printed on the pack.
2. A whole-number price in UGX greater than zero (suspiciously low prices warn).
3. A description of at least 40 characters.
4. An approved photo path, or an explicit photo slot — a path must be root-relative (`/images/...`) or `https://`.
5. **`owner_confirmed`** — the name, pack size and price have been checked against the real product.
6. **`claims_checked`** — the wording has been reviewed for medical claims.

Warnings do not block publishing but are shown while editing: missing photo, missing summary, and claim language such as *cures*, *heals*, *treats*, *permanent*, *guaranteed*, *100%*, dermatologist approval, regulator references, and skin-lightening wording.

The same gate runs on **import**. A hand-edited JSON file containing a `published` product that fails the gate is demoted to `draft` and the reason is reported, so the shop cannot be poisoned by a bad file.

## Editing workflow

1. Open `/studio/catalogue`.
2. Add or edit products. Every keystroke is written to this browser automatically (localStorage key `purity.catalog.v1`).
3. Fill in the pack size, the real price, and the photo path once a photo is approved.
4. Tick both confirmations.
5. Press **Download JSON**, which produces `catalog.data.json`.
6. Replace `src/catalog/catalog.data.json` with that file and commit:

```sh
git add src/catalog/catalog.data.json
git commit -m "Publish current catalogue"
git push origin main && git push origin deploy   # deploy branch triggers Cloudflare Pages
```

7. **Discard drafts** returns the browser to the committed file. Drafts in one browser are invisible to everyone else — including on a phone.

## Data shape

```json
{
  "version": 1,
  "note": "…",
  "settings": {
    "business_name": "PURITY SKIN",
    "whatsapp_number": "256757377624",
    "location": "Kampala, Uganda",
    "delivery_summary": ""
  },
  "products": [
    {
      "id": "local-a1b2c3d4",
      "slug": "barrier-repair-serum",
      "name": "Barrier Repair Serum",
      "category": "Serum",
      "size_label": "30 ml",
      "summary": "One line shown on cards.",
      "description": "What it is, how to use it. No medical claims.",
      "price_ugx": 48000,
      "image_path": "/images/products/barrier-repair-serum.jpg",
      "photo_state": "ready",
      "status": "published",
      "owner_confirmed": true,
      "claims_checked": true,
      "created_at": "2026-10-28T00:00:00.000Z",
      "updated_at": "2026-10-28T00:00:00.000Z"
    }
  ]
}
```

`slug` is derived from the name for drafts and frozen once a product is published, so shared links keep working. Duplicate slugs are repaired on import.

## Rules that keep this honest

- **Nothing is seeded.** The committed file contains zero products, and the public pages say so rather than showing sample prices.
- **No invented prices.** `price_ugx: null` renders as "Set price" internally and blocks publishing.
- **No invented photos.** Empty slots are designed and labelled, not filled with stock imagery.
- **Claim screening is a prompt for review, not legal clearance.** A human still has to check labels and local advertising rules.
- **The WhatsApp number** `256757377624` comes from earlier business material and must be confirmed as the number that actually answers before launch.

## Migration to Supabase

The field names are deliberately close to the draft schema in `supabase/migrations/202610280001_core.sql`:

| JSON | Postgres |
| --- | --- |
| `products[]` | `products` (`name`, `category`, `description`, `price_ugx`, `image_path`, `is_published`) |
| `slug` | new `slug` column (add on migration) |
| `photo_state` / `owner_confirmed` / `claims_checked` | owner-side review flags (new columns) |
| `settings.whatsapp_number` | `business_settings.whatsapp_number` |

The swap is an adapter in `src/catalog/storage.ts` behind the same `useShopCatalog()` interface, so the pages do not change. Public reads will then come from the narrow `public_catalog` view rather than the JSON file.
