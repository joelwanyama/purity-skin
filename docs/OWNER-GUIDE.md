# PURITY SKIN owner guide

Everything you need to run the shop from a phone. No technical words unless they are unavoidable — and where they are, they are explained once.

Last updated: 29 October 2026. This guide is kept in step with the site; if a screen looks different from this page, tell us and we will fix whichever is wrong.

---

## 1. What is live right now

| What | Where | What it does |
| --- | --- | --- |
| The shop | purityskin.pages.dev | Customers browse, check a price and message you on WhatsApp |
| Catalogue builder | purityskin.pages.dev/downloads/purity-skin-catalogue-builder.html | Offline tool on your phone or laptop where you enter products and download a file for us |
| Catalogue studio | purityskin.pages.dev/studio/catalogue | Same editor, on the site itself. Saves drafts in your browser |
| Order ledger | purityskin.pages.dev/studio/ledger | Your private order book. Stays on your device |
| Price cards | purityskin.pages.dev/downloads/cards/ | Square 1080×1080 pictures for WhatsApp Status |

**The shop is deliberately empty.** No invented products, no made-up prices, no stock photos. It fills up as you add real products. That is on purpose — an empty shop is honest, a shop with a wrong price is not.

---

## 2. The two confirmations (read this once)

Before anything can appear in the shop, you tick two boxes for that product:

1. **The name, pack size and price are real.** You checked them against the actual product in front of you.
2. **The wording and claims have been checked.** Nothing promises a cure, a medical result, or an approval you do not have.

If either box is unticked, the product stays a draft. No exceptions — the tool will not let you publish it.

![The two confirmations in the builder](images/publish-checks.png)

Why so strict: a wrong price costs you a customer, and an unproven claim can cost you more than that. UNBS has been seizing non-compliant cosmetics in Kampala, and buyers are being told to check the pack. We would rather lose a sale than post a promise you cannot stand behind.

---

## 3. Add your first product (about four minutes)

You need: the product in your hand, the price you actually charge, and a photo you are allowed to use.

1. Open the **catalogue builder** link above. Bookmark it — you can use it offline once the page has loaded.
2. At the top, fill in **Shop details**: business name, WhatsApp number, location. Do this once.
3. Tap **Add product**.
4. Fill in:
   - **Product name** — exactly as printed on the pack.
   - **Product type** — Serum, Cleanser, Soap, and so on.
   - **Pack size** — exactly as printed, e.g. `30 ml`. Do not round it.
   - **Price (UGX)** — the price you actually charge, in whole shillings. Leave it empty until you have decided.
   - **One-line summary** — what it is, in one plain sentence.
   - **Description** — at least a sentence or two: what it is, what it is for, how to use it. No promises.
5. Add a **photo** if you have one you are allowed to use. It is cropped to 4:5 automatically.
6. Tick the **two confirmations** from section 2.
7. Set **Status** to *Published*. If the tool refuses, read the message under the buttons — it tells you exactly what is missing.

![The builder on a phone, after a product is filled in](images/builder-phone.png)

The **readiness meter** at the top of the editor counts eight details. When it says *Ready — can publish*, the product is complete.

---

## 4. The pack record (new, and why it exists)

Each product now has an optional **Pack record** below the photo. Four lines, all read off the physical pack:

- **UNBS Q-Mark** — seen on the pack, not applicable, or not found.
- **Manufacturer** — as printed.
- **Batch or lot code** — as printed.
- **Expiry** — the month printed on the pack.

Two separate things have to happen before a customer sees any of it:

1. You **record** a value, then tap **I checked this on the pack**. That stamps the date you confirmed it.
2. You switch on **Show my confirmed pack details to customers** for that product.

Until both are done, customers see nothing. Nothing is ever filled in for you — if you leave a line empty, that line simply does not exist on the product page.

![The pack record: two fields confirmed, one recorded but not confirmed](images/pack-record.png)

Three rules worth knowing:

- **"Q-Mark not found" is never shown to customers.** It is recorded for you, and the tool warns you about it, but the shop will not publish a negative statement about a supplier.
- **An unconfirmed value stays hidden.** If you type a batch code and do not confirm it, it will not appear.
- **An expired date is never shown.** If the expiry you recorded has already passed, the tool warns you and hides that line.

The **Important notes** panel at the top of the builder (and of the studio) lists every gap, most urgent first: warnings about a missing Q-Mark or a passed expiry come before ordinary blanks. Tap a product name in that panel to jump straight to it.

![Important notes, shown at the top of the builder](images/notes.png)

Why we built this: it is the record that answers "what did you verify about this pack?" — for a customer, for UNBS, and for you. It is a record, not a certificate. The shop never claims UNBS approved anything.

---

## 5. Photos

