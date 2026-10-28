import { describe, expect, it } from 'vitest'
import { buildEnquiryMessage, type EnquiryLine } from './enquiry'
import type { CatalogProduct } from '../catalog/types'
import {
  addEntry, createEntry, csvFilename, describeEntryForConfirmation, describeItems, itemsTotal,
  loadLedger, parseEnquiryMessage, parseShillings, removeEntry, sanitizeEntries, saveLedger,
  setStatus, sortEntries, summarizeLedger, toCsv, type LedgerEntry,
} from './ledger'

const product = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
  id: 'p1', slug: 'p1', name: 'Barrier Serum', category: 'Serum', size_label: '30 ml',
  summary: '', description: '', price_ugx: 48000, image_path: null, photo_state: 'pending',
  status: 'published', owner_confirmed: true, claims_checked: true,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const line = (overrides: Partial<CatalogProduct> = {}, quantity = 1): EnquiryLine => {
  const { product: built } = { product: product(overrides) }
  return { product: built, quantity, lineTotal: built.price_ugx === null ? null : built.price_ugx * quantity }
}

describe('reading the message the shop generates', () => {
  it('reads every numbered line, its size, quantity and price', () => {
    const message = buildEnquiryMessage({
      businessName: 'PURITY SKIN',
      lines: [line({}, 2), line({ id: 'p2', name: 'Gentle Cleanser', size_label: '120 ml', price_ugx: 32000 })],
      note: 'Please deliver on Saturday',
    })
    const parsed = parseEnquiryMessage(message)

    expect(parsed.items).toEqual([
      { name: 'Barrier Serum', size: '30 ml', quantity: 2, line_total_ugx: 96000 },
      { name: 'Gentle Cleanser', size: '120 ml', quantity: 1, line_total_ugx: 32000 },
    ])
    expect(parsed.total_ugx).toBe(128000)
    expect(parsed.note).toBe('Please deliver on Saturday')
  })

  it('keeps parentheses that belong to the product name', () => {
    const parsed = parseEnquiryMessage('1. Sample Serum (test only) — 30 ml — 2 × UGX 96,000 (UGX 48,000 each)')
    expect(parsed.items).toEqual([
      { name: 'Sample Serum (test only)', size: '30 ml', quantity: 2, line_total_ugx: 96000 },
    ])
  })

  it('leaves an unpriced line unpriced instead of inventing a number', () => {
    const message = buildEnquiryMessage({
      businessName: 'PURITY SKIN',
      lines: [line({ price_ugx: null }, 1)],
    })
    const parsed = parseEnquiryMessage(message)
    expect(parsed.items[0].line_total_ugx).toBeNull()
    expect(parsed.total_ugx).toBeNull()
  })

  it('reads a single-product question from the product page', () => {
    const parsed = parseEnquiryMessage('Hello PURITY SKIN, I would like to ask about Barrier Serum (30 ml).')
    expect(parsed.items).toEqual([{ name: 'Barrier Serum', size: '30 ml', quantity: 1, line_total_ugx: null }])
  })

  it('returns nothing rather than a guess for text it does not recognise', () => {
    for (const text of ['', 'hey are you open?', 'Barrier serum 48k pls']) {
      expect(parseEnquiryMessage(text).items).toEqual([])
    }
  })

  it('copes with forwarded text that lost its em dashes', () => {
    const parsed = parseEnquiryMessage('1. Barrier Serum 30 ml 2 x UGX 96,000')
    expect(parsed.items[0]).toMatchObject({ name: 'Barrier Serum 30 ml 2 x UGX 96,000', quantity: 1 })
    expect(parsed.items[0].line_total_ugx).toBeNull()
  })
})

describe('reading shilling amounts', () => {
  it('accepts the ways people write money', () => {
    expect(parseShillings('UGX 48,000')).toBe(48000)
    expect(parseShillings('48,000')).toBe(48000)
    expect(parseShillings('48000')).toBe(48000)
    expect(parseShillings('ugx 1 250 000')).toBe(1250000)
  })

  it('returns null when there is no number', () => {
    expect(parseShillings('price to be confirmed')).toBeNull()
    expect(parseShillings('—')).toBeNull()
  })
})

