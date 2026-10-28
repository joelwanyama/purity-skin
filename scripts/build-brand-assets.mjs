/**
 * Renders the brand image assets from SVG sources with Chromium, so type and
 * spacing match what a browser draws instead of ImageMagick's SVG fallback.
 *
 * Usage: node scripts/build-brand-assets.mjs
 * Outputs: public/og.png, public/favicon-32.png, public/icons/*.png
 */
import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const src = path.join(root, 'assets-src')

const targets = [
  { svg: 'og.svg', out: 'public/og.png', width: 1200, height: 630 },
  { svg: 'icon.svg', out: 'public/icons/purity-512.png', width: 512, height: 512 },
  { svg: 'icon.svg', out: 'public/icons/purity-192.png', width: 192, height: 192 },
  { svg: 'icon.svg', out: 'public/icons/apple-touch-icon.png', width: 180, height: 180 },
  { svg: 'icon.svg', out: 'public/favicon-32.png', width: 32, height: 32 },
]

const browser = await chromium.launch()
try {
  for (const target of targets) {
    const svg = await readFile(path.join(src, target.svg), 'utf8')
    const page = await browser.newPage({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: 1,
    })
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>
        html,body{margin:0;padding:0;background:#141018}
        svg{display:block;width:${target.width}px;height:${target.height}px}
      </style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' },
    )
    const outPath = path.join(root, target.out)
    await mkdir(path.dirname(outPath), { recursive: true })
    await page.screenshot({ path: outPath, omitBackground: false })
    await page.close()
    console.log(`rendered ${target.out} (${target.width}x${target.height})`)
  }
} finally {
  await browser.close()
}
