import { formatUGX } from '../lib/format'

/**
 * The owner's order ledger, kept in their own browser.
 *
 * Why local: a server-side customer record triggers PDPO registration duties and
 * a retention policy that does not exist yet (see docs/PRODUCT-RESEARCH.md §6).
 * A list in the owner's browser answers "what did I promise last Tuesday?"
 * without creating a database of customers.
 *
 * What it is not: a backup. Browsers lose data when storage is cleared, when a
 * private window closes, or when the phone is reset. The page says this plainly
 * and one CSV export is always two taps away.
 */

export const LEDGER_KEY = 'purity.ledger.v1'
export const LEDGER_STATUSES = ['new', 'confirmed', 'delivered', 'cancelled'] as const
export type LedgerStatus = (typeof LEDGER_STATUSES)[number]

export const STATUS_LABELS: Record<LedgerStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const MAX_ITEMS = 40
const MAX_ENTRIES = 500
const MAX_TEXT = 300

export type LedgerItem = {
  name: string
  /** Pack size exactly as it appeared in the message, when it did. */
  size: string
  quantity: number
  /** Line total as stated, or null when no price was given. */
  line_total_ugx: number | null
}

export type LedgerEntry = {
  id: string
  /** When the enquiry arrived (ISO). Editable, because the owner often logs late. */
  created_at: string
  /** The owner's own label for the buyer — a first name or a phone's name. */
  customer: string
  items: LedgerItem[]
  /** Total as understood at the time. Null when nothing was priced. */
  total_ugx: number | null
  status: LedgerStatus
  note: string
  source: 'paste' | 'manual'
}

/** Parses "UGX 48,000" / "48,000" / "48000" into whole shillings, or null. */
export function parseShillings(value: string): number | null {
  const match = /(\d[\d,\s]*)/.exec(value.replace(/ugx/i, ''))
  if (!match) return null
  const digits = match[1].replace(/[^\d]/g, '')
  if (!digits) return null
  const amount = Number(digits)
  return Number.isFinite(amount) ? amount : null
}

/**
 * Reads the message this shop itself generates on WhatsApp. Tolerant on
 * purpose — people forward it, trim it, or type it by hand — and honest about
 * failure: anything it cannot understand comes back as a manual entry, never as
 * a guess.
 */
export function parseEnquiryMessage(text: string): { items: LedgerItem[]; total_ugx: number | null; note: string } {
  const items: LedgerItem[] = []
  let total: number | null = null
  let note = ''

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const numbered = /^\d+[.)]\s*(.+)$/.exec(line)
    if (numbered) {
      // "1. Barrier Serum — 30 ml — 2 × UGX 96,000 (UGX 48,000 each)"
      // Strip only a trailing "(UGX 48,000 each)". A lazy wildcard here would
      // start at the first "(" and swallow a name like "Sample Serum (test only)".
      const body = numbered[1].replace(/\s*\([^()]*\beach\)\s*$/i, '').trim()
      const parts = body.split(/\s+—\s+/).map((part) => part.trim()).filter(Boolean)
      const name = parts[0] ?? ''
      if (!name) continue
      let size = ''
      let quantity = 1
      let lineTotal: number | null = null
      for (const part of parts.slice(1)) {
        const quantityMatch = /^(\d+)\s*[×x]\s*(.+)$/.exec(part)
        if (quantityMatch) {
          quantity = Math.max(1, Math.min(99, Number(quantityMatch[1])))
          lineTotal = parseShillings(quantityMatch[2])
          continue
        }
        const sizeMatch = /^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|mg|oz))\b/i.exec(part)
        if (sizeMatch) {
          size = sizeMatch[1].replace(/\s+/g, ' ')
          continue
        }
        // "price to be confirmed" and anything else unsupported: leave it unpriced.
      }
      items.push({ name: name.slice(0, 120), size, quantity, line_total_ugx: lineTotal })
      continue
    }

    const totalMatch = /^total(?:\s+of\s+[^:]+)?\s*:\s*(.+)$/i.exec(line)
    if (totalMatch) {
      total = parseShillings(totalMatch[1])
      continue
    }

    const noteMatch = /^my note\s*:\s*(.+)$/i.exec(line)
    if (noteMatch) {
      note = noteMatch[1].trim().slice(0, MAX_TEXT)
      continue
    }

    // A single-product enquiry reads "…I would like to ask about X (30 ml)."
    const askMatch = /i would like to ask about\s+(.+?)\s*\.?$/i.exec(line)
    if (askMatch && items.length === 0) {
      const body = askMatch[1].trim()
      const sizeMatch = /^(.*?)\s*\((\d+(?:\.\d+)?\s*(?:ml|l|g|kg|mg|oz))\)$/i.exec(body)
      items.push({
        name: (sizeMatch ? sizeMatch[1] : body).trim().slice(0, 120),
        size: sizeMatch ? sizeMatch[2] : '',
        quantity: 1,
        line_total_ugx: null,
      })
    }
  }

  const priced = items.length > 0 && items.every((item) => item.line_total_ugx !== null)
  if (total === null && priced) {
    total = items.reduce((sum, item) => sum + (item.line_total_ugx ?? 0), 0)
  }

  return { items: items.slice(0, MAX_ITEMS), total_ugx: total, note }
}

