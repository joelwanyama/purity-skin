# What PURITY SKIN actually is, and what it can become

*Research note, 28 October 2026. Written against the code in this repository, not against a pitch. Every claim about another platform or about Ugandan law carries a source in §8; anything I could not verify is marked **unverified**.*

---

## 1. The one-sentence answer

**This is not an online shop. It is a catalogue and an enquiry desk for a business that already sells on WhatsApp.**

The transaction — pricing agreement, delivery, payment, follow-up — happens in a WhatsApp thread between two people, as it did before the site existed. What the site adds is the part WhatsApp is bad at: a stable, fast, shareable place to *see* the products, check a *confirmed* price, and ask everything in one deliberate message instead of twenty scattered ones.

That distinction matters, because it decides what deserves to be built. A cart would duplicate what a person already does better in chat. A payment gateway would add risk the shop cannot carry ([PDPO](#sources) registration, refunds, fraud). A faster, clearer catalogue and a better opening message are worth more.

### The three artefacts

| Artefact | Path | Who it serves | What it is |
| --- | --- | --- | --- |
| Storefront | `/`, `/shop`, `/shop/:slug`, `/how-to-order`, `/about`, `/policies`, `/enquiry` | Customer | Public, account-free, no payment, no cookies |
| Catalogue file | `src/catalog/catalog.data.json` | Owner (via developer) | Single source of truth for products and shop details; validated on load |
| Catalogue builder | `PURITY_SKIN_Catalogue_Builder.html` | Owner directly | One offline HTML file: fill in products, crop photos, export ZIP → becomes the catalogue file |

The important architectural decision is that **the storefront never invents data**. A product cannot appear until name, pack size, a whole-shilling price, a description of at least 40 characters, a photo decision and two owner confirmations exist (`src/catalog/validation.ts`). Claim language — *cure, heals, treats, permanent, guaranteed, 100%, dermatologist-approved, FDA/WHO/NBS, whitens/bleach* — is flagged automatically. That is not decoration; it is the legal and reputational floor described in §6.

---

## 2. What the customer is actually trying to do

A buyer in Kampala arriving at this site has roughly eight questions, in this order. The site answers some of them well; the table says which, honestly.

| # | The question | Answered today | Where |
| --- | --- | --- | --- |
| 1 | Is this a real business with a real person behind it? | Yes — brand, location, WhatsApp, policies | Header, footer, `/about`, WhatsApp profile |
| 2 | What do you actually sell? | Only once products are published | `/shop` |
| 3 | What does it cost, **exactly**? | Yes — confirmed UGX only, never "from" | Cards, product page |
| 4 | What is in it / what is it for? | Depends on owner-supplied description | Product page |
| 5 | Can I see it before buying? | Only if the owner supplied a photo; otherwise an honest empty slot | Photo slots |
| 6 | Will it work for **my** skin? | Not answered — deliberately deferred to a human | "Ask about this product" |
| 7 | How does it reach me, and when? | Only if the owner wrote a delivery sentence | Product page, `/enquiry` |
| 8 | What happens if I pay and it is wrong? | Partly — policies page | `/policies` |

Two gaps stand out. **(6)** is where the money is made: a skincare customer with a specific skin situation does not need a bigger catalogue, they need one confident answer. **(7)** is the most common source of abandonment in Kampala delivery — the customer cannot judge the landed cost. Both are answerable *without* a checkout: an owner-written delivery line (already supported) and a short, honest FAQ about areas, timing and fees.

### Why "no cart" is the right call here

- Money in this market moves on MTN MoMo and Airtel Money, off-platform. A card form would be decorative, and a "Pay now" button that leads nowhere destroys trust faster than no button.
- Holding customer data creates legal duties: under Uganda's Data Protection and Privacy Act 2019, anyone who collects personal data must register with the Personal Data Protection Office (currently UGX 100,000 a year, renewable) and follow seven principles including data minimisation and storage limitation ([PDPO registration](#sources); [the Act](#sources)). Today the site stores nothing about a customer, anywhere. The enquiry list lives in the customer's own browser. **That is a compliance advantage worth protecting**, and it is the reason the roadmap in §7 keeps customer records local until the owner has registered.
- The buyer's own preference: people already ask prices on WhatsApp; giving them a fast way to ask *precisely* is a smaller behavioural change than teaching them to check out.

---

## 3. What the owner is actually trying to do

Ranked by how often it bites a Ugandan skincare seller:

1. **Publish a price and a photo without a developer.** Solved by the standalone builder: no server, no account, works offline, exports a ZIP.
2. **Never publish a price they are not sure about.** Solved by the two confirmations and the publish gate.
3. **Not lose the catalogue.** The builder autosaves to `localStorage`, exports JSON, and prints a human-readable `INTEGRATION-NOTES.txt`.
4. **Answer enquiries without retyping.** The enquiry message arrives already structured: product, size, quantity, unit price, listed total, note.
5. **Reuse the same product data everywhere else.** *Not yet solved* — see §7 item 2. The same catalogue is currently entered by hand a second time into the WhatsApp Business catalogue, a third time into an Instagram bio link, and a fourth into TikTok captions.
6. **Stay on the right side of UNBS and the PDPO.** Partly solved (claim screening, no data collection). The missing piece is a place to record the things a buyer or an inspector may ask for: UNBS Q-mark status, batch/lot number, manufacturer or importer, expiry.
7. **Know what is actually happening.** No analytics, deliberately. See §7 item 5 for a privacy-preserving way to count enquiries without any personal data.

---

## 4. What the business actually is, in market terms

Uganda's digital market is not a web market; it is a WhatsApp market with a web fringe:

- WhatsApp carries on the order of **10 million users in Uganda** and dominates business messaging; TikTok is comparable in reach (~9.3M) but consumes far more data per user ([UCC-derived figures, Q3 2025](#sources)).
- **Facebook has been blocked in Uganda since 2021**, so Instagram is the only Meta surface that behaves normally for reach ([same](#sources)).
- Mobile internet is the constraint: ~17 million mobile internet subscriptions, and a market where every page weight matters ([UCC-derived](#sources)). The built site is one HTML file plus one CSS file plus one JS bundle of ~380 KB uncompressed (~114 KB gzipped) — no web fonts, no analytics, no third-party scripts.
- **WhatsApp's own catalogue is capped at 500 items**, one catalogue per account, up to 10 images per item, with a product code and a website link per item; a single multi-product message can carry only 30 items ([catalogue limits](#sources)).

That last point is the strategic opening: **WhatsApp is excellent at the conversation and mediocre at the browse.** 500 items is plenty for this shop, but browsing a catalogue inside a chat UI is slow, unsearchable, and shows no story. A fast website that mirrors the same catalogue, then hands the customer to WhatsApp with a precise message, plays to each surface's strength.

---

## 5. What comparable tools do — and the gap this fills

| Option | Browse | Confirmed prices | Photo quality | Enquiry quality | Data collected | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| WhatsApp Business catalogue alone | Weak (in-chat) | Yes | Cramped | Free-form | Minimal | Free |
| Instagram / TikTok profile | Weak (feed, not search) | No | Good | Free-form DM | Meta's | Free |
| Jumia / marketplace | Strong | Yes, with commission | Good | Cart + checkout | Full | Commission per sale |
| Shopify + WhatsApp button | Strong | Yes | Good | Cart | Full | Monthly + transaction fees |
| **This site** | Strong, searchable, instant | Yes, gated | 4:5, cropped, consistent | Structured one-message enquiry | **None on the server** | Hosting on Cloudflare Pages free tier |

This site's honest weaknesses against those: no payments, no stock counts, no order history, no delivery tracking, and a catalogue that currently updates by commit rather than by tapping "save" in a browser. Those are trade-offs, not oversights — but two of them (catalogue update path, order log) are the natural next phase, and both need the owner's data-protection position settled first.

---

## 6. The regulatory floor nobody tells small beauty sellers

This is the part of the research that changes what the product should do.

- **Cosmetics sold in Uganda sit under compulsory UNBS standards.** The Uganda National Bureau of Standards has declared standards for cosmetics and related products compulsory, including East African standards for special-purpose skincare (anti-aging, sunscreen) and a labelling standard, **US EAS 346:2013, Labelling of cosmetics — General requirements** ([UNBS notice](#sources); [UNBS webstore](#sources)).
- **Enforcement is active and physical.** In November 2025 UNBS seized over 2,000 kg of cosmetics in a two-day operation at Jumbo Arcade in Kampala; 21 of 25 shops inspected were selling non-compliant goods, and hydroquinone — banned in Uganda — was the trigger. UNBS publicly asks buyers to look for the **Q-Mark** and to report unlabelled products ([enforcement report](#sources)).
- **Therefore:** claim screening in the publish gate is necessary but not sufficient. The catalogue should also let the owner record Q-Mark status, batch number, manufacturer/importer and expiry, and the product page should be able to show whatever the owner has verified — *and nothing they have not*. A buyer who can see "Q-Mark: verified by owner on 12 Nov" has a reason to trust; an inspector asking "where is the batch number" gets an answer.

**What this means for the site's honesty rule.** The rule "no invented products, prices, photos or claims" is not a design preference. In this market it is the difference between a shop and a liability. Every future feature should be judged against it.

---

## 7. The gap list, ranked by value per unit of risk

Effort is my estimate for this codebase; value is from the owner/customer jobs above.

### 1. One catalogue, four channels (high value, low effort, no new risk)

The owner currently re-types products into WhatsApp's catalogue and Instagram. The catalogue JSON already holds name, description, price, size, photo path and slug. Generate, from the same file:

- a **Meta/WhatsApp catalogue feed (CSV)** for Commerce Manager — product code, price with currency, absolute image URL, link to the site;
- a **price-list image** for WhatsApp Status and Instagram Stories (square, brand-styled, no claims);
- a **link-in-bio line** for TikTok/Instagram.

Shipped this session: the CSV export (`npm run export:whatsapp`, and a button in the builder). The Status image is the next small win.

### 2. Share previews that actually work in WhatsApp (high value, medium effort)

When someone shares `purityskin.pages.dev/shop/<slug>` in a WhatsApp group, Meta's crawler fetches the HTML **without running JavaScript**. Today every share shows the same generic card. Prerendering one static HTML file per published product at build time — with that product's title, description, price and photo in the `og:` tags, plus `Product` structured data — turns every share into a miniature advert with a picture and a price. This is the highest-leverage customer-acquisition work available and it needs no new data: it needs the catalogue, which arrives with the ZIP.

### 3. Owner-side order log without becoming a data controller by accident (high value, high effort)

The owner needs to remember who asked for what. The cheapest honest version: the enquiry link already carries everything, so the owner can either (a) keep using WhatsApp's own history, or (b) keep a local ledger in the browser (no server, no PDPO exposure, no cross-device sync). Only after the owner registers with the PDPO should customer records move server-side — that is the gate for the Supabase phase, and it should be treated as a legal gate, not a technical one.

### 4. UNBS/PDPO record fields (medium value, low effort)

Four optional catalogue fields — Q-mark status, batch/lot, manufacturer/importer, expiry — displayed only when the owner has filled them, with the date they were confirmed. This turns a compliance obligation into visible trust, and it costs almost nothing.

### 5. Counting enquiries without tracking people (medium value, low effort)

Cloudflare Pages can serve a lightweight, cookie-free analytics beacon, or the shop can count "enquiry link clicked" events in aggregate. Either way: no cookies, no personal data, no consent banner, and a number the owner can act on ("eleven enquiries this week, four about the same product").

### 6. Performance as a feature (medium value, low effort)

Photos are the only heavy asset. The builder already crops to 4:5 and caps at 1600 px; the site can go further with a 480 px card variant and `loading="lazy"` plus intrinsic `width`/`height` so the grid never jumps on a slow connection. On mobile data in Kampala this is not micro-optimisation, it is the difference between a page and a spinner.

### 7. Custom domain and durability (medium value, low effort, blocked on the owner)

`purityskin.pages.dev` works and is verified. A custom domain (`purityskin.ug`, `purityskin.co.ug`, or a `.com`) buys memorability and an email address, and is a prerequisite for looking established to a first-time buyer. It is blocked only on the owner choosing and paying for one.

### 8. What I would deliberately **not** build

- **A cart and checkout.** Duplicates WhatsApp, invites fraud, requires PDPO registration, and breaks the "no payment here" promise that the whole trust argument rests on.
- **Customer accounts.** The shop's best line is "no account needed". The owner's customer access problem is real but it is an owner problem, solved by an invite + verified identity later, not by making buyers register.
- **A chatbot that answers skin questions.** In a category where the wrong answer is a medical claim, a confident bot is a liability. A human answer, with the question pre-filled, is better.

---

## 8. Roadmap, in order, with the gate for each

| Phase | What ships | Gate |
| --- | --- | --- |
| **Now** | Enquiry list; brand artwork from the official logo; standalone builder; WhatsApp catalogue CSV | None — done |
| **Next** | Prerendered per-product share pages + `Product` structured data; 480 px photo variants; Status/Stories price card | Real catalogue (the ZIP) |
| **Then** | UNBS/PDPO record fields; aggregate enquiry counting; custom domain | Owner decision + domain purchase |
| **Later** | Owner order log | Owner registers with the PDPO |
| **Last** | Supabase (catalogue, orders, customers, invites) | PDPO registration **and** a written retention policy |

---

## 9. How success should be measured

Not vanity metrics. Three numbers, all obtainable without tracking individuals:

1. **Enquiries per week** (aggregate click count on the WhatsApp send action).
2. **Enquiries that mention two or more products** — the enquiry list exists to raise the value of each conversation; if that number stays at zero, the feature is not being used and should be removed.
3. **Time from "owner has photos" to "product is live"** — the pipeline's true cost. The builder plus the import script should keep this under ten minutes for a batch of ten products.

Anything that cannot be measured honestly should not be claimed. The site's copy already follows that rule; the analytics should too.

---

## <a id="sources"></a>Sources

- Uganda Communications Commission figures as reported in trade summaries of Q3 2025 — WhatsApp ≈ 10M users in Uganda, TikTok ≈ 9.3M, ~17M mobile internet subscriptions, Facebook blocked since 2021: [leadwithvantage.com](https://www.leadwithvantage.com/blog/digital-marketing-in-uganda), [reelanalytics.net](https://reelanalytics.net/media-resources/the-uganda-marketing-at-an-inflection-point-mass-media-and-digital-advertising-report-2025), [leadwithvantage.com (social)](https://www.leadwithvantage.com/blog/social-media-advertising-uganda). *These are secondary summaries; the underlying UCC report was not fetched, so treat the exact figures as approximate.*
- WhatsApp Business catalogue limits (500 items, one catalogue, 10 images per item, 30 items per multi-product message): [helo.ai](https://helo.ai/resources/blog/whatsapp-catalog), [instantreply.co](https://www.instantreply.co/blog/whatsapp-catalog-guide-2026).
- Uganda Data Protection and Privacy Act 2019 — registration with the Personal Data Protection Office under NITA-U, mandatory for data collectors/controllers/processors, seven principles, no size threshold: [pacmap.dev](https://pacmap.dev/regulation/ug-dppa-2019), [thequickconsult.com](https://thequickconsult.com/blog/uganda-data-protection-act-business), [wakilii.org](https://wakilii.org/knowledge/data-protection-uganda).
- Registration fee of UGX 100,000, renewed annually: [amitgadhia.com](https://amitgadhia.com/uganda-data-protection-act-deadline-for-registration/).
- UNBS compulsory standards for cosmetics and the labelling standard US EAS 346:2013: [UNBS declaration notice, Dec 2025](https://www.unbs.go.ug/attachments/alerts/1/DECLARATION%20NOTICE%20DECEMBER%202025%20-%20Copy.pdf), [UNBS webstore](https://webstore.unbs.go.ug/).
- UNBS enforcement, hydroquinone ban, Q-Mark guidance (November 2025, Jumbo Arcade, Kampala): [hpcmagmea.com](https://www.hpcmagmea.com/2025/11/28/uganda-bans-over-2000kg-of-skin-lightening-creams-over-cancer-linked-chemical/).
- East African draft standards for anti-aging and sunscreen skincare, notified to the WTO (2024): [gpcgateway.com](https://gpcgateway.com/regulatory-regions/africa/news-detail/east-african-countries-notify-wto-of-draft-standards-for-skincare-products-MTMwNw%3D%3D).
- Official brand artwork: the WhatsApp Business profile picture served at `wa.me/256757377624`, copied into `brand-src/` and processed by `scripts/build-brand-assets.mjs`.

**Unverified / to confirm with the owner:** the legal trading name and TIN behind the brand; whether the products are locally manufactured or imported (which decides which UNBS route applies); whether a PDPO registration already exists; the second phone number shown on the artwork (256 769 486 125) and what it is for.
