# Photo pipeline

Product photos are the only heavy asset on the shop, and most customers arrive on a phone, on mobile data, in Kampala. This is what happens to a photo between the owner choosing it and a customer's phone drawing it.

## What runs, and when

`npm run build` runs `node scripts/build-photo-variants.mjs` before Vite, so the variants always match the catalogue. `npm run photos` runs it on its own.

For every **published** product whose `image_path` starts with `/images/products/` and whose file exists, ImageMagick writes two siblings beside the original:

| Output | Size | Quality | Used for |
| --- | --- | --- | --- |
| `<name>-01.jpg` (owner's own file) | as supplied, capped at 1600 px tall | — | the product page on a large screen |
| `<name>-01-card.jpg` | 480 × 600 (4:5) | 82 | every card in the grid, and the grid on a phone |
| `<name>-01-share.jpg` | 1200 × 630 | 82 | `og:image`, so a WhatsApp link preview is landscape, not letterboxed |

Both derivatives are centre-cropped from the owner's photo and stripped of metadata.

The script also writes `src/catalog/photo-variants.json`, which the app imports at build time:

```json
{
  "/images/products/barrier-repair-serum-01.jpg": {
    "card": "/images/products/barrier-repair-serum-01-card.jpg",
    "share": "/images/products/barrier-repair-serum-01-share.jpg",
    "width": 1200,
    "height": 1500,
    "card_width": 480
  }
}
```

The app only advertises a `srcset` candidate that appears in that manifest, so an `<img>` can never point at a variant that was never built.

## What the browser is told

`ProductPhoto` renders:

- `srcset="<card> 480w, <original> <measured>w"` — but only when the manifest has the photo;
- `sizes` for the grid (`92vw` on a phone, `44vw` from 760 px) and for the detail page (`92vw`, `520px` from 980 px);
- `width`/`height` from the measured file, plus a CSS `aspect-ratio: 4/5` box, so the layout never moves when a photo arrives;
- `loading="lazy"` and `decoding="async"` everywhere except the one card or detail photo marked `priority`, which is `eager` with `fetchpriority="high"`.

A product with no approved photo shows the designed greige photo slot — never a stock or generated image.

## Numbers, measured

Measured on this machine with a 1200 × 1500 JPEG (289 kB at quality 86), which is a realistic phone export:

| File | Bytes |
| --- | --- |
| original | 296,446 |
| `-card.jpg` (480 × 600) | 40,938 |
| `-share.jpg` (1200 × 630) | 103,211 |

So a phone downloads **about 14%** of the original for each grid card. A twelve-product grid is roughly **490 kB** of card images rather than **3.5 MB** of originals, and untouched cards are lazy.

These are measurements of the pipeline, not of Lighthouse on a live twelve-product shop: the committed catalogue is empty until the owner supplies real products, and a Lighthouse score against an empty shop would be a number about nothing. When the catalogue lands, run the same measurement on real photos and record the result here.

## When it does nothing

- No published product with a local photo → nothing is resized, and `photo-variants.json` is written as `{}`.
- ImageMagick missing → the script logs a line and leaves the committed variants untouched, so a build never breaks on a machine without it.

`npm run check:build` fails if a published product references a photo without its card and share variants, or without measured dimensions.