export function itemsTotal(items: LedgerItem[]): number | null {
  if (!items.length) return null
  if (items.some((item) => item.line_total_ugx === null)) return null
  return items.reduce((sum, item) => sum + (item.line_total_ugx ?? 0), 0)
}

/** "2 × Barrier Serum (30 ml) + 1 × Cleanser" — enough to recognise at a glance. */
export function describeItems(items: LedgerItem[]): string {
  if (!items.length) return 'No items recorded'
  return items
    .map((item) => `${item.quantity} × ${item.name}${item.size ? ` (${item.size})` : ''}`)
    .join(' + ')
    .slice(0, 220)
}

let counter = 0
function nextId(): string {
  counter += 1
  return `led-${Date.now().toString(36)}-${counter}`
}

export type NewEntryInput = {
  customer?: string
  items?: LedgerItem[]
  total_ugx?: number | null
  note?: string
  created_at?: string
  source?: 'paste' | 'manual'
}

export function createEntry(input: NewEntryInput, now = new Date()): LedgerEntry {
  const items = (input.items ?? []).slice(0, MAX_ITEMS)
  const explicitTotal = typeof input.total_ugx === 'number' && Number.isFinite(input.total_ugx) ? Math.max(0, Math.round(input.total_ugx)) : null
  return {
    id: nextId(),
    created_at: input.created_at && !Number.isNaN(Date.parse(input.created_at)) ? input.created_at : now.toISOString(),
    customer: (input.customer ?? '').trim().slice(0, 60),
    items,
    total_ugx: explicitTotal ?? itemsTotal(items),
    status: 'new',
    note: (input.note ?? '').trim().slice(0, MAX_TEXT),
    source: input.source ?? 'manual',
  }
}

/** Newest first; a tie keeps the most recently added at the top. */
export function sortEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

export function addEntry(entries: LedgerEntry[], entry: LedgerEntry): LedgerEntry[] {
  return sortEntries([entry, ...entries]).slice(0, MAX_ENTRIES)
}

export function setStatus(entries: LedgerEntry[], id: string, status: LedgerStatus): LedgerEntry[] {
  return entries.map((entry) => (entry.id === id ? { ...entry, status } : entry))
}

export function removeEntry(entries: LedgerEntry[], id: string): LedgerEntry[] {
  return entries.filter((entry) => entry.id !== id)
}

export type LedgerSummary = {
  open: number
  delivered: number
  cancelled: number
  /** Value of delivered entries only — money actually earned. */
  deliveredUgx: number
  /** Value of everything still open, i.e. promised but not finished. */
  pipelineUgx: number
  lastSevenDays: number
}

