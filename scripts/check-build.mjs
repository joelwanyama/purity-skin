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

// 7. The build should describe the same site that is deployed.
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
