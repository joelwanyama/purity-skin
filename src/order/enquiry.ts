import type { CatalogProduct } from '../catalog/types'
import { formatUGX } from '../lib/format'

/**
 * The enquiry list: what a customer wants to ask about, kept on their own
 * device until they send it. It is deliberately not a cart — there is no
 * checkout, no reservation and no payment anywhere in this file.
 *
 * Only the product id and a quantity are stored. Names, sizes and prices are
 * always re-read from the published catalogue, so a stale saved price can never
 * be sent to the shop or shown to the customer.
 */

export const ENQUIRY_KEY = 'purity.enquiry.v1'
export const MAX_QUANTITY = 10
const MAX_LINES = 30
const MAX_NOTE = 400

export type StoredLine = {
  product_id: string
  /** Label kept only so a removed product can be named in a notice. */
  name: string
  quantity: number
}

export type StoredEnquiry = {
  version: 1
  note: string
  lines: StoredLine[]
}

export type EnquiryLine = {
  product: CatalogProduct
  quantity: number
  /** null when the product has no confirmed price yet. */
  lineTotal: number | null
}

export function emptyEnquiry(): StoredEnquiry {
  return { version: 1, note: '', lines: [] }
}

export function clampQuantity(value: unknown): number {
  const parsed = Math.trunc(Number(value))
  if (!Number.isFinite(parsed)) return 1
  return Math.min(MAX_QUANTITY, Math.max(1, parsed))
}

export function addItem(lines: StoredLine[], product: Pick<CatalogProduct, 'id' | 'name'>, quantity = 1): StoredLine[] {
  const step = clampQuantity(quantity)
  const next = lines.map((line) => ({ ...line }))
  const existing = next.find((line) => line.product_id === product.id)
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + step)
    return next
  }
  if (next.length >= MAX_LINES) return next
  next.push({ product_id: product.id, name: product.name, quantity: step })
  return next
}

export function setQuantity(lines: StoredLine[], productId: string, quantity: number): StoredLine[] {
  return lines.map((line) => (line.product_id === productId ? { ...line, quantity: clampQuantity(quantity) } : line))
}

export function removeItem(lines: StoredLine[], productId: string): StoredLine[] {
  return lines.filter((line) => line.product_id !== productId)
}

export function countItems(lines: Array<Pick<EnquiryLine, 'quantity'>>): number {
  return lines.reduce((total, line) => total + line.quantity, 0)
}

/** Pairs saved lines with the live catalogue, in catalogue order. */
export function resolveLines(stored: StoredLine[], published: CatalogProduct[]): EnquiryLine[] {
  const byId = new Map(published.map((product) => [product.id, product]))
  const resolved: EnquiryLine[] = []
  for (const line of stored) {
    const product = byId.get(line.product_id)
    if (!product) continue
    const quantity = clampQuantity(line.quantity)
    resolved.push({
      product,
      quantity,
      lineTotal: product.price_ugx === null ? null : product.price_ugx * quantity,
    })
  }
  return resolved
}

/** Lines whose product is no longer published — reported, never silently kept. */
export function missingLines(stored: StoredLine[], published: CatalogProduct[]): StoredLine[] {
  const ids = new Set(published.map((product) => product.id))
  return stored.filter((line) => !ids.has(line.product_id))
}

export function summarize(lines: EnquiryLine[]): { items: number; totalUgx: number; hasUnpriced: boolean } {
  let totalUgx = 0
  let hasUnpriced = false
  for (const line of lines) {
    if (line.lineTotal === null) hasUnpriced = true
    else totalUgx += line.lineTotal
  }
  return { items: countItems(lines), totalUgx, hasUnpriced }
}

export type MessageInput = {
  businessName: string
  lines: EnquiryLine[]
  note?: string
}

/**
 * One plain-text WhatsApp message listing exactly what was chosen, at the
 * prices currently published. Nothing is claimed beyond that: the total is a
 * sum of listed prices, delivery is not included, and it is an enquiry.
 */
export function buildEnquiryMessage({ businessName, lines, note = '' }: MessageInput): string {
  const shop = businessName.trim() || 'PURITY SKIN'
  const { totalUgx, hasUnpriced } = summarize(lines)
  const parts: string[] = [`Hello ${shop}, I would like to check these items:`]

  lines.forEach((line, index) => {
    const size = line.product.size_label ? ` — ${line.product.size_label}` : ''
    const price = line.lineTotal === null ? 'price to be confirmed' : formatUGX(line.lineTotal)
    const each = line.quantity > 1 && line.product.price_ugx !== null ? ` (${formatUGX(line.product.price_ugx)} each)` : ''
    parts.push(`${index + 1}. ${line.product.name}${size} — ${line.quantity} × ${price}${each}`)
  })

  if (hasUnpriced && totalUgx === 0) {
    // Nothing in the list has a published price: do not print a fake UGX 0 total.
    parts.push('None of these items has a published price yet — please confirm the prices with me.')
  } else {
    const totalLabel = hasUnpriced ? 'Total of the prices listed so far' : 'Total of listed prices'
    parts.push(`${totalLabel}: ${formatUGX(totalUgx)} — delivery is not included.`)
    if (hasUnpriced) parts.push('One item has no published price yet; please confirm it with me.')
  }

  const cleanNote = note.trim().replace(/\s+/g, ' ').slice(0, MAX_NOTE)
  if (cleanNote) parts.push(`My note: ${cleanNote}`)

  parts.push('This is an enquiry, not a paid order.')
  return parts.join('\n')
}

function sanitizeNote(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_NOTE) : ''
}

function sanitizeLines(value: unknown): StoredLine[] {
  if (!Array.isArray(value)) return []
  const lines: StoredLine[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const id = typeof record.product_id === 'string' ? record.product_id : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    lines.push({
      product_id: id,
      name: typeof record.name === 'string' ? record.name.slice(0, 80) : '',
      quantity: clampQuantity(record.quantity),
    })
    if (lines.length >= MAX_LINES) break
  }
  return lines
}

/** Saved list, sanitised. A corrupt entry is dropped, never thrown. */
export function loadEnquiry(storage?: Pick<Storage, 'getItem'>): StoredEnquiry {
  const store = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)
  if (!store) return emptyEnquiry()
  try {
    const raw = store.getItem(ENQUIRY_KEY)
    if (!raw) return emptyEnquiry()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return emptyEnquiry()
    const record = parsed as Record<string, unknown>
    return { version: 1, note: sanitizeNote(record.note), lines: sanitizeLines(record.lines) }
  } catch {
    return emptyEnquiry()
  }
}

export function saveEnquiry(value: StoredEnquiry, storage?: Pick<Storage, 'setItem'>): boolean {
  const store = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)
  if (!store) return false
  try {
    store.setItem(ENQUIRY_KEY, JSON.stringify({ version: 1, note: value.note, lines: value.lines }))
    return true
  } catch {
    return false
  }
}
