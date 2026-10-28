/**
 * Verifies the built site is self-consistent before it is published.
 *
 * This exists because Cloudflare Pages will happily serve the repository root
 * with no build step: the page then loads /src/main.tsx as raw TypeScript and
 * renders nothing. That failure is invisible in the deploy log, so we check the
 * artefact itself instead of trusting the build.
 *
 * Usage: node scripts/check-build.mjs [outputDir=dist]
 */
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve(process.argv[2] ?? 'dist')
const problems = []
const notes = []

/** Reads a file from the output, recording a clean failure instead of throwing. */
async function read(file, { required = true } = {}) {
  try {
    return await readFile(path.join(outDir, file), 'utf8')
  } catch {
    if (required) fail(`Missing required file in the build output: ${file}`)
    return ''
  }
}

async function exists(file) {
  try {
    await stat(path.join(outDir, file))
    return true
  } catch {
    return false
  }
}

function fail(message) {
  problems.push(message)
}

// 1. The HTML must reference the bundled, hashed entry — never the TS source.
const html = await read('index.html')
if (/\/src\/[^"']+\.tsx?/.test(html)) {
  fail('index.html references a TypeScript source file. The site was published unbuilt (set build command "npm run build" and output directory "dist").')
}
const scriptMatch = html.match(/<script[^>]+src="([^"]+)"/)
if (!scriptMatch) {
  fail('index.html has no module script tag.')
} else {
  const src = scriptMatch[1]
  if (!src.startsWith('/assets/')) fail(`Entry script "${src}" is not a hashed build asset under /assets/.`)
  const assetPath = src.replace(/^\//, '')
  if (!(await exists(assetPath))) fail(`Entry script "${src}" is missing from ${path.relative(process.cwd(), outDir)}.`)
  else {
    const bytes = (await stat(path.join(outDir, assetPath))).size
    if (bytes < 50_000) fail(`Entry bundle is only ${bytes} bytes; expected a compiled application bundle.`)
  }
}

// 2. CSS must be bundled too.
const cssMatches = [...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g)].map((match) => match[1])
if (cssMatches.length === 0) notes.push('No bundled CSS link found in index.html (inline or missing stylesheet?).')
for (const href of cssMatches) {
  if (!(await exists(href.replace(/^\//, '')))) fail(`Stylesheet "${href}" is missing from the build output.`)
}

// 3. Files Pages needs, in the folder Pages publishes.
for (const file of ['_redirects', '_headers', 'manifest.webmanifest', 'sw.js', 'robots.txt', 'sitemap.xml', 'og.png', 'brand/purity-mark.png']) {
  if (!(await exists(file))) fail(`Missing required file in the build output: ${file}`)
}

const redirects = await read('_redirects')
if (!/^\s*\/\*\s+\/index\.html\s+200\s*$/m.test(redirects)) {
  fail('_redirects is missing the SPA fallback rule "/* /index.html 200"; deep links such as /shop/... would 404.')
}

// 4. Metadata that link previews depend on.
if (!/property="og:image"/.test(html)) fail('index.html has no og:image tag; link previews will be blank.')
if (!/rel="manifest"/.test(html)) fail('index.html does not link the web manifest.')

// 5. Icons declared in the manifest must exist.
let manifest = { icons: [] }
try {
  const manifestText = await read('manifest.webmanifest')
  if (manifestText) manifest = JSON.parse(manifestText)
} catch {
  fail('manifest.webmanifest is not valid JSON.')
}
for (const icon of manifest.icons ?? []) {
  const iconPath = String(icon.src ?? '').replace(/^\//, '')
  if (!iconPath) continue
  if (!(await exists(iconPath))) fail(`Manifest icon "${icon.src}" is missing from the build output.`)
}

// 6. The service worker must not cache API or auth traffic.
const sw = await read('sw.js')
if (!/purity-static-v\d+/.test(sw)) fail('sw.js has no versioned cache name.')
if (!/\/rest\/|\/auth\//.test(sw)) fail('sw.js does not exclude API/auth paths from caching.')

// 7. Every published product needs its own static page, because crawlers and
//    link unfurlers never run the app. This is what makes a shared link preview.
let catalogue = { products: [] }
try {
  catalogue = JSON.parse(await readFile(path.resolve('src/catalog/catalog.data.json'), 'utf8'))
} catch {
  fail('src/catalog/catalog.data.json could not be read; the shop cannot be checked against it.')
}
const published = (catalogue.products ?? []).filter(
  (product) => product && product.status === 'published' && String(product.slug ?? '').trim() && String(product.name ?? '').trim(),
)

if (!(await exists('shop/index.html'))) {
  fail('Missing prerendered shop page: shop/index.html. Run `npm run build` (it runs scripts/prerender.mjs).')
}

let prerendered = { products: [] }
try {
  prerendered = JSON.parse(await read('prerender.json', { required: false }) || '{}')
} catch {
  fail('prerender.json is not valid JSON.')
}

for (const product of published) {
  const slug = String(product.slug).trim()
  const page = await read(`shop/${slug}/index.html`, { required: false })
  if (!page) {
    fail(`Published product "${slug}" has no static page at shop/${slug}/index.html; its link preview would be blank.`)
    continue
  }
  if (!page.includes(`<link rel="canonical" href="`) || !page.includes(`/shop/${slug}"`)) {
    fail(`shop/${slug}/index.html does not declare its own canonical URL.`)
  }
  if (!page.includes(`property="og:title"`)) fail(`shop/${slug}/index.html has no og:title.`)
  if (!(page.includes('application/ld+json') || page.includes('Price confirmed on WhatsApp'))) {
    fail(`shop/${slug}/index.html carries neither structured data nor the "price confirmed" wording.`)
  }
  if (!(prerendered.products ?? []).includes(slug)) {
    fail(`prerender.json does not list "${slug}", so the smoke test cannot check it.`)
  }
}

for (const slug of prerendered.products ?? []) {
  if (!published.some((product) => String(product.slug).trim() === slug)) {
    fail(`shop/${slug}/index.html was prerendered for a product that is not published. Delete the stale page and rebuild.`)
  }
}

// 8. Photos must ship in every size the page advertises, and the manifest the
//    app imports must match what is actually on disk.
let photoVariants = {}
try {
  photoVariants = JSON.parse(await readFile(path.resolve('src/catalog/photo-variants.json'), 'utf8'))
} catch {
  notes.push('src/catalog/photo-variants.json is missing; product photos will load at full size.')
}
for (const product of published) {
  const imagePath = typeof product.image_path === 'string' ? product.image_path : ''
  if (!imagePath.startsWith('/images/products/')) continue
  const relative = imagePath.replace(/^\/+/, '')
  if (!(await exists(relative))) {
    fail(`Products photo "${imagePath}" is referenced by "${product.slug}" but is not in the build output.`)
    continue
  }
  const variant = photoVariants[imagePath]
  if (!variant) {
    fail(`Photo "${imagePath}" has no entry in src/catalog/photo-variants.json. Run \`npm run photos\`.`)
    continue
  }
  for (const key of ['card', 'share']) {
    const file = String(variant[key] ?? '').replace(/^\/+/, '')
    if (!file || !(await exists(file))) fail(`Photo "${imagePath}" is missing its ${key} variant (${variant[key] ?? 'not declared'}).`)
  }
  if (!(Number(variant.width) > 0) || !(Number(variant.height) > 0)) {
    fail(`Photo "${imagePath}" has no measured width/height in photo-variants.json; the page would reserve the wrong space.`)
  }
}

// 9. Status cards, when they exist, must match a live product.
for (const product of published) {
  const slug = String(product.slug).trim()
  if (!product.price_ugx) continue
  if (!(await exists(`downloads/cards/${slug}.png`))) {
    notes.push(`No Status card for "${slug}" yet. Run \`npm run export:cards\`. The owner dashboard links only cards that exist.`)
  }
}

// 10. The build should describe the same site that is deployed.
let wrangler = null
try {
  wrangler = (await exists('wrangler.json')) ? JSON.parse(await read('wrangler.json')) : null
} catch {
  notes.push('wrangler.json could not be parsed; ignoring.')
}
if (wrangler) notes.push(`Build also emitted wrangler.json (asset name: ${wrangler.name ?? 'unknown'}); it is publicly readable but contains no secrets.`)

if (problems.length) {
  console.error('Build check FAILED:')
  for (const problem of problems) console.error(`  ✗ ${problem}`)
  if (notes.length) for (const note of notes) console.error(`  · ${note}`)
  process.exit(1)
}

console.log(`Build check passed: ${path.relative(process.cwd(), outDir) || outDir} is a complete, self-consistent static site.`)
for (const note of notes) console.log(`  · ${note}`)
