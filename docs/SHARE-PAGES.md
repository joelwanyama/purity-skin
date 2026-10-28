# Share pages, previews and structured data

When a customer shares a PURITY SKIN link in a WhatsApp group, Facebook or X, the crawler that builds the preview **does not run JavaScript**. A single-page app therefore previews identically for every product, or not at all. This is the fix.

## What the build produces

`scripts/prerender.mjs` runs after `vite build` and writes, into `dist/`:

| File | Contents |
| --- | --- |
| `shop.html` | the shop, with its own title, canonical URL and `ItemList` |
| `shop/<slug>.html` | one per **published** product |
| `prerender.json` | what was written, so the build check and the live smoke test agree with the build |
| entries in `sitemap.xml` | one `<loc>` per product page, `priority 0.8` |

Each product page is the built `index.html` with its head rewritten and a readable `<noscript>` summary added:

- `<title>` — `Barrier Repair Serum 30 ml · PURITY SKIN`
- `description`, `og:*` and `twitter:*` — the product name, size, **confirmed price** and summary
- `og:type=product`, `canonical` = `https://purityskin.pages.dev/shop/<slug>`
- `og:image` — the 1200 × 630 share crop of the product photo when the photo pipeline made one, otherwise the brand card
- `Product` JSON-LD — **only when a confirmed whole-shilling price exists**: name, description, `sku`, `brand`, `offers.price`, `priceCurrency: UGX`, `availability`, `url`, `seller`

Real visitors still get the app: the page keeps `<div id="root">` and the hashed bundle, so React renders the same product from the same catalogue.

## Why `.html` files and not directories

Cloudflare Pages serves `dist/shop/index.html` at `/shop/` and answers `/shop` with a **308** redirect to `/shop/`. A canonical link that points at a redirect is a canonical link wasted, and the same would have applied to every product URL shared in WhatsApp.

So the prerenderer writes `dist/shop.html` and `dist/shop/<slug>.html`. Pages resolves the clean URL `/shop/<slug>` straight to the file: HTTP 200, no redirect, and the canonical, `og:url` and sitemap entry all match the URL a customer actually shares. `scripts/smoke-deployed.mjs` asserts this on the live site — it fails if `/shop` is not served directly.

## Rules that keep it honest

- **Only published products.** Drafts, archived products, products without a name or slug never get a page. `publishableProducts()` is the single gate.
- **No invented prices.** A product with `price_ugx: null` gets `Price confirmed on WhatsApp` in the description and **no** structured data. A `Product` with a guessed offer is exactly the invention this project refuses.
- **Unconfirmed pack details are not advertised.** The structured data carries name, price and photo only; the UNBS/PDPO record appears on the page itself, and only after the owner confirms it (see `docs/CATALOGUE.md`).
- **Text is escaped** for HTML and for the JSON-LD block (angle brackets become `\u003c`), so a product name can never inject markup.
- **Only the committed catalogue is used.** A draft that lives in the owner's browser cannot be prerendered, because the build cannot see it.

## Verified

- `scripts/lib/prerender.test.mjs` — 10 tests against a throwaway build directory using the real page template: per-product titles and canonicals, price in the description, `Product` present only with a confirmed price, drafts and unnamed products excluded, share crop preferred, brand fallback when a photo is missing, `ItemList` on the shop index, sitemap and manifest contents, honest empty shop, HTML/JSON escaping, and the `<noscript>` summary.
- `scripts/check-build.mjs` — fails the build if a published product has no `shop/<slug>.html`, if its canonical or `og:title` is missing, if it carries neither structured data nor the "price confirmed" wording, or if a page exists for a product that is not published.
- `scripts/smoke-deployed.mjs` — on the live URL, reads `/prerender.json` and requests every listed page, checking status, HTML type, its own metadata, that the app shell is still there for real visitors, and that any published Status card is a real PNG.

## Changing the domain

`SITE_ORIGIN=https://purityskin.ug npm run build` prerenders for another host. Nothing else changes; `index.html` and `src/lib/pageMeta.ts` carry the same origin for the app itself.
