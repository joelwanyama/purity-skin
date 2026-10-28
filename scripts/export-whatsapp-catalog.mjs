/**
 * Writes public/downloads/whatsapp-catalog.csv from the committed catalogue.
 *
 * Usage: npm run export:whatsapp [baseUrl]
 * Default base URL: https://purityskin.pages.dev
 *
 * Nothing is written when there is no published product with a price and a
 * photo — an empty feed would only confuse the owner.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { toWhatsAppCatalogCsv } from './lib/whatsapp-catalog.mjs'

const root = process.cwd()
const baseUrl = process.argv[2] || 'https://purityskin.pages.dev'
const catalogue = JSON.parse(readFileSync(path.join(root, 'src/catalog/catalog.data.json'), 'utf8'))
const { csv, included, skipped } = toWhatsAppCatalogCsv({
  products: catalogue.products ?? [],
  settings: catalogue.settings ?? {},
  baseUrl,
})

if (included === 0) {
  console.log('No published product has both a confirmed price and a photo yet, so no feed was written.')
  for (const item of skipped) console.log(`  skipped ${item.name}: ${item.reason}`)
  process.exit(0)
}

const outDir = path.join(root, 'public/downloads')
mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'whatsapp-catalog.csv')
writeFileSync(outPath, csv, 'utf8')
console.log(`Wrote ${included} product${included === 1 ? '' : 's'} to ${path.relative(root, outPath)}`)
for (const item of skipped) console.log(`  skipped ${item.name}: ${item.reason}`)