describe('entries', () => {
  it('totals only when every line is priced', () => {
    expect(itemsTotal([
      { name: 'A', size: '', quantity: 1, line_total_ugx: 1000 },
      { name: 'B', size: '', quantity: 1, line_total_ugx: 2000 },
    ])).toBe(3000)
    expect(itemsTotal([
      { name: 'A', size: '', quantity: 1, line_total_ugx: 1000 },
      { name: 'B', size: '', quantity: 1, line_total_ugx: null },
    ])).toBeNull()
    expect(itemsTotal([])).toBeNull()
  })

  it('starts a logged enquiry as new and keeps what it was given', () => {
    const entry = createEntry({ customer: '  Amina ', total_ugx: 48000, note: 'Called after 6pm' })
    expect(entry.status).toBe('new')
    expect(entry.customer).toBe('Amina')
    expect(entry.total_ugx).toBe(48000)
    expect(entry.source).toBe('manual')
    expect(entry.id).toMatch(/^led-/)
  })

  it('sorts newest first and can change status or be removed', () => {
    const older = createEntry({ customer: 'Older' }, new Date('2026-10-01T10:00:00.000Z'))
    const newer = createEntry({ customer: 'Newer' }, new Date('2026-10-09T10:00:00.000Z'))
    const list = addEntry([older], newer)
    expect(list.map((entry) => entry.customer)).toEqual(['Newer', 'Older'])
    expect(setStatus(list, newer.id, 'delivered')[0].status).toBe('delivered')
    expect(removeEntry(list, newer.id).map((entry) => entry.customer)).toEqual(['Older'])
    expect(sortEntries([older, newer])[0].customer).toBe('Newer')
  })

  it('describes an entry the way the owner would say it out loud', () => {
    const entry = createEntry({
      items: [{ name: 'Barrier Serum', size: '30 ml', quantity: 2, line_total_ugx: 96000 }],
      total_ugx: 96000,
    })
    expect(describeItems(entry.items)).toBe('2 × Barrier Serum (30 ml)')
    expect(describeEntryForConfirmation(entry)).toContain('UGX 96,000')
    expect(describeItems([])).toBe('No items recorded')
  })
})

describe('summary', () => {
  const now = new Date('2026-10-29T12:00:00.000Z')
  const entries: LedgerEntry[] = [
    createEntry({ total_ugx: 10000 }, new Date('2026-10-28T09:00:00.000Z')),
    { ...createEntry({ total_ugx: 20000 }, new Date('2026-10-20T09:00:00.000Z')), status: 'delivered' },
    { ...createEntry({ total_ugx: 5000 }, new Date('2026-10-05T09:00:00.000Z')), status: 'cancelled' },
    createEntry({ total_ugx: null }, new Date('2026-09-01T09:00:00.000Z')),
  ]

  it('separates money earned from money still promised', () => {
    expect(summarizeLedger(entries, now)).toEqual({
      open: 2, delivered: 1, cancelled: 1, deliveredUgx: 20000, pipelineUgx: 10000, lastSevenDays: 1,
    })
  })
})

describe('CSV export', () => {
  it('writes a header plus one row per entry, quoting what needs quoting', () => {
    const entry = createEntry({
      customer: 'Amina, Kampala',
      items: [{ name: 'Barrier Serum', size: '30 ml', quantity: 1, line_total_ugx: 48000 }],
      note: 'Said "Saturday" works',
      created_at: '2026-10-28T09:00:00.000Z',
    })
    const csv = toCsv([entry])
    const [header, row] = csv.trim().split('\r\n')
    expect(header).toBe('date,customer,status,items,total_ugx,note,source')
    expect(row).toContain('"Amina, Kampala"')
    expect(row).toContain('48000')
    expect(row).toContain('"Said ""Saturday"" works"')
  })

  it('names the file with a date so two exports never overwrite each other', () => {
    expect(csvFilename(new Date('2026-10-29T22:00:00.000Z'))).toBe('purity-skin-orders-2026-10-29.csv')
  })
})

describe('storage safety', () => {
  it('rejects junk without throwing and keeps good entries', () => {
    const good = createEntry({ customer: 'Amina', total_ugx: 48000 }, new Date('2026-10-01T00:00:00.000Z'))
    const cleaned = sanitizeEntries([
      good,
      null,
      'nonsense',
      { id: good.id, customer: 'duplicate id' },
      { id: 'x', created_at: 'not a date', status: 'weird', items: [{ name: '' }, { name: 'Cleanser', quantity: 'lots' }] },
    ])
    expect(cleaned).toHaveLength(2)
    expect(cleaned.find((entry) => entry.id === 'x')?.status).toBe('new')
    expect(cleaned.find((entry) => entry.id === 'x')?.items[0].quantity).toBe(1)
  })

  it('survives an unreadable store and reports a failed write', () => {
    expect(loadLedger({ getItem: () => '{not json' })).toEqual([])
    expect(loadLedger(null)).toEqual([])
    expect(saveLedger([], { setItem: () => { throw new Error('quota') } })).toBe(false)
    expect(saveLedger([], null)).toBe(false)
  })

  it('round-trips through storage', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value) } }
    const entry = createEntry({ customer: 'Amina', total_ugx: 48000, items: [{ name: 'Serum', size: '30 ml', quantity: 1, line_total_ugx: 48000 }] })
    expect(saveLedger([entry], storage)).toBe(true)
    expect(loadLedger(storage)).toEqual([entry])
  })
})