- JPG, PNG or WebP. Landscape or portrait both work; the site crops to 4:5.
- Use your own photo of the real product. No stock images, no generated images, no photos from another brand's page.
- One product photo is enough. The site shows a designed empty slot until you have one — that is better than a borrowed picture.
- Photos are resized for you: a small version loads on a phone, a bigger one on a laptop.

---

## 6. Send the catalogue back to us

1. In the builder, tap **Download everything (ZIP)**.
2. Send that ZIP file on WhatsApp to the number you already use for the site.
3. We add it, check it, and the shop updates.

The ZIP contains:

- `catalog.data.json` — every product exactly as you entered it.
- `images/` — your photos, named by us so they match.
- `whatsapp-catalog.csv` — a file you can upload to your WhatsApp Business catalogue (same products, same prices, no retyping).
- `INTEGRATION-NOTES.txt` — a plain summary of what is ready, what is blocked and which pack records are incomplete.

**Download catalogue JSON only** is there if you just want the data file. **Copy JSON** puts it on the clipboard.

Your work is saved in the browser as you type, so a dropped connection does not lose it. But a cleared browser does — download the ZIP before you close the tab for the day.

---

## 7. Price cards for Status

We generate one square picture per published product with a confirmed price, at **purityskin.pages.dev/downloads/cards/**. They carry the brand, the product, the size, the price and your WhatsApp number. Nothing else — no claims, no "before and after", no fake discounts.

Send one to your Status instead of typing a price. If a card is missing, that product either has no confirmed price or is not published yet.

---

## 8. When someone shares a product

Every published product has its own page, e.g. `purityskin.pages.dev/shop/<product-name>`. When a customer shares that link in a WhatsApp group, the preview shows that product's photo, name and price — not a generic shop card.

This only works for **published** products. A draft has no share page, because a shared link to something you cannot sell is worse than no link.

---

## 9. The order ledger — what did I promise last Tuesday?

Open **purityskin.pages.dev/studio/ledger**.

- **Paste an enquiry**: copy the message from WhatsApp, paste it, tap **Read the message**. The tool reads the items, sizes, quantities and total, then shows them for you to check before saving. It never guesses: if it cannot read a line, it says so.
- **Add it by hand** if a customer called instead of messaging.
- **Status** per entry: New, Confirmed, Delivered, Cancelled.
- **Export CSV** for a spreadsheet — do this at least once a week.
- **Backup (JSON)** before you change phones, then **Restore backup** on the new one.

![The order ledger with one enquiry saved](images/ledger.png)

**This is not a backup.** It lives in one browser on one device. Clearing browser data, a private window, a new phone or a full storage quota removes it. The export is your only real copy.

It also is not a customer database: we deliberately do not keep a server-side list of customers, because that brings legal duties (Uganda's Data Protection and Privacy Act) that are not set up yet.

---

## 10. What the shop never does

- No cart, no checkout, no card or mobile-money details. Orders are agreed in WhatsApp, payment happens between you and the customer.
- No customer accounts. Browsing needs no login, permanently.
- No stock counters, because we cannot keep them true.
- No invented products, prices, reviews or urgency ("only 2 left!").
- No medical claims. No cures, no permanent results, no guarantees.
- No tracking of individual people. See section 11.

---

## 11. Counting visits

Right now the site **counts nothing**. There are no cookies of our own, no advertising pixels, no cross-site trackers, no profiles.

If we switch on counting later, it will be Cloudflare's cookieless Web Analytics: daily totals and which pages were opened, no cookie, no identifier on a visitor's device, nobody followed to another site. The policies page says so in plain words on the day it changes.

Enquiries are not counted by the website at all. Every enquiry arrives as a WhatsApp message, which is a better record than any counter.

---

## 12. A week-one checklist

- [ ] Fill in your shop details in the builder.
- [ ] Add your three best-selling products, with real prices and real photos.
- [ ] Tick both confirmations for each one and publish.
- [ ] Download the ZIP and send it to us.
- [ ] Bookmark the ledger and log the next three enquiries you get.
- [ ] Export the ledger CSV once, so you know where the button is.
- [ ] Send one price card to your Status.

---

## 13. If something looks wrong

| What you see | What to do |
| --- | --- |
| The shop still shows no products | Your catalogue has not been added yet. Send the ZIP. |
| *Ready — can publish* but the status will not change | A ticked confirmation is missing, or the description is under 40 characters. The message under the buttons says which. |
| A product page shows no pack details | Either nothing is confirmed, or **Show my confirmed pack details to customers** is off. |
| The ledger is empty on a new phone | The ledger stays on the device it was written on. Restore your JSON backup. |
| A price is wrong on the site | Fix it in the builder, download the ZIP, send it. Never fix a price in the customer chat only — the two must agree. |
| The share preview shows the old photo | WhatsApp caches previews. Send the link once with a `?v=2` on the end to force a fresh one. |

---

## 14. Who to ask

Message the number on the site. Describe what you tapped and what you expected; a photo of the screen is worth a paragraph.
