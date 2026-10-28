# Security & privacy boundary

## Current truth

The app currently uses only the Supabase URL plus browser-safe publishable/anon key, if configured. The production project is not connected. The migration is new and unapplied; its PL/pgSQL functions and RLS policies have not been exercised in PostgreSQL/Supabase. Automated UI tests without a backend do not prove database isolation.

## Security design

- Public storefront queries only the `public_catalog` and `public_business_profile` invoker-security views. The anonymous product grant omits `user_id`, costs, stock, customers, orders and consent data. Public products must be explicitly published with a confirmed price.
- Every private row has RLS and owner-scoped policies. Owner identities must be invited and provisioned out-of-band. The app never allows first-user store claiming and has no customer sign-up.
- Authenticated browser writes to orders, order items, movement ledger and status events are intentionally revoked. Narrow authenticated RPCs perform sale/stock/status transitions; elevated functions validate `auth.uid()` and each target row. Product stock has no direct client update grant and is changed only by the movement trigger.
- The sale RPC validates and locks product rows in a stable order, checks combined duplicate-line quantities and stock, then records order items, order and movements in one database transaction. Cancellation is a transaction that restores stock and appends a status event. The PGlite contract suite exercises these behaviors against embedded PostgreSQL; they still require a real Supabase integration test before any production claim.
- Marketing consent is separate, opt-in and unchecked by default. Customer-specific accounts/invites are out of scope until a verified channel, identity lifecycle and row-level authorization model are reviewed.
- The public `catalog` bucket accepts only JPEG/PNG/WebP up to 4 MB, and upload/update/delete policies require the provisioned owner. Object names are random and do not embed the owner's UUID; published catalog photo URLs are intentionally public. The service worker caches same-origin static assets only. It excludes writes, `/api`, Supabase REST/Auth paths and cross-origin requests. Customer/owner data is not intentionally cached by the worker.

## Required before production

1. Disable public Supabase sign-ups; create/invite one verified owner. Run the documented manual bootstrap only after checking the target project and email.
2. Review the SQL with a PostgreSQL engineer and execute it on a throwaway Supabase project. Verify grants and policies as `anon`, the owner, and a second non-owner; attempt cross-user selects/writes, direct order/movement inserts, direct stock updates, public cost/stock reads, forged status transitions and anonymous RPC calls.
3. Test transaction rollback, duplicate-product oversell, concurrent orders, restock, cancellation reversal, no negative stock, password reset, rate limiting and deleted-user behavior.
4. Add automated database integration tests (for example Supabase local/CI), inspect Supabase Auth and API settings, configure email/redirect/origin controls, MFA where supported, backups/retention and alerting.
5. Verify WhatsApp contact, owner identity and all product/price/photo/claims/privacy data with the owner. Do not publish sample data.
6. Keep data exports, database secrets and service-role keys outside this repo and chat. Use repo-scoped GitHub authorization only; use Cloudflare project secrets/vars for the correct environment.
7. Run CI, Playwright on the production candidate, and a manual acceptance session on low-end Android/mobile data before release. Roll back safely; preserve the legacy offline app and backup until reconciliation is signed off.
