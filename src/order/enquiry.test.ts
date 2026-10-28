import { describe, expect, it } from 'vitest'
import type { CatalogProduct } from '../catalog/types'
import {
  ENQUIRY_KEY,
  MAX_QUANTITY,
  addItem,
  buildEnquiryMessage,
  clampQuantity,
  countItems,
  loadEnquiry,
  missingLines,
  removeItem,
  resolveLines,
  saveEnquiry,
  setQuantity,
  summarize,
} from './enquiry'

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p1',
    slug: 'serum',
    name: 'Barrier Repair Serum',
    category: 'Serum',
    size_label: '30 ml',
    summary: 'A lightweight daily serum.',
    description: 'A lightweight daily serum used after cleansing and before moisturiser.',
    price_ugx: 48000,
    image_path: '/images/products/serum-01.jpg',
    photo_state: 'ready',
    status: 'published',
    owner_confirmed: true,
    claims_checked: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

const soap = product({ id: 'p2', slug: 'soap', name: 'Daily Bar', category: 'Soap', size_label: '100 g', price_ugx: 12000 })
const serum = product()

describe('quantities', () => {
  it('keeps quantities whole and inside the allowed range', () => {
    expect(clampQuantity(3)).toBe(3)
    expect(clampQuantity(0)).toBe(1)
    expect(clampQuantity(-4)).toBe(1)
    expect(clampQuantity(999)).toBe(MAX_QUANTITY)
    expect(clampQuantity(2.7)).toBe(2)
    expect(clampQuantity('4')).toBe(4)
    expect(clampQuantity('not a number')).toBe(1)
  })

  it('merges a repeated add instead of duplicating the line', () => {
    const once = addItem([], serum)
    const twice = addItem(once, serum)
    expect(twice).toHaveLength(1)
    expect(twice[0].quantity).toBe(2)
  })

  it('never exceeds the maximum by adding again', () => {
    let lines: ReturnType<typeof addItem> = []
    for (let index = 0; index < 20; index += 1) lines = addItem(lines, serum)
    expect(lines[0].quantity).toBe(MAX_QUANTITY)
  })

  it('sets and removes lines by product id', () => {
    const lines = addItem(addItem([], serum), soap)
    expect(setQuantity(lines, 'p1', 4)[0].quantity).toBe(4)
    expect(removeItem(lines, 'p1').map((line) => line.product_id)).toEqual(['p2'])
  })
})

describe('resolving against the live catalogue', () => {
  it('uses the catalogue price, not the saved line', () => {
    const stored = addItem([], product({ price_ugx: 1000 }))
    const resolved = resolveLines(stored, [serum])
    expect(resolved[0].product.price_ugx).toBe(48000)
    expect(resolved[0].lineTotal).toBe(48000)
  })

  it('drops products that are no longer published and reports them', () => {
    const stored = addItem(addItem([], serum), soap)
    expect(resolveLines(stored, [serum])).toHaveLength(1)
    expect(missingLines(stored, [serum]).map((line) => line.name)).toEqual(['Daily Bar'])
  })

  it('handles a product without a confirmed price', () => {
    const resolved = resolveLines(addItem([], product({ price_ugx: null })), [product({ price_ugx: null })])
    expect(resolved[0].lineTotal).toBeNull()
    const totals = summarize(resolved)
    expect(totals.totalUgx).toBe(0)
    expect(totals.hasUnpriced).toBe(true)
  })

  it('sums quantities and line totals', () => {
    const lines = resolveLines(addItem(addItem([], serum), soap, 2), [serum, soap])
    const totals = summarize(lines)
    expect(countItems(lines)).toBe(3)
    expect(totals.totalUgx).toBe(48000 + 12000 * 2)
  })
})

describe('the message that gets sent', () => {
  const lines = resolveLines(addItem(addItem([], serum), soap, 2), [serum, soap])

  it('lists every item, quantity, size and price', () => {
    const message = buildEnquiryMessage({ businessName: 'PURITY SKIN', lines })
    expect(message).toContain('Hello PURITY SKIN, I would like to check these items:')
    expect(message).toContain('1. Barrier Repair Serum — 30 ml — 1 × UGX 48,000')
    expect(message).toContain('2. Daily Bar — 100 g — 2 × UGX 24,000 (UGX 12,000 each)')
    expect(message).toContain('Total of listed prices: UGX 72,000 — delivery is not included.')
  })

  it('says plainly that it is an enquiry, not a paid order', () => {
    expect(buildEnquiryMessage({ businessName: 'PURITY SKIN', lines })).toContain('This is an enquiry, not a paid order.')
  })

  it('never invents a total when no price is published', () => {
    const bare = product({ price_ugx: null })
    const unpriced = resolveLines(addItem([], bare), [bare])
    const message = buildEnquiryMessage({ businessName: 'PURITY SKIN', lines: unpriced })
    expect(message).toContain('price to be confirmed')
    expect(message).toContain('None of these items has a published price yet')
    expect(message).not.toMatch(/UGX 0\b/)
    expect(message).not.toContain('Total of listed prices')
  })

  it('labels a part-total honestly when only some prices are published', () => {
    const bare = product({ id: 'p3', slug: 'balm', name: 'Repair Balm', price_ugx: null })
    const mixed = resolveLines(addItem(addItem([], serum), bare), [serum, bare])
    const message = buildEnquiryMessage({ businessName: 'PURITY SKIN', lines: mixed })
    expect(message).toContain('Total of the prices listed so far: UGX 48,000 — delivery is not included.')
    expect(message).toContain('One item has no published price yet; please confirm it with me.')
  })

  it('carries a trimmed note and ignores whitespace-only notes', () => {
    expect(buildEnquiryMessage({ businessName: 'PURITY SKIN', lines, note: '  I am in Ntinda  ' })).toContain('My note: I am in Ntinda')
    expect(buildEnquiryMessage({ businessName: 'PURITY SKIN', lines, note: '   ' })).not.toContain('My note')
  })
})

describe('saved list', () => {
  const memory = (initial: string | null = null) => {
    let value = initial
    return {
      getItem: () => value,
      setItem: (_key: string, next: string) => { value = next },
    }
  }

  it('round-trips through storage', () => {
    const store = memory()
    saveEnquiry({ version: 1, note: 'Kampala', lines: addItem([], serum) }, store)
    const loaded = loadEnquiry(store)
    expect(loaded.note).toBe('Kampala')
    expect(loaded.lines).toEqual([{ product_id: 'p1', name: 'Barrier Repair Serum', quantity: 1 }])
  })

  it('starts empty when there is nothing saved', () => {
    expect(loadEnquiry(memory())).toEqual({ version: 1, note: '', lines: [] })
  })

  it('survives corrupt or hostile saved data', () => {
    expect(loadEnquiry(memory('{not json')).lines).toEqual([])
    expect(loadEnquiry(memory('null')).lines).toEqual([])
    expect(loadEnquiry(memory(JSON.stringify({ lines: [{ product_id: 42 }, null, { product_id: 'p9', quantity: 'x' }] }))).lines)
      .toEqual([{ product_id: 'p9', name: '', quantity: 1 }])
  })

  it('reports failure instead of throwing when storage is unavailable', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadEnquiry(blocked).lines).toEqual([])
    expect(saveEnquiry({ version: 1, note: '', lines: [] }, blocked)).toBe(false)
  })

  it('uses a versioned key', () => {
    expect(ENQUIRY_KEY).toBe('purity.enquiry.v1')
  })
})
