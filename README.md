# PURITY SKIN · Formulated to Fix

A customer-facing product catalogue with WhatsApp handoff, plus a private owner workspace for products, stock, orders and customer records. Built as a React/Vite single-page application for Cloudflare Workers + Static Assets, with Supabase Auth/Postgres as the planned backend.

## Project status — production rebuild in progress

This repository is a rebuild, **not yet production-ready or deployed**. The app has first-pass storefront/owner screens, a reviewed-but-unapplied database migration, automated checks and a manual owner-bootstrap path. No live Supabase project has been configured, no production data has been imported, and no Cloudflare deployment has been made. The shop therefore shows a truthful setup message rather than invented products, prices or stock.

The earlier offline app and its JSON backup are migration sources and must remain untouched until a reviewed migration, reconciliation and explicit owner acceptance are complete.

## Customer journey

- Public product browsing and WhatsApp enquiry do not require an account.
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

`wrangler.jsonc` and the Cloudflare Vite integration are prepared for Worker Static Assets/SPA routing. GitHub CI checks source but there is intentionally no deploy workflow yet. Deployment requires repo-scoped GitHub authorization, a configured Cloudflare Worker Build, domain/origin setup, and reviewed Supabase environment variables. No credentials belong in this repository. See `SECURITY.md` for the current threat boundaries and release blockers.
