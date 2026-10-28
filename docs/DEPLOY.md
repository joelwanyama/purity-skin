# Deployment

The site is a static build. Whatever builds it must run `npm run build` and publish the `dist` folder — Cloudflare Pages is currently publishing the **repository root** instead, which is why `purityskin.pages.dev` shows a blank page.

## What is wrong right now

Verified against the live site on 2026-10-28:

| Request | Expected | Actual |
| --- | --- | --- |
| `/` | built `index.html` loading `/assets/index-*.js` | source `index.html` loading `/src/main.tsx` |
| `/src/main.tsx` | 404 | 200, raw TypeScript |
| `/sw.js` | the service worker | the same HTML page |
| `/og.png` | a PNG | the same HTML page |
| `/robots.txt` | the robots file | the same HTML page |

Cloudflare reports the deploy as **successful** because with no build command there is nothing to fail. Reproduce the diagnosis at any time:

```sh
npm run smoke -- https://purityskin.pages.dev   # exits non-zero while broken
```

## Fix A — dashboard only (fastest, ~30 seconds)

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
