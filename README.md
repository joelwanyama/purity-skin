# PURITY SKIN · Formulated to Fix

A customer-facing product catalogue with WhatsApp handoff, plus a private owner workspace for products, stock, orders and customer records. Built as a React/Vite single-page application for Cloudflare Workers + Static Assets, with Supabase Auth/Postgres as the planned backend.

## Project status

The public site is built and hostable. It has a real multi-page storefront, a documented catalogue workflow and generated brand assets. What it deliberately does **not** have is invented content: the committed catalogue ships empty, so the shop currently tells visitors the collection is still being prepared instead of showing sample prices.

Three stages remain before it is a production business tool:

1. **Content** — real products, prices and approved photos entered through the catalogue studio and committed.
2. **Backend** — Supabase project, applied migration, invited owner, live auth (see `docs/PHASE7_STATUS.md`).
3. **Launch checks** — WhatsApp number confirmed, claims reviewed, real-backend end-to-end test, custom domain.

The earlier offline app and its JSON backup remain migration sources and must stay untouched until reconciliation and explicit owner acceptance.

## The site

| Route | What it is |
| --- | --- |
| `/` | Storefront: hero, published products, how ordering works, what the shop promises |
| `/shop` | Full collection with type filters and search |
| `/shop/:slug` | Product detail: price, description, facts, WhatsApp enquiry, related items |
| `/how-to-order` | The four-step WhatsApp handoff, delivery and safety notes |
| `/about` | How the shop works and what it will not claim |
| `/policies` | Ordering, delivery, returns, claims, privacy, accessibility |
| `/studio/catalogue` | **Local drafting tool** for catalogue content (noindex, no auth) |
| `/owner` | Protected owner workspace shell (needs Supabase configuration) |
| anything else | A real 404 page, not a blank screen |

The public shop reads `src/catalog/catalog.data.json` through one hook (`useShopCatalog`). Swapping that file for Supabase later is an adapter change, not a rewrite — see `docs/CATALOGUE.md`.

## Customer journey

- Public product browsing and WhatsApp enquiry do not require an account.
- Prices come from the committed catalogue and are only shown for products that pass the publish gate (real price, pack size, approved photo, owner-confirmed, claims-checked).
- A listing is public only when the owner publishes it and sets a confirmed UGX price. Product names/prices are never seeded as if live.
- The site does not take payment. PURITY SKIN confirms availability, delivery and the final order in WhatsApp.
- Customer-specific accounts/unlocks are **not implemented**. Future customer access must use individual invitation plus verified identity; it must not reuse owner login, expose the workspace, or allow cross-customer records.

## Owner workspace

- Invite-only owner sign-in, sign-out and email password recovery.
- Product/pricing management; products begin unpublished.
- Stock adjustment with an inventory movement ledger.
- Order capture and explicit pending/paid/fulfilled/cancelled transitions. Sale capture checks current stock and records stock movements in one database transaction; cancellation restores inventory.
- Customer records with marketing consent unselected by default and consent/withdrawal timestamps.
- Dashboard totals are computed from recorded orders only; not forecasts.

The owner can upload approved product photos to a narrowly scoped public catalog bucket. Several business modules, admin settings, legacy-history import, production monitoring and customer-space features remain future work. UI screens are not proof that a live backend has been configured or tested.

## Assets

All brand imagery is generated from SVG sources by us — no stock photography, no invented product shots:

```sh
npm run assets     # regenerates og.png, PWA icons and favicon with Chromium
```

Product photos are **not** included. The shop renders a designed photo slot until an approved 4:5 photo is supplied. Format, naming, framing and colour rules are in `docs/ASSETS.md`.

## Local development

Requirements: Node.js 22+, npm. Cloudflare's current Vite tooling needs Node 22.

```sh
npm ci
cp .env.example .env.local
# Fill only with the Supabase project URL and browser-safe publishable/anon key.
npm run dev
```

Never put a Supabase service-role/secret key in a `VITE_` variable or client bundle. Do not add owner credentials, production data, or customer exports to Git.

## Quality checks

```sh
npm run lint
npm run typecheck
npm run test
npm run test:db
npm run test:e2e
npm run build
npm audit --audit-level=low
```

`npm run check` runs the combined gate. The embedded PostgreSQL/PGlite contract tests execute the migration with a mocked `auth.uid()` and exercise owner isolation, anonymous column grants, stock adjustments, sale/cancellation transactions and forged-write denial. Playwright covers phone and desktop storefronts, honest empty/setup states, owner-access separation and automated accessibility checks. Embedded tests are **not** a substitute for validation against the actual Supabase Auth/API configuration.

## Backend setup — not yet completed

1. Create a dedicated Supabase project. Configure auth email delivery, redirect URLs and allowed origins for the exact test/production domains.
2. Disable public sign-ups in Supabase Auth. Invite only the verified business owner from the dashboard.
3. Review and apply `supabase/migrations/202610280001_core.sql` only to the intended fresh project. It executes in embedded PostgreSQL/PGlite with mocked Supabase roles and `auth.uid()`; it has not been run against the actual Supabase project or its Auth/JWT/API settings.
4. Follow `supabase/BOOTSTRAP_OWNER.md` to provision the actual invited owner using the Supabase SQL editor. The app deliberately does not let the first logged-in user claim the store.
5. Run end-to-end integration/security checks with an owner account and a separate anonymous/non-owner account. Verify grants, RLS, catalog privacy, stock concurrency, order/cancel rollback, password recovery and audit records.
6. Enter confirmed product data and photographs, validate all claims/labels and contact details, review customer-consent wording and privacy retention, then reconcile the legacy JSON before live use.

## Cloudflare / GitHub

GitHub CI (`.github/workflows/quality.yml`) checks every push to `main` and every pull request; it does not deploy.

### Cloudflare Pages

The site is hosted on Cloudflare Pages from `joelwanyama/purity-skin`, with **`deploy` as the production branch**: a push to `deploy` builds and publishes to the production URL, and other branches produce preview deployments.

Two deployment paths are documented in `docs/DEPLOY.md` — fix the dashboard build settings, or deploy from `.github/workflows/deploy.yml`. Do not run both at once.

The project's build settings must be:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(empty = repository root)* |
| Node version | `22` via `NODE_VERSION`, also pinned in `.nvmrc` |

If the build command is empty or the output directory is left at the repository root, Cloudflare publishes the **unbuilt source**: the page loads `/src/main.tsx` as raw TypeScript and the app stays blank, while Cloudflare still reports the deploy as successful. That was the state of the first deploy; two guards now catch it:

```sh
npm run check:build                       # validates dist/ before publishing (inside npm run check and CI)
npm run smoke -- https://purityskin.pages.dev   # validates the live site
```

`public/_redirects` provides the SPA fallback (`/* /index.html 200`) that Cloudflare Pages needs for client-side routes such as `/owner`, and `public/_headers` sets cache rules (fingerprinted assets immutable, `sw.js` uncached). Both files must be in the build output, which is why they live in `public/`.

Environment variables: only browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong in the Pages build settings, and only once a Supabase project exists. A service-role key must never be added there or in any `VITE_` variable. No credentials belong in this repository. See `SECURITY.md` for the current threat boundaries and release blockers.
