/**
 * Square brand cards for WhatsApp Status and Instagram Stories, built from the
 * same catalogue the shop uses, so a price posted to Status always matches the
 * price on the site.
 *
 * Rules, on purpose:
 *  - only published products with a confirmed price are exported;
 *  - the card states what the product is, its size and its price — no claims,
 *    no "before/after", no discount urgency, nothing that would need evidence;
 *  - the shop's own artwork and colours are used, never an invented template.
 *
 * Usage: npm run export:cards       → public/downloads/cards/<slug>.png
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { findImageMagick } from './build-photo-variants.mjs'

const root = process.cwd()
const OUT_DIR = path.join(root, 'public/downloads/cards')
const MARK = path.join(root, 'public/brand/purity-mark.png')
const GREIGE = '#C2B7BD'
const INK = '#070506'
const SERIF_BOLD = 'Bitstream-Charter-Bold'
const SERIF = 'Bitstream-Charter-Regular'
const MONO = 'DejaVu-Sans-Mono'

const magick = findImageMagick()
if (!magick) {
  // Builds must not break on a machine without ImageMagick: the cards already in
  // public/downloads/cards are committed, and this step only refreshes them.
  console.warn('export:cards: ImageMagick not found, keeping the committed cards.')
  process.exit(0)
}

const catalogue = JSON.parse(readFileSync(path.join(root, 'src/catalog/catalog.data.json'), 'utf8'))
const settings = catalogue.settings ?? {}
const business = (settings.business_name || 'PURITY SKIN').trim()
const whatsapp = String(settings.whatsapp_number || '').replace(/\D/g, '')

const products = (catalogue.products ?? []).filter(
  (product) => product && product.status === 'published' && Number.isInteger(product.price_ugx) && product.price_ugx > 0,
)

if (!products.length) {
  console.log('export:cards: no published product with a confirmed price yet, so no cards were written.')
  process.exit(0)
}

mkdirSync(OUT_DIR, { recursive: true })

const formatPrice = (value) => `UGX ${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(value)}`

/** Greedy wrap so a long product name never runs off the card; two lines max. */
function wrap(text, width, maxLines = 2) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    if ((line ? `${line} ${word}` : word).length > width) {
      if (line) lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[ ,.]+$/, '')} …`
    return kept
  }
  return lines
}

// Geometry, in pixels on a 1080 x 1080 card. Photo owns the top 680 px; the
// type sits below it on a rule, so nothing ever prints over the product.
const PHOTO = { w: 1080, h: 660 }
const PAD = 96
const Y_RULE = 660
const Y_BRAND = 726
const Y_NAME = 792
const NAME_LEADING = 62

let written = 0
for (const product of products) {
  const slug = String(product.slug).trim()
  const nameLines = wrap(product.name, 24, 2)
  // Size and price hang off the actual number of name lines, so a one-line
  // name does not leave a hole and a two-line name never hits the footer.
  const Y_SIZE = Y_NAME + nameLines.length * NAME_LEADING + 34
  const Y_PRICE = Math.min(Y_SIZE + 92, 986)
  const price = formatPrice(product.price_ugx)
  const size = String(product.size_label ?? '').trim()

  // The photo, when the owner has one, fills the top window; without a photo
  // the shop's own mark stands in — honest, and identical to what the site shows.
  const photoPath =
    product.image_path && String(product.image_path).startsWith('/images/products/')
      ? path.join(root, 'public', String(product.image_path).replace(/^\/+/, ''))
      : null
  const hasPhoto = Boolean(photoPath && existsSync(photoPath))
  const photoLayer = hasPhoto
    ? ['(', photoPath, '-auto-orient', '-resize', `${PHOTO.w}x${PHOTO.h}^`, '-gravity', 'center', '-extent', `${PHOTO.w}x${PHOTO.h}`, ')', '-gravity', 'northwest', '-geometry', '+0+0', '-composite']
    : ['(', MARK, '-resize', '360x360', ')', '-gravity', 'northwest', '-geometry', `+${PAD}+${(PHOTO.h - 360) / 2}+`, '-composite']

  const args = [
    '-size', '1080x1080', `xc:${GREIGE}`, ...photoLayer,
    // hairline rule under the photo window
    '-fill', INK, '-draw', `rectangle 0,${Y_RULE} 1080,${Y_RULE + 2}`,
    '-fill', INK, '-gravity', 'northwest',
    '-font', MONO, '-pointsize', '21', '-kerning', '7', '-annotate', `+${PAD}+${Y_BRAND}`, business.toUpperCase(),
    '-font', SERIF_BOLD, '-pointsize', '56', '-kerning', '0',
    ...nameLines.flatMap((line, index) => ['-annotate', `+${PAD}+${Y_NAME + index * NAME_LEADING}`, line]),
    '-font', SERIF, '-pointsize', '30', '-annotate', `+${PAD}+${Y_SIZE}`, size || ' ',
    '-font', SERIF_BOLD, '-pointsize', '62', '-annotate', `+${PAD}+${Y_PRICE}`, price,
    ...(whatsapp
      ? ['-font', MONO, '-pointsize', '21', '-kerning', '2', '-gravity', 'southeast', '-annotate', `+${PAD}+34`, `WHATSAPP ${whatsapp}`, '-gravity', 'northwest']
      : []),
    '-strip', '-depth', '8', '-quality', '90',
    path.join(OUT_DIR, `${slug}.png`),
  ]

  execFileSync(magick, args)
  written += 1
}

console.log(`export:cards: wrote ${written} card${written === 1 ? '' : 's'} to ${path.relative(root, OUT_DIR)}`)