export function summarizeLedger(entries: LedgerEntry[], now = new Date()): LedgerSummary {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const summary: LedgerSummary = { open: 0, delivered: 0, cancelled: 0, deliveredUgx: 0, pipelineUgx: 0, lastSevenDays: 0 }
  for (const entry of entries) {
    const total = entry.total_ugx ?? 0
    if (entry.status === 'delivered') {
      summary.delivered += 1
      summary.deliveredUgx += total
    } else if (entry.status === 'cancelled') {
      summary.cancelled += 1
    } else {
      summary.open += 1
      summary.pipelineUgx += total
    }
    if (Date.parse(entry.created_at) >= weekAgo) summary.lastSevenDays += 1
  }
  return summary
}

const csvCell = (value: string | number | null): string => {
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** A spreadsheet copy of the ledger. Dates are ISO so sorting works anywhere. */
export function toCsv(entries: LedgerEntry[]): string {
  const header = ['date', 'customer', 'status', 'items', 'total_ugx', 'note', 'source']
  const rows = sortEntries(entries).map((entry) => [
    entry.created_at,
    entry.customer,
    entry.status,
    describeItems(entry.items),
    entry.total_ugx,
    entry.note,
    entry.source,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** Local calendar date (YYYY-MM-DD) — the owner's date, not UTC's. */
export function localDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Ledger CSV filename, e.g. purity-skin-orders-2026-10-29.csv */
export function csvFilename(now = new Date()): string {
  return `purity-skin-orders-${localDate(now)}.csv`
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function sanitizeItem(value: unknown): LedgerItem | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const name = clip(record.name, 120)
  if (!name) return null
  const rawTotal = record.line_total_ugx
  return {
    name,
    size: clip(record.size, 20),
    quantity: Math.max(1, Math.min(99, Math.trunc(Number(record.quantity)) || 1)),
    line_total_ugx: typeof rawTotal === 'number' && Number.isFinite(rawTotal) ? Math.max(0, Math.round(rawTotal)) : null,
  }
}

/** Storage is editable by hand and by old versions, so everything is re-checked. */
export function sanitizeEntries(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const entries: LedgerEntry[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const record = raw as Record<string, unknown>
    const id = clip(record.id, 60) || nextId()
    if (seen.has(id)) continue
    seen.add(id)
    const status = LEDGER_STATUSES.includes(record.status as LedgerStatus) ? (record.status as LedgerStatus) : 'new'
    const items = Array.isArray(record.items)
      ? record.items.map(sanitizeItem).filter((item): item is LedgerItem => item !== null)
      : []
    const rawTotal = record.total_ugx
    entries.push({
      id,
      created_at: typeof record.created_at === 'string' && !Number.isNaN(Date.parse(record.created_at))
        ? record.created_at
        : new Date().toISOString(),
      customer: clip(record.customer, 60),
      items,
      total_ugx: typeof rawTotal === 'number' && Number.isFinite(rawTotal) ? Math.max(0, Math.round(rawTotal)) : null,
      status,
      note: clip(record.note, MAX_TEXT),
      source: record.source === 'paste' ? 'paste' : 'manual',
    })
  }
  return sortEntries(entries).slice(0, MAX_ENTRIES)
}

export function loadLedger(storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): LedgerEntry[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(LEDGER_KEY)
    if (!raw) return []
    return sanitizeEntries(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveLedger(entries: LedgerEntry[], storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): boolean {
  if (!storage) return false
  try {
    storage.setItem(LEDGER_KEY, JSON.stringify(entries))
    return true
  } catch {
    return false
  }
}

/** The line the owner reads back after a paste, so nothing is logged unseen. */
export function describeEntryForConfirmation(entry: LedgerEntry): string {
  const total = entry.total_ugx === null ? 'no price yet' : formatUGX(entry.total_ugx)
  return `${describeItems(entry.items)} — ${total}`
}
