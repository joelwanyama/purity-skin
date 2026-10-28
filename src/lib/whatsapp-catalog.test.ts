import { describe, expect, it } from 'vitest'
// @ts-expect-error - plain Node script, no type declarations
import { absoluteUrl, csvField, toWhatsAppCatalogCsv } from '../../scripts/lib/whatsapp-catalog.mjs'

const base = 'https://purityskin.pages.dev'

function product(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'barrier-repair-serum',
    name: 'Barrier Repair Serum',
    size_label: '30 ml',
    description: 'A lightweight daily serum used after cleansing and before moisturiser.',
    summary: 'Lightweight serum.',
    price_ugx: 48000,
    image_path: '/images/products/barrier-repair-serum-01.jpg',
    photo_state: 'ready',
    status: 'published',
    ...over,
  }
}

describe('Meta / WhatsApp catalogue feed', () => {
  it('writes the columns Meta expects, with the currency in the price', () => {
    const { csv, included } = toWhatsAppCatalogCsv({ products: [product()], settings: { business_name: 'PURITY SKIN' }, baseUrl: base })
    const [header, row] = csv.trim().split('\n')
    expect(header).toBe('id,title,description,availability,condition,price,link,image_link,brand,google_product_category')
    expect(row).toContain('barrier-repair-serum')
    expect(row).toContain('Barrier Repair Serum — 30 ml')
    expect(row).toContain('48000 UGX')
    expect(row).toContain('https://purityskin.pages.dev/shop/barrier-repair-serum')
    expect(row).toContain('https://purityskin.pages.dev/images/products/barrier-repair-serum-01.jpg')
    expect(included).toBe(1)
  })

  it('never exports a draft', () => {
    const { included } = toWhatsAppCatalogCsv({ products: [product({ status: 'draft' })], baseUrl: base })
    expect(included).toBe(0)
  })

  it('skips, and reports, anything the shop cannot back up', () => {
    const result = toWhatsAppCatalogCsv({
      products: [product({ id: 'a', name: 'No price', price_ugx: null }), product({ id: 'b', name: 'No photo', image_path: null })],
      baseUrl: base,
    })
    expect(result.included).toBe(0)
    expect(result.skipped).toEqual([
      { name: 'No price', reason: 'no confirmed price' },
      { name: 'No photo', reason: 'no approved photo' },
    ])
  })

  it('quotes fields that would otherwise break the CSV', () => {
    expect(csvField('plain')).toBe('plain')
    expect(csvField('has, comma')).toBe('"has, comma"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('two\nlines')).toBe('"two\nlines"')
  })

  it('resolves relative photo paths and leaves absolute ones alone', () => {
    expect(absoluteUrl(base, '/images/a.jpg')).toBe('https://purityskin.pages.dev/images/a.jpg')
    expect(absoluteUrl(`${base}/`, 'images/a.jpg')).toBe('https://purityskin.pages.dev/images/a.jpg')
    expect(absoluteUrl(base, 'https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
  })

  it('refuses to build a feed whose links would not work in WhatsApp', () => {
    expect(() => toWhatsAppCatalogCsv({ products: [product()], baseUrl: '/relative' })).toThrow(/https/)
  })
})
