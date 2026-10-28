/**
 * Rebuilds every brand image from the official PURITY SKIN artwork.
 *
 * The source of truth is `brand-src/purity-skin-whatsapp-profile.jpg` — the
 * profile picture the shop actually uses on WhatsApp. Nothing here invents a
 * logo: the icon is a crop of that artwork and the social card places the same
 * artwork on the brand greige. If the shop changes its profile picture, drop the
 * new file in `brand-src/` and run this again.
 *
 * Usage: npm run assets   (needs ImageMagick's `magick` or `convert` on PATH)
 * Outputs: public/brand/*, public/icons/*, public/favicon-32.png, public/og.png
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const SOURCE = 'brand-src/purity-skin-whatsapp-profile.jpg'
const BRAND = '#C2B7BD'
const INK = '#070506'

const magick = ['magick', 'convert'].find((candidate) => {
  try {
    execFileSync(candidate, ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})

if (!magick) {
  console.error('ImageMagick is required: install it, or commit the generated files as they are.')
  process.exit(1)
}
if (!existsSync(SOURCE)) {
  console.error(`Missing source artwork: ${SOURCE}`)
  process.exit(1)
}

const run = (...args) => execFileSync(magick, args, { stdio: 'inherit' })
for (const dir of ['public/brand', 'public/icons']) mkdirSync(dir, { recursive: true })

// 1. The artwork exactly as the shop publishes it on WhatsApp.
run(SOURCE, '-quality', '92', 'public/brand/purity-skin-avatar.jpg')

// 2. The monogram crop used for the site mark and every icon.
run(SOURCE, '-crop', '320x320+180+74', '+repage', '-resize', '512x512', '-quality', '94', 'public/brand/purity-mark.png')

for (const [size, out] of [['512', 'public/icons/purity-512.png'], ['192', 'public/icons/purity-192.png'], ['180', 'public/icons/apple-touch-icon.png'], ['32', 'public/favicon-32.png']]) {
  run('public/brand/purity-mark.png', '-resize', `${size}x${size}`, out)
}

// 3. The social card: the same artwork on the brand greige, with no claims.
run(
  '-size', '1200x630', `xc:${BRAND}`,
  '(', 'public/brand/purity-mark.png', '-resize', '512x512', ')', '-geometry', '+78+59', '-composite',
  '-fill', INK, '-font', 'DejaVu-Sans-Mono', '-pointsize', '20', '-kerning', '4', '-annotate', '+660+150', 'FORMULATED TO FIX',
  '-font', 'Bitstream-Charter-Bold', '-pointsize', '62', '-kerning', '0', '-annotate', '+656+240', 'Skincare,',
  '-font', 'Bitstream-Charter-Bold', '-pointsize', '62', '-annotate', '+656+310', 'made in Kampala.',
  '-font', 'Bitstream-Charter-Regular', '-pointsize', '27', '-annotate', '+656+380', 'Browse the collection, ask a question,',
  '-font', 'Bitstream-Charter-Regular', '-pointsize', '27', '-annotate', '+656+415', 'then order on WhatsApp.',
  '-stroke', INK, '-strokewidth', '1', '-draw', 'line 660,455 1140,455', '-stroke', 'none',
  '-font', 'DejaVu-Sans-Mono', '-pointsize', '19', '-kerning', '2', '-annotate', '+660+500', 'purityskin.pages.dev',
  '-depth', '8', '-quality', '92', 'public/og.png',
)

console.log('Brand assets rebuilt from', SOURCE)
