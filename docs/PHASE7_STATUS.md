# Phase 7 · production rebuild status

**Updated:** 2026-10-28 (Kampala)  
**State:** local implementation and quality gate passing; **not production-ready, committed, pushed or deployed**.

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
- Vitest: 4 unit tests passed.
- Embedded PostgreSQL/PGlite migration + authorization/transaction tests passed: owner isolation, anonymous column grants, public image access vs owner-only upload, direct-write denial, stock RPC, duplicate-line oversell rollback, state transitions, cancellation stock reversal, and non-owner denial.
- Playwright: 8/8 passed (mobile + desktop); no serious/critical Axe violations on the public page.
- Cloudflare/Vite production build passed.
- `npm audit --audit-level=low`: 0 vulnerabilities.
- `node --check public/sw.js`: passed.

PGlite uses a mock `auth.uid()` and local roles. It is **not** proof of real Supabase Auth/JWT/API/storage behavior.

## Hard blockers before real use

1. No Supabase project/configuration is connected. The migration has not been applied to a real database. Review it with a PostgreSQL/Supabase engineer, then test against a throwaway Supabase project and owner/non-owner/anonymous identities.
2. No real owner identity has been verified or provisioned. Use the dashboard invite + manual bootstrap; do not allow public signup or first-user claiming. Confirm the legacy WhatsApp number is still correct.
3. No verified product/pricing/claims/photos have been loaded. The old offline app and JSON backup remain migration sources and must be preserved until reconciliation and explicit owner acceptance.
4. Customer-specific invite/verification space is not implemented. Verification channel/lifecycle remains undecided. Do not substitute a shared PIN or grant owner access.
5. The GitHub remote is `joelwanyama/purity-skin`, but the clone has no commits yet and this session lacks repo-scoped write authorization. No commit/push was made. Cloudflare credentials/project and domain settings are also absent; no deployment was made.

## Immediate next work

1. Continue SQL review and test the full Supabase migration/Storage policies in a disposable project.
2. Obtain secure repo-scoped GitHub write authorization and confirm the Cloudflare Worker Build destination before committing/pushing/deploying. Never request pasted secrets or broaden repository scope.
3. Verify owner contact details, real catalog assets, product labeling/claims, privacy/consent text and legacy data reconciliation with the owner.
4. Run real-backend end-to-end tests, mobile/manual accessibility and low-end Android/network acceptance; only then evaluate market readiness.
