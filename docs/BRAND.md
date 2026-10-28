# Brand

Everything here comes from the artwork PURITY SKIN already uses in public. Nothing was drawn to fill a gap.

## Source of truth

`brand-src/purity-skin-whatsapp-profile.jpg` — the profile picture of the WhatsApp Business account behind **+256 757 377 624**, the number every button on this site opens. It was read from the `og:image` that WhatsApp serves for `https://wa.me/256757377624` (the same image a customer sees when they open the chat).

That artwork contains, and therefore settles:

- the wordmark: **PURITY SKIN**, letter-spaced mono capitals inside a white band;
- the monogram: an oversized serif **Ps / PS**;
- the tagline: **"Formulated to Fix"**;
- the location line: **Kampala, Uganda**;
- two phone numbers: **256 769 486 125** and **256 757 377 624**.

> **To confirm with the owner:** which of the two numbers is for calls and which is WhatsApp-only. The site only ever uses `256 757 377 624`, because that is the number the artwork's WhatsApp mark is attached to and the one the shop has been using for orders. Do not publish the second number until the owner says what it is for.

## Colour

Sampled from the artwork rather than chosen by taste:

| Role | Hex | Where it comes from |
| --- | --- | --- |
| Artwork ground (greige) | `#C2B7BD` | dominant background colour of the logo |
| Ink | `#070506` | the monogram and wordmark black |
| Light neutral | `#DAD7D9` | the white band and highlights |
| Leaf green | `#31483F` | the small leaf on the "i" |

The storefront is a **dark inversion** of that artwork so product photography reads well against it:

```
--canvas:#0D0A0B  --surface:#191415  --surface-raised:#221B1D  --line:#372E30
--ink:#F4EFEF     --muted:#B3A6AB    --accent:#C2B7BD          --accent-ink:#14100F
--accent-soft:#E6DEE0  --gold:#DAD7D9  --ok:#9DBF97  --bad:#E39A9A  --leaf:#31483F
```

Rules:

- **One accent.** `#C2B7BD` is the only highlight colour: buttons, kickers, active states. Prices use the light neutral, not a second accent.
- **No invented colours.** If a new component seems to need another hue, it probably needs less decoration instead.
- **The greige is also the surface** for social cards, so a shared link looks like the shop's own profile picture.
- Contrast was checked with axe on every public page and the owner studio; there are no serious or critical violations at desktop or phone widths.

## Assets

| File | Use |
| --- | --- |
| `public/brand/purity-skin-avatar.jpg` | The artwork verbatim (640×640, as WhatsApp serves it) |
| `public/brand/purity-mark.png` | 512×512 centre crop — header, footer, hero tile, empty photo slots |
| `public/icons/*`, `public/favicon-32.png` | App icon, iOS home screen, browser tab |
| `public/og.png` | 1200×630 link preview: artwork on the greige with the tagline and the site address |

Regenerate all of them with `npm run assets`. Details and the refresh procedure: `docs/ASSETS.md`.

## Voice

The artwork says "Formulated to Fix". The site never extends that into a medical promise. Product copy may describe what a product is and how it is used; it may not claim to cure, heal, treat or permanently change skin. The publish gate flags that language before a product can go live, and the policies page states the limit in plain words.

## Off-brand things that were removed

- The invented "PS" monogram drawn in CSS (replaced by the artwork).
- The pink accent `#e88bb0` and the purple canvas `#141018` (replaced by the sampled palette).
- `public/icon.svg` and its `assets-src/*.svg` sources — a hand-drawn approximation of the logo. There is no vector original; approximating it again would be worse than using the raster.
