/**
 * Checks that a deployed URL is actually serving the built app.
 *
 * Usage: node scripts/smoke-deployed.mjs https://purityskin.pages.dev
 *
 * Exits non-zero when the deployment serves source files instead of build output,
 * which is what happens if Cloudflare Pages publishes the repository root without
 * running `npm run build`.
 */
const base = (process.argv[2] ?? 'https://purityskin.pages.dev').replace(/\/+$/, '')

const problems = []
const results = []

async function get(pathname) {
  const response = await fetch(`${base}${pathname}`, { redirect: 'follow' })
  const body = await response.text()
  return { status: response.status, type: response.headers.get('content-type') ?? '', body }
}

function check(label, ok, detail) {
  results.push({ label, ok, detail })
  if (!ok) problems.push(`${label}: ${detail}`)
}

try {
  const home = await get('/')
  check('home responds 200', home.status === 200, `status ${home.status}`)
  check('home is HTML', home.type.includes('text/html'), `content-type ${home.type}`)
  check(
    'home serves the built bundle',
    /<script[^>]+src="\/assets\/[^"]+\.js"/.test(home.body),
    'no hashed /assets/*.js script found — the deployment looks unbuilt',
  )
  check(
    'home does not expose source files',
    !/\/src\/[^"']+\.tsx?/.test(home.body),
    'index.html still points at /src/*.tsx, so TypeScript is being served as-is',
  )

  const assetPath = home.body.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1]
  if (assetPath) {
    const asset = await get(assetPath)
    check(`entry bundle ${assetPath} returns 200`, asset.status === 200, `status ${asset.status}`)
    check(
      `entry bundle ${assetPath} is JavaScript`,
      /javascript/.test(asset.type),
      `content-type ${asset.type || 'unknown'}`,
    )
  }

  const sw = await get('/sw.js')
  check('/sw.js is served as the worker', sw.body.trimStart().startsWith('const CACHE'), 'response does not look like the service worker file')

  const deep = await get('/shop')
  check('/shop uses the SPA fallback', deep.status === 200 && /<div id="root">/.test(deep.body), `status ${deep.status}`)

  const og = await fetch(`${base}/og.png`)
  const ogBytes = new Uint8Array(await og.arrayBuffer())
  const isPng = ogBytes[0] === 0x89 && ogBytes[1] === 0x50 && ogBytes[2] === 0x4e && ogBytes[3] === 0x47
  check('/og.png is a real PNG', og.status === 200 && isPng, `status ${og.status}, PNG signature ${isPng ? 'ok' : 'missing'}`)

  // WhatsApp and Meta only accept absolute image URLs in a link preview.
  const ogImage = home.body.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? ''
  check(
    'og:image is an absolute https URL',
    /^https:\/\/[^\s]+$/.test(ogImage),
    `found "${ogImage}" — a relative path is ignored by WhatsApp`,
  )

  const brandMark = await get('/brand/purity-mark.png')
  check('/brand/purity-mark.png is served', brandMark.status === 200 && /image\/png/.test(brandMark.type), `status ${brandMark.status}, ${brandMark.type || 'unknown type'}`)

  const builder = await get('/downloads/purity-skin-catalogue-builder.html')
  check(
    'the offline catalogue builder is downloadable',
    builder.status === 200 && /Catalogue Builder/.test(builder.body),
    `status ${builder.status}`,
  )

  const robots = await get('/robots.txt')
  check('/robots.txt is served as text', robots.body.includes('Disallow: /owner'), 'robots.txt missing the owner-workspace disallow rule')

  const owner = await get('/owner')
  check('/owner returns the app shell', owner.status === 200 && /<div id="root">/.test(owner.body), `status ${owner.status}`)
} catch (error) {
  problems.push(`request failed: ${error instanceof Error ? error.message : String(error)}`)
}

for (const result of results) {
  console.log(`${result.ok ? '✓' : '✗'} ${result.label}${result.ok ? '' : ` — ${result.detail}`}`)
}

if (problems.length) {
  console.error(`\nDeployment smoke test FAILED for ${base}`)
  console.error('If the page loads source files, the Pages project is publishing the repository root without a build.')
  console.error('Fix: Pages project → Settings → Build configuration → build command "npm run build", output directory "dist".')
  console.error('Or deploy from GitHub Actions: .github/workflows/deploy.yml (see docs/DEPLOY.md).')
  process.exit(1)
}

console.log(`\nDeployment smoke test passed for ${base}`)
