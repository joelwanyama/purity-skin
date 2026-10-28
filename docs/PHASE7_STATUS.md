# Phase 7 · production rebuild status

**Updated:** 2026-10-28 (Kampala)  
**State:** brand assets, catalogue layer and the multi-page storefront are built and pushed; quality gate passing locally and in CI; Cloudflare Pages still needs its build settings corrected; **no live database and no real catalogue content yet**.

## Phase 8 · assets, catalogue and storefront (2026-10-28)

- **Brand assets generated from SVG sources** with Chromium (`npm run assets`): 1200×630 share card (`og.png`), 512/192 PWA icons, 180 iOS touch icon, 32 favicon, vector icon. No stock or invented product imagery.
- **Catalogue domain layer** (`src/catalog/`): typed products, publish gate, medical-claim screening, import normalisation that demotes unsafe published rows, browser-draft persistence, filtering helpers.
- **Catalogue studio** at `/studio/catalogue` (noindex, no auth): full editor with live card preview, per-product publish checks, JSON export/import, autosave to this browser. Explicitly documented as a local drafting tool, not the owner workspace.
- **Multi-page public site**: Home, Shop (filters + search), product detail, How to order, About, Policies, 404 — all honest when the catalogue is empty, all with WhatsApp handoff.
- **Real 404 routing** (previously unknown paths redirected to `/`), plus per-page title/description/canonical/OG metadata.
- **SEO/PWA plumbing**: `robots.txt`, `sitemap.xml`, `_headers` noindex for `/owner*` and `/studio/*`, service-worker cache bump to `v2`.
- **Test coverage** extended to 30 unit tests (publish gate, import demotion, filtering, page honesty) and 26 Playwright checks across two viewports, including Axe on five routes.

### Known gaps in this phase

- Catalogue content is empty; the shop shows its honest "not published yet" state.
- The studio is unauthenticated local editing. Real owner-only editing arrives with Supabase; until then publishing needs a Git commit.
- Product photos do not exist; every card renders a photo slot.

## Implemented locally

- Responsive, brand-led public shop with account-free WhatsApp handoff, honest empty/unconfigured states, and no invented product/price/stock data.
- Private owner route with sign-in, password recovery, no self-signup, and explicit owner provisioning check. A customer account cannot claim the store or see owner screens.
- Owner screens: dashboard, products/prices, photo upload, stock ledger, order desk and customer records.
- Supabase migration draft: RLS, narrow public catalog/contact views, invite/provisioned owner checks, public image bucket with owner-scoped write paths, direct stock/order writes revoked, sale/stock/status RPCs, transaction/stock rollback rules.
- `supabase/BOOTSTRAP_OWNER.md` describes the one-time owner invite and SQL bootstrap. Public Supabase sign-ups must be disabled.
- PWA shell manifest/icons and static-only service-worker caching. No customer/owner records are cached.
- CI quality workflow; no deployment workflow.

## Verified commands (last full run)

`npm run check` passed:

- Oxlint: 0 warnings, 0 errors.
- TypeScript: passed.
- Vitest: 30 unit tests passed.
- Embedded PostgreSQL/PGlite migration + authorization/transaction tests passed: owner isolation, anonymous column grants, public image access vs owner-only upload, direct-write denial, stock RPC, duplicate-line oversell rollback, state transitions, cancellation stock reversal, and non-owner denial.
- Playwright: 26/26 passed across phone and desktop viewports; no serious or critical Axe violations on `/`, `/shop`, `/how-to-order`, `/policies` or `/studio/catalogue`.
- Cloudflare/Vite production build passed.
- `npm audit --audit-level=low`: 0 vulnerabilities.
- `node --check public/sw.js`: passed.

PGlite uses a mock `auth.uid()` and local roles. It is **not** proof of real Supabase Auth/JWT/API/storage behavior.

## Hard blockers before real use

1. No Supabase project/configuration is connected. The migration has not been applied to a real database. Review it with a PostgreSQL/Supabase engineer, then test against a throwaway Supabase project and owner/non-owner/anonymous identities.
2. No real owner identity has been verified or provisioned. Use the dashboard invite + manual bootstrap; do not allow public signup or first-user claiming. Confirm the legacy WhatsApp number is still correct.
3. No verified product/pricing/claims/photos have been loaded. The old offline app and JSON backup remain migration sources and must be preserved until reconciliation and explicit owner acceptance.
4. Customer-specific invite/verification space is not implemented. Verification channel/lifecycle remains undecided. Do not substitute a shared PIN or grant owner access.
5. Cloudflare Pages is connected to `joelwanyama/purity-skin` with `deploy` as the production branch, and pushes do trigger builds (a `Cloudflare Pages` check run appears on each commit). However the project currently builds with no build step and publishes the repository root: `purityskin.pages.dev` serves the source `index.html`, whose `/src/main.tsx` is delivered as raw TypeScript, so the app renders blank. Build command must be `npm run build` and output directory `dist` (see README). No Supabase environment variables are set, and no custom domain is configured.

## Repository state (2026-10-28)

- Commits on `main` and `deploy` pushed to `joelwanyama/purity-skin`; Cloudflare Pages tracks `deploy`.
- CI run for the initial commit: Quality gate passed (lint, typecheck, unit, PGlite, audit, build, Playwright/Axe).
- Commit is authored as `joelwanyama <133025945+joelwanyama@users.noreply.github.com>`; GitHub shows it as unverified because it is not GPG/SSH signed.

## Immediate next work

1. Continue SQL review and test the full Supabase migration/Storage policies in a disposable project.
2. Correct the Cloudflare Pages build settings (`npm run build`, output `dist`, Node 22) and re-deploy `deploy`, then verify the built asset loads, `/owner` deep links resolve through `_redirects`, and `/sw.js` is served uncached. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` only once a Supabase project exists; never place service-role keys in build variables.
3. Verify owner contact details, real catalog assets, product labeling/claims, privacy/consent text and legacy data reconciliation with the owner.
4. Run real-backend end-to-end tests, mobile/manual accessibility and low-end Android/network acceptance; only then evaluate market readiness.
