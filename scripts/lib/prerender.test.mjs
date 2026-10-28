/**
 * Tests for the prerenderer. Kept as plain JavaScript next to the code it
 * covers, so the browser app's TypeScript project never has to care about
 * node:fs typings.
 * @vitest-environment node
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { prerender, publishableProducts } from '../../scripts/lib/prerender.mjs'

const ORIGIN = 'https://purityskin.pages.dev'
const roots = []

/** A throwaway project root holding the real page template and a test catalogue. */
function makeProject(catalogue, { photos = [], withSitemap = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'prerender-'))
  roots.push(root)
  mkdirSync(path.join(root, 'dist'), { recursive: true })
  mkdirSync(path.join(root, 'src/catalog'), { recursive: true })
  // The real template: the same head the build starts from.
  writeFileSync(path.join(root, 'dist/index.html'), readFileSync(path.resolve('index.html'), 'utf8'))
  writeFileSync(path.join(root, 'src/catalog/catalog.data.json'), JSON.stringify(catalogue))
  for (const photo of photos) {
    const file = path.join(root, 'dist', photo.replace(/^\/+/, ''))
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, 'jpeg-bytes')
  }
  if (withSitemap) {
    writeFileSync(
      path.join(root, 'dist/sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://purityskin.pages.dev/</loc></url>\n</urlset>\n',
    )
  }
  return root
}

