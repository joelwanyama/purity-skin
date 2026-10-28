# Asset specifications

What exists today, what is still needed, and the exact rules so new files drop in without rework.

Every mark in `public/` now derives from the **official PURITY SKIN artwork** — the profile picture the shop publishes on its WhatsApp Business account, saved at `brand-src/purity-skin-whatsapp-profile.jpg`. No logo has been drawn, approximated or generated. No product photography has been invented, downloaded or generated.

## What ships now

| File | Size | Purpose | Source |
| --- | --- | --- | --- |
| `public/brand/purity-skin-avatar.jpg` | 640×640 | The artwork exactly as WhatsApp serves it | profile picture, copied verbatim |
| `public/brand/purity-mark.png` | 512×512 | Site mark (header, footer, hero, photo slots) | centre crop of the artwork |
| `public/og.png` | 1200×630 | WhatsApp/Facebook/X link preview | artwork on brand greige, composed |
| `public/icons/purity-512.png` | 512×512 | PWA install icon | `purity-mark.png` |
| `public/icons/purity-192.png` | 192×192 | PWA install icon | `purity-mark.png` |
| `public/icons/apple-touch-icon.png` | 180×180 | iOS home screen | `purity-mark.png` |
| `public/favicon-32.png` | 32×32 | Browser tab | `purity-mark.png` |

The old `public/icon.svg` and its `assets-src/*.svg` sources were an invented approximation of the logo and have been removed. There is no vector version of this artwork; do not recreate one by hand.

Regenerate everything with:

```sh
npm run assets
```

`scripts/build-brand-assets.mjs` derives every raster from `brand-src/purity-skin-whatsapp-profile.jpg` with ImageMagick (`magick` or `convert` must be on PATH). If the shop changes its profile picture, replace that one file and run the script — do not hand-edit the PNGs.

To refresh the source file: fetch `https://wa.me/256757377624` with a normal browser user agent, read the `og:image` URL from the HTML, and save it as `brand-src/purity-skin-whatsapp-profile.jpg`. The signed URL expires, so re-fetch rather than reuse an old link.

The touch icon and favicon are generated from the same square artwork; iOS applies its own rounded mask, so keep all content inside the central 80%.

## Product photography — the standard

No product photos exist yet. When they are supplied, follow this exactly so nothing has to be redone:

| Rule | Value |
| --- | --- |
| Format | JPEG (`.jpg`) — or WebP if you prefer smaller files |
| Aspect ratio | **4:5 portrait** (the shop renders in this box; anything else is cropped) |
| Long edge | 1600 px (≈ 300 KB or less per photo) |
| Background | The same dark plum studio backdrop as the video content |
| Framing | Product centred, label legible, no text overlay, no before/after, no hands |
| Lighting | Even, neutral — no filter that changes the product colour |
| File name | `product-slug-01.jpg`, matching the product's `slug` |
| Location | `public/images/products/` |
| Catalogue value | `image_path: "/images/products/product-slug-01.jpg"`, `photo_state: "ready"` |

Photos must be ones you own or have written permission to use. Do not use supplier images without a licence, and never a competitor's photograph.

Optional extras per product: a second detail shot (`-02.jpg`) for future galleries, and a 1:1 crop for social posts. Both are cheap to produce at the same shoot.

## Social and marketing assets still to produce

These are **not** built yet, and nothing here should claim otherwise:

1. **Story/reel end cards** (1080×1920) — reuse `og.png` layout, swap the headline.
2. **WhatsApp catalogue images** (1:1, 1080×1080) — one per product, logo bottom-left.
3. **A printable A4 price list** — for salons and resellers, generated from the same catalogue JSON so prices cannot drift.
4. **Email/receipt footer** — only once there is an email channel to send from.

## Colour and type tokens

Single accent, single radius, no gradients, no glass — taken from the brand reference:

| Token | Value |
| --- | --- |
| Canvas | `#141018` |
| Surface / raised | `#1e1826` / `#261d31` |
| Hairline | `#3a2f47` |
| Ink / muted | `#f4eef8` / `#b7a8c7` |
| Accent | `#e88bb0` |
| Accent soft | `#f7c9dd` |
| Price gold | `#ffd479` |
| Radius | 12 px |
| Type | system UI stack; monospace for codes, labels and prices |

## Checklist before announcing the shop

- [ ] Real photos in `public/images/products/` at 4:5, ≤ 300 KB each
- [ ] Every published product has `photo_state: "ready"` and a valid `image_path`
- [ ] `og.png` still accurate (it references `purityskin.pages.dev`)
- [ ] WhatsApp number confirmed by the owner
- [ ] Catalogue exported and committed, then pushed to `deploy`
