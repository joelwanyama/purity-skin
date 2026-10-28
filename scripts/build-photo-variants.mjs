/**
 * Builds a card-sized copy of every product photo, and a square brand card for
 * WhatsApp Status / Instagram Stories.
 *
 * Photos are the only heavy asset on the shop. The owner's export caps images
 * at 1600 px tall; a 250 px card does not need that, and on mobile data in
 * Kampala the difference is the difference between a page and a spinner.
 *
 * Usage:
 *   node scripts/build-photo-variants.mjs        # writes <slug>-card.jpg (480 px)
 *   node scripts/export-status-cards.mjs         # writes 1080x1080 status cards
 *
 * Both are no-ops (with a clear message) while no product photos exist.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
/** Written by this script and imported by the app, so <img> never guesses at a
 *  variant that was not built. Committed, because the deployed site needs it. */
const MANIFEST_PATH = path.join(root, 'src/catalog/photo-variants.json')
const photosDir = path.join(root, 'public/images/products')
const cataloguePath = path.join(root, 'src/catalog/catalog.data.json')
const CARD_WIDTH = 480
const CARD_QUALITY = 82
// WhatsApp, X, Facebook and LinkedIn all crop a link preview to ~1.91:1. A
// portrait product photo gets letterboxed or stripped, so we ship a landscape
// crop of the same photo and point the Open Graph tags at it.
const SHARE = { w: 1200, h: 630, quality: 82 }

export function findImageMagick() {
  for (const candidate of ['magick', 'convert']) {
    try {
      execFileSync(candidate, ['-version'], { stdio: 'ignore' })
      return candidate
    } catch {
      // try the next one
    }
  }
  return null
}

export function readCatalogue() {
  try {
    return JSON.parse(readFileSync(cataloguePath, 'utf8'))
  } catch {
    return { settings: {}, products: [] }
  }
}

/** Every photo referenced by a published product, as paths relative to public/. */
export function publishedPhotos(catalogue = readCatalogue()) {
  return (catalogue.products ?? [])
    .filter((product) => product && product.status === 'published' && typeof product.image_path === 'string')
    .filter((product) => product.image_path.startsWith('/images/products/'))
    .map((product) => product.image_path.replace(/^\/+/, ''))
    .filter((relative) => existsSync(path.join(root, 'public', relative)))
}

function dimensions(magick, file) {
  // `identify -format` keeps this cheap: no image is read into memory twice.
  const out = execFileSync(magick, ['identify', '-format', '%w %h', file], { encoding: 'utf8' }).trim()
  const [width, height] = out.split(/\s+/).map(Number)
  return { width, height }
}

export function buildCardVariants({ magick = findImageMagick(), log = console.log } = {}) {
  if (!magick) {
    log('photo variants: ImageMagick is not installed, so the committed variants are kept as they are.')
    return { built: 0, missing: [] }
  }
  const photos = publishedPhotos()
  if (!photos.length) {
    log('photo variants: no published product photo yet, so nothing to resize.')
    writeFileSync(MANIFEST_PATH, `${JSON.stringify({}, null, 2)}\n`, 'utf8')
    return { built: 0, missing: [] }
  }
  /** @type {Record<string, { card: string, share: string, width: number, height: number, card_width: number }>} */
  const manifest = {}
  let built = 0
  const missing = []
  for (const relative of photos) {
    const source = path.join(root, 'public', relative)
    if (!/\.(jpe?g|png)$/i.test(source)) {
      missing.push(relative)
      continue
    }
    execFileSync(magick, [
      source,
      '-auto-orient',
      '-resize', `${CARD_WIDTH}x${CARD_WIDTH}^`,
      '-gravity', 'center',
      '-extent', `${CARD_WIDTH}x${Math.round(CARD_WIDTH * 1.25)}`,
      '-strip',
      '-quality', String(CARD_QUALITY),
      source.replace(/\.(jpe?g|png)$/i, '-card.jpg'),
    ])
    execFileSync(magick, [
      source,
      '-auto-orient',
      '-resize', `${SHARE.w}x${SHARE.h}^`,
      '-gravity', 'center',
      '-extent', `${SHARE.w}x${SHARE.h}`,
      '-strip',
      '-quality', String(SHARE.quality),
      source.replace(/\.(jpe?g|png)$/i, '-share.jpg'),
    ])
    const { width, height } = dimensions(magick, source)
    const publicPath = `/${relative}`
    manifest[publicPath] = {
      card: publicPath.replace(/\.(jpe?g|png)$/i, '-card.jpg'),
      share: publicPath.replace(/\.(jpe?g|png)$/i, '-share.jpg'),
      width,
      height,
      card_width: CARD_WIDTH,
    }
    built += 1
  }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  log(
    `photo variants: wrote ${built} card (${CARD_WIDTH}px) and share (${SHARE.w}x${SHARE.h}) image${built === 1 ? '' : 's'}.`,
  )
  return { built, missing }
}

// --- run directly -----------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  buildCardVariants()
}

export { photosDir, readdirSync, statSync }