const settings = {
  business_name: 'PURITY SKIN',
  whatsapp_number: '256757377624',
  location: 'Kampala, Uganda',
  delivery_summary: 'Delivery is arranged in the chat.',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const base = {
  category: 'Sample',
  size_label: '30 ml',
  summary: 'Sample product used only by the automated tests.',
  description: 'Sample product used only by the automated tests. It is not real stock.',
  image_path: null,
  photo_state: 'pending',
  status: 'published',
  owner_confirmed: true,
  claims_checked: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const read = (root, ...parts) => readFileSync(path.join(root, 'dist', ...parts), 'utf8')

afterAll(() => {
  // Temp dirs live outside the workspace and are tiny; nothing is left behind in the repo.
})

describe('prerendering per-product share pages', () => {
  it('gives every published product its own title, canonical URL and price', () => {
    const root = makeProject({
      settings,
      products: [
        { ...base, id: 'test-serum', slug: 'test-serum', name: 'Sample Serum (test only)', price_ugx: 48000 },
        { ...base, id: 'test-bar', slug: 'test-bar', name: 'Sample Bar (test only)', size_label: '100 g', price_ugx: 12000 },
      ],
    })
    const manifest = prerender({ root, origin: ORIGIN, log: () => {} })

    expect(manifest.products).toEqual(['test-serum', 'test-bar'])
    expect(manifest.pages).toBe(3)

    const serum = read(root, 'shop/test-serum/index.html')
    expect(serum).toContain('<title>Sample Serum (test only) 30 ml · PURITY SKIN</title>')
    expect(serum).toContain(`<link rel="canonical" href="${ORIGIN}/shop/test-serum" />`)
    expect(serum).toContain(`<meta property="og:url" content="${ORIGIN}/shop/test-serum" />`)
    expect(serum).toContain('UGX 48,000')
    expect(serum).toContain('<meta property="og:type" content="product" />')

    const bar = read(root, 'shop/test-bar/index.html')
    expect(bar).toContain('UGX 12,000')
    expect(bar).not.toContain('UGX 48,000')
  })

  it('emits Product structured data only when the price is confirmed', () => {
    const root = makeProject({
      settings,
      products: [
        { ...base, id: 'priced', slug: 'priced', name: 'Priced (test only)', price_ugx: 30000 },
        { ...base, id: 'unpriced', slug: 'unpriced', name: 'Unpriced (test only)', price_ugx: null },
        { ...base, id: 'zero', slug: 'zero', name: 'Zero (test only)', price_ugx: 0 },
      ],
    })
    prerender({ root, origin: ORIGIN, log: () => {} })

    const priced = read(root, 'shop/priced/index.html')
    const jsonLd = JSON.parse(priced.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    expect(jsonLd['@type']).toBe('Product')
    expect(jsonLd.offers).toMatchObject({ price: '30000', priceCurrency: 'UGX', url: `${ORIGIN}/shop/priced` })

    for (const slug of ['unpriced', 'zero']) {
      const html = read(root, `shop/${slug}/index.html`)
      expect(html).not.toContain('"@type":"Product"')
      expect(html).toContain('Price confirmed on WhatsApp')
    }
  })

  it('never prerenders a draft, an archived product or anything without a name', () => {
    const root = makeProject({
      settings,
      products: [
        { ...base, id: 'live', slug: 'live', name: 'Live (test only)', price_ugx: 1000 },
        { ...base, id: 'draft', slug: 'draft', name: 'Draft (test only)', status: 'draft' },
        { ...base, id: 'archived', slug: 'archived', name: 'Archived (test only)', status: 'archived' },
        { ...base, id: 'noname', slug: 'noname', name: '   ', price_ugx: 1000 },
        { ...base, id: 'noslug', slug: '', name: 'No slug (test only)', price_ugx: 1000 },
      ],
    })
    const manifest = prerender({ root, origin: ORIGIN, log: () => {} })
    expect(manifest.products).toEqual(['live'])
    expect(existsSync(path.join(root, 'dist/shop/draft'))).toBe(false)
    expect(existsSync(path.join(root, 'dist/shop/archived'))).toBe(false)
    expect(existsSync(path.join(root, 'dist/shop/noslug'))).toBe(false)
  })

  it('points the share card at the 1200x630 crop when the photo pipeline made one', () => {
    const root = makeProject(
      {
        settings,
        products: [
          { ...base, id: 'photo', slug: 'photo', name: 'Photo (test only)', price_ugx: 20000, image_path: '/images/products/photo-01.jpg', photo_state: 'ready' },
        ],
      },
      { photos: ['/images/products/photo-01.jpg', '/images/products/photo-01-share.jpg'] },
    )
    prerender({ root, origin: ORIGIN, log: () => {} })
    const html = read(root, 'shop/photo/index.html')
    expect(html).toContain(`<meta property="og:image" content="${ORIGIN}/images/products/photo-01-share.jpg" />`)
    expect(html).toContain('<meta property="og:image:type" content="image/jpeg" />')
    expect(html).toContain('<meta property="og:image:width" content="1200" />')
    expect(html).toContain('<meta property="og:image:height" content="630" />')
  })

  it('falls back to the brand card when a photo is missing or the crop was never built', () => {
    const root = makeProject({
      settings,
      products: [
        { ...base, id: 'nophoto', slug: 'nophoto', name: 'No photo (test only)', price_ugx: 20000 },
        { ...base, id: 'gone', slug: 'gone', name: 'Gone (test only)', price_ugx: 20000, image_path: '/images/products/missing-01.jpg', photo_state: 'ready' },
      ],
    })
    prerender({ root, origin: ORIGIN, log: () => {} })
    for (const slug of ['nophoto', 'gone']) {
      const html = read(root, `shop/${slug}/index.html`)
      expect(html).toContain(`<meta property="og:image" content="${ORIGIN}/og.png" />`)
      expect(html).toContain('<meta property="og:image:type" content="image/png" />')
    }
  })

  it('writes a /shop page, a sitemap entry per product and a manifest', () => {
    const root = makeProject({
      settings,
      products: [{ ...base, id: 'one', slug: 'one', name: 'One (test only)', price_ugx: 5000 }],
    })
    prerender({ root, origin: ORIGIN, log: () => {} })

    const shop = read(root, 'shop/index.html')
    expect(shop).toContain('<title>Shop the collection · PURITY SKIN</title>')
    const itemList = JSON.parse(shop.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    expect(itemList['@type']).toBe('ItemList')
    expect(itemList.itemListElement).toEqual([{ '@type': 'ListItem', position: 1, url: `${ORIGIN}/shop/one`, name: 'One (test only)' }])

    const sitemap = read(root, 'sitemap.xml')
    expect(sitemap).toContain(`<loc>${ORIGIN}/shop/one</loc>`)
    expect(sitemap).toContain('<loc>https://purityskin.pages.dev/</loc>')

    expect(JSON.parse(read(root, 'prerender.json'))).toEqual({ origin: ORIGIN, pages: 2, products: ['one'] })
  })

  it('still writes an honest empty shop when nothing is published', () => {
    const root = makeProject({ settings, products: [] })
    const manifest = prerender({ root, origin: ORIGIN, log: () => {} })
    expect(manifest.products).toEqual([])
    const shop = read(root, 'shop/index.html')
    expect(shop).toContain('Every PURITY SKIN product currently published')
    expect(shop).not.toContain('ItemList')
    expect(shop).toContain('256757377624')
  })

  it('escapes product text so a name can never inject markup', () => {
    const root = makeProject({
      settings,
      products: [
        {
          ...base,
          id: 'xss',
          slug: 'xss',
          name: '</title><script>alert(1)</script>',
          summary: '<img src=x onerror=alert(1)>',
          price_ugx: 1000,
        },
      ],
    })
    prerender({ root, origin: ORIGIN, log: () => {} })
    const html = read(root, 'shop/xss/index.html')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    // The JSON-LD block must stay parseable even with angle brackets in the text.
    const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    expect(jsonLd.name).toBe('</title><script>alert(1)</script>')
  })

  it('keeps the readable summary for anyone without JavaScript', () => {
    const root = makeProject({
      settings,
      products: [{ ...base, id: 'noscript', slug: 'noscript', name: 'No script (test only)', price_ugx: 7000, summary: 'A short honest summary.' }],
    })
    prerender({ root, origin: ORIGIN, log: () => {} })
    const html = read(root, 'shop/noscript/index.html')
    const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1]
    expect(noscript).toContain('No script (test only)')
    expect(noscript).toContain('UGX 7,000')
    expect(noscript).toContain('A short honest summary.')
    expect(html.match(/<noscript>/g)).toHaveLength(1)
  })

  it('publishableProducts is the single gate for what reaches the public shop', () => {
    expect(
      publishableProducts({
        products: [
          { status: 'published', slug: 'a', name: 'A' },
          { status: 'draft', slug: 'b', name: 'B' },
          { status: 'published', slug: ' ', name: 'C' },
          { status: 'published', slug: 'd', name: '' },
          null,
        ],
      }).map((product) => product.slug),
    ).toEqual(['a'])
  })
})
