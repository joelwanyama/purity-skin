import { describe, expect, it } from 'vitest'
import {
  canPublish, claimWarnings, isSafeImagePath, parseCatalog, slugify, uniqueSlug,
  validateProductForPublish,
} from '../catalog/validation'
import { categoriesOf, filterProducts, findPublishedBySlug, publishedProducts } from '../catalog/storage'
import type { CatalogProduct } from '../catalog/types'

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p1',
    slug: 'barrier-serum',
    name: 'Barrier Serum',
    category: 'Serum',
    size_label: '30 ml',
    summary: 'A lightweight serum for daily use.',
    description: 'A lightweight daily serum used after cleansing and before moisturiser. Apply two or three drops to dry skin.',
    price_ugx: 45000,
    image_path: '/images/products/barrier-serum.jpg',
    photo_state: 'ready',
    status: 'draft',
    owner_confirmed: true,
    claims_checked: true,
    created_at: '2026-10-28T00:00:00.000Z',
    updated_at: '2026-10-28T00:00:00.000Z',
    ...overrides,
  }
}

describe('catalogue publishing gate', () => {
  it('passes a complete, confirmed product', () => {
    expect(validateProductForPublish(product()).errors).toEqual([])
    expect(canPublish(product())).toBe(true)
  })

  it('blocks a product with no confirmed price', () => {
    const errors = validateProductForPublish(product({ price_ugx: null })).errors
    expect(errors).toContain('A confirmed price in UGX is required.')
  })

  it('blocks an unconfirmed or unchecked product', () => {
    const gate = validateProductForPublish(product({ owner_confirmed: false, claims_checked: false }))
    expect(gate.errors).toHaveLength(2)
    expect(gate.errors.join(' ')).toMatch(/name, pack size and price are real/)
  })

  it('blocks a fractional price and rejects an unsafe photo path', () => {
    expect(validateProductForPublish(product({ price_ugx: 45000.5 })).errors.join(' ')).toMatch(/whole number/)
    expect(validateProductForPublish(product({ image_path: 'javascript:alert(1)' })).errors.join(' ')).toMatch(/Photo path/)
    expect(isSafeImagePath('//evil.example/x.jpg')).toBe(false)
    expect(isSafeImagePath('/images/products/x.jpg')).toBe(true)
    expect(isSafeImagePath('https://cdn.example/x.jpg')).toBe(true)
  })

  it('needs a real description and pack size', () => {
    const gate = validateProductForPublish(product({ description: 'Nice.', size_label: '' }))
    expect(gate.errors.join(' ')).toMatch(/at least 40 characters/)
    expect(gate.errors.join(' ')).toMatch(/Pack size is required/)
  })

  it('warns about missing photos and medical claims without blocking a draft', () => {
    const warnings = validateProductForPublish(product({ photo_state: 'pending', image_path: null })).warnings
    expect(warnings.join(' ')).toMatch(/photo slot/i)
    expect(claimWarnings('This serum cures acne permanently').length).toBeGreaterThanOrEqual(2)
  })
})

describe('catalogue import safety', () => {
  const file = (products: unknown[], settings: Record<string, unknown> = {}) => ({
    version: 1,
    note: '',
    settings: { business_name: 'PURITY SKIN', whatsapp_number: '256757377624', ...settings },
    products,
  })

  it('demotes a published product that fails the gate instead of publishing it', () => {
    const result = parseCatalog(file([{ ...product(), status: 'published', price_ugx: null }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.catalog.products[0].status).toBe('draft')
    expect(result.warnings.join(' ')).toMatch(/unpublished on import/)
  })

  it('keeps a valid published product published', () => {
    const result = parseCatalog(file([{ ...product(), status: 'published' }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.catalog.products[0].status).toBe('published')
  })

  it('rejects malformed catalogues and missing WhatsApp numbers', () => {
    expect(parseCatalog(null).ok).toBe(false)
    expect(parseCatalog({ products: 'nope' }).ok).toBe(false)
    expect(parseCatalog(file([product()], { whatsapp_number: '123' })).ok).toBe(false)
  })

  it('repairs duplicate slugs rather than dropping products', () => {
    const result = parseCatalog(file([
      { ...product(), id: 'a', slug: 'serum' },
      { ...product(), id: 'b', slug: 'serum' },
    ]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(new Set(result.catalog.products.map((item) => item.slug)).size).toBe(2)
    expect(result.warnings.join(' ')).toMatch(/Duplicate link/)
  })

  it('normalises loose field types from hand-edited JSON', () => {
    const result = parseCatalog(file([{ name: 'Toner', price_ugx: '15000', status: 'live' }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [item] = result.catalog.products
    expect(item.price_ugx).toBe(15000)
    expect(item.status).toBe('draft')
    expect(item.slug).toBe('toner')
  })
})

describe('catalogue queries', () => {
  const published = product({ id: 'a', slug: 'cleanser', name: 'Gentle Cleanser', category: 'Cleanser', status: 'published' })
  const draft = product({ id: 'b', slug: 'night-oil', name: 'Night Oil', category: 'Oil', status: 'draft' })
  const list = [published, draft]

  it('only exposes published products to the shop', () => {
    expect(publishedProducts(list).map((item) => item.id)).toEqual(['a'])
    expect(findPublishedBySlug(list, 'cleanser')?.name).toBe('Gentle Cleanser')
    expect(findPublishedBySlug(list, 'night-oil')).toBeUndefined()
  })

  it('derives categories from published products only', () => {
    expect(categoriesOf(publishedProducts(list))).toEqual(['Cleanser'])
  })

  it('filters by category and free text', () => {
    expect(filterProducts(list, { category: 'Cleanser' })).toHaveLength(1)
    expect(filterProducts(list, { query: 'gentle' })).toHaveLength(1)
    expect(filterProducts(list, { category: 'Oil' })).toHaveLength(1)
    expect(filterProducts(list, { query: 'nothing-here' })).toHaveLength(0)
  })

  it('creates stable, unique slugs', () => {
    expect(slugify('Barrier Repair Serum — 30ml')).toBe('barrier-repair-serum-30ml')
    expect(uniqueSlug('Cleanser', ['cleanser', 'cleanser-2'])).toBe('cleanser-3')
  })
})
