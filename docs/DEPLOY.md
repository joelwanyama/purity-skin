# Deployment

The site is a static build. Whatever builds it must run `npm run build` and publish the `dist` folder — Cloudflare Pages is currently publishing the **repository root** instead, which is why `purityskin.pages.dev` shows a blank page.

## Current state (verified 2026-10-28, 19:44 UTC)

**Working.** `https://purityskin.pages.dev` now serves the built application:

```
✓ home serves the built bundle        (/assets/index-*.js, no /src/*.tsx)
✓ /sw.js is the service worker
✓ /shop resolves through the SPA fallback
✓ /og.png is a real PNG
✓ /robots.txt is served as text
✓ /owner returns the app shell
```

Reproduce any time with `npm run smoke -- https://purityskin.pages.dev`.

### How it was fixed without dashboard access

Cloudflare Pages was publishing the repository root because the project has no build command and no output directory. Since that setting lives in the dashboard, the fix was moved into the repository instead:

1. **`wrangler.jsonc` now declares `pages_build_output_dir: "./dist"`.** Pages treats this file as its source of truth, so it publishes `dist/` rather than the repo root. Workers-only keys (`assets`, `upload_source_maps`) had to be removed first — with them present the Pages build fails outright (that was the failed build on commit `c017657`).
2. **The built site is committed.** Pages runs no build, so `dist/` must exist in the branch. `dist/` is no longer gitignored; refresh it with `npm run publish:build`.
3. **Workers-only artefacts are stripped after each build** (`scripts/postbuild.mjs` removes `dist/wrangler.json` and `dist/.assetsignore`). `wrangler.json` embeds absolute build-machine paths, which made output non-deterministic and tripped the CI staleness check.
4. **CI fails if the committed build is stale** — `quality.yml` rebuilds and rejects a dirty `dist/`, so a source change can never ship without its build.

Two notes:

- The production alias took roughly two minutes to switch over after the build succeeded; an early smoke run still showed the old content.
- If you later set a build command in the dashboard, delete `dist/` from the repository and re-add it to `.gitignore` — otherwise the committed output and the fresh build will fight.

## Fix A — dashboard build settings (optional now, but the tidiest setup)

Workers & Pages → **purityskin** → Settings → **Build configuration** → Edit:

| Field | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty = repository root)* |
| Framework preset | Vite (optional, only sets defaults) |
| Production branch | `deploy` |

Environment variable (Settings → Environment variables → Production **and** Preview):

| Name | Value |
| --- | --- |
| `NODE_VERSION` | `22` |

Then Deployments → latest → **Retry deployment**. A push to `deploy` afterwards rebuilds automatically.

Verify:

```sh
npm run smoke -- https://purityskin.pages.dev
```

Expect every line to print `✓`. `npm run smoke` also checks that `/shop` resolves through the SPA fallback and that `/og.png` is a real PNG.

## Fix B — deploy from GitHub Actions (no dashboard build settings)

Use this if you want the build pipeline defined in code and reproducible.

1. Create a Cloudflare API token: My Profile → API Tokens → Create Token → Custom token → permission **Cloudflare Pages: Edit**, account = your account. Nothing else.
2. Repository → Settings → Secrets and variables → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN` = the token (paste only into GitHub, never into chat)
   - `CLOUDFLARE_ACCOUNT_ID` = `d0ee64cee0bd3c218942332e7d563d8e` (optional; already the default)
3. **Disconnect Git in the Pages project** (Settings → Build → disconnect, or delete the Git integration). Otherwise both Cloudflare's own build and this workflow publish to `deploy`, and a misconfigured Cloudflare build can overwrite a good deployment.
4. Actions → **Deploy to Cloudflare Pages** → Run workflow.
5. To deploy on every push, uncomment the `push:` trigger in `.github/workflows/deploy.yml`.

The workflow runs the quality gate, builds, runs `npm run check:build`, publishes with `wrangler pages deploy dist`, then smoke-tests both the deployment URL and the production domain. A red X means the site is genuinely not serving the built app.

## Two guards in the repo

| Command | What it proves |
| --- | --- |
| `npm run check:build` | The `dist` folder is self-consistent: hashed JS/CSS present, no `/src/*.tsx` reference, `_redirects` has the SPA rule, PWA + social files exist, service worker excludes API/auth. Runs inside `npm run check` and in CI. |
| `npm run smoke -- <url>` | A deployed URL serves that build: bundle is JavaScript, `/shop` falls back to the shell, `/og.png` is a PNG, `/robots.txt` is text, `/sw.js` is the worker. |

Both were written against this exact failure and confirmed to report it.

## Routing, caching and headers on Pages

- `public/_redirects` → `/* /index.html 200` gives the SPA fallback Cloudflare does not provide by default. Without it, `/shop/anything` 404s.
- `public/_headers` sets `Cache-Control: no-cache` on `/sw.js` (so PWA updates roll out), `immutable` on `/assets/*` (fingerprinted filenames), and `X-Robots-Tag: noindex` on `/owner*` and `/studio/*`.
- Both files must be in the published directory — they are copied into `dist` by Vite.

## Custom domain

Pages → project → Custom domains → add the domain, then point DNS at the Pages project. After the domain resolves, update:

- `public/sitemap.xml` and `public/robots.txt` (currently `purityskin.pages.dev`)
- `public/og.png` footer text if you want the new domain on link previews (`npm run assets`)

## Rollback

Cloudflare keeps every deployment: Deployments → pick the last good one → **Rollback**. From the command line, redeploy a known commit with the Actions workflow (`Run workflow` on that branch).

## Pre-launch checklist

- [ ] `npm run smoke -- https://<domain>` prints all `✓`
- [ ] `/shop` shows the real catalogue (not the "being prepared" state)
- [ ] Product photos load and are 4:5
- [ ] The WhatsApp button opens a chat with the right number
- [ ] `/owner` shows the sign-in, not the workspace
- [ ] `/studio/catalogue` is reachable but not indexed (`X-Robots-Tag: noindex`)
- [ ] Link preview on WhatsApp shows the brand card
