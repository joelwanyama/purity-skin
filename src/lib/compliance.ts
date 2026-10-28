import type { CatalogProduct, ComplianceField, ComplianceKey, ComplianceValue, ProductCompliance } from '../catalog/types'

/**
 * The UNBS / PDPO record, in the two directions it is used.
 *
 * Owner direction — `complianceNotes()`: what is missing or unconfirmed, worded
 * for the dashboard, most urgent first. This list is the point of the feature:
 * the shop does not certify anything, it only repeats what the owner checked.
 *
 * Shopper direction — `customerFacingCompliance()`: what may be shown on the
 * product page. A row needs a value, a confirmation date, customer display
 * switched on, and a value that is safe to state in public.
 */

export const COMPLIANCE_LABELS: Record<ComplianceKey, string> = {
  qmark_status: 'UNBS Q-Mark',
  manufacturer: 'Manufacturer',
  batch_lot: 'Batch / lot',
  expiry: 'Expiry',
}

export const QMARK_LABELS: Record<Exclude<ComplianceValue, ''>, string> = {
  verified: 'Seen on the pack',
  not_applicable: 'Not applicable to this product',
  unverified: 'Not found on the pack',
}

const emptyField = (): ComplianceField => ({ value: '', confirmed_on: null })

export function emptyCompliance(): ProductCompliance {
  return {
    qmark_status: emptyField(),
    manufacturer: emptyField(),
    batch_lot: emptyField(),
    expiry: emptyField(),
    show_to_customers: false,
  }
}

const KEYS: ComplianceKey[] = ['qmark_status', 'manufacturer', 'batch_lot', 'expiry']

function fieldOf(compliance: ProductCompliance | undefined, key: ComplianceKey): ComplianceField {
  const field = compliance?.[key]
  return { value: String(field?.value ?? '').trim(), confirmed_on: field?.confirmed_on ?? null }
}

/** Does this product carry any compliance record at all? */
export function hasComplianceRecord(product: Pick<CatalogProduct, 'compliance'>): boolean {
  const compliance = product.compliance
  if (!compliance) return false
  return KEYS.some((key) => fieldOf(compliance, key).value !== '') || compliance.show_to_customers === true
}

export type ComplianceNote = {
  key: ComplianceKey | 'show_to_customers'
  level: 'record' | 'confirm' | 'warning'
  title: string
  detail: string
}

/**
 * Owner-facing notes, in priority order: things that would put a wrong claim in
 * front of a customer come first, then unconfirmed values, then the plain gaps.
 * Nothing is ever filled in by us — every note asks the owner to look at a pack.
 */
export function complianceNotes(product: Pick<CatalogProduct, 'compliance' | 'status' | 'name'>): ComplianceNote[] {
  const compliance = product.compliance ?? emptyCompliance()
  const notes: ComplianceNote[] = []

  for (const key of KEYS) {
    const { value, confirmed_on } = fieldOf(compliance, key)
    const label = COMPLIANCE_LABELS[key]

    if (key === 'qmark_status' && value === 'unverified') {
      notes.push({
        key,
        level: 'warning',
        title: 'Q-Mark not found on the pack',
        detail: 'The shop will never say this product is Q-Mark certified. If UNBS seizures are a concern in your area, ask your supplier in writing before you keep selling it.',
      })
      continue
    }

    if (value && !confirmed_on) {
      notes.push({
        key,
        level: 'confirm',
        title: `${label} is recorded but not confirmed`,
        detail: 'It stays hidden from customers until you confirm you read it off the physical pack.',
      })
      continue
    }

    if (!value) {
      notes.push({
        key,
        level: 'record',
        title: `${label} not recorded`,
        detail:
          key === 'qmark_status'
            ? 'Look for the Q-Mark on the pack and pick what you see. "Not found" is a valid answer and it is never shown to customers.'
            : 'Optional. If you record it and confirm it, customers see exactly what you read — nothing more.',
      })
      continue
    }

    if (key === 'expiry') {
      const expired = expiryState(value)
      if (expired === 'past') {
        notes.push({
          key,
          level: 'warning',
          title: 'Expiry date has passed',
          detail: 'Check the batch you actually have before you publish or sell this product.',
        })
      }
    }
  }

  if (!compliance.show_to_customers && KEYS.some((key) => fieldOf(compliance, key).confirmed_on)) {
    notes.push({
      key: 'show_to_customers',
      level: 'record',
      title: 'Confirmed details are hidden from customers',
      detail: 'You have confirmed at least one field. Switch customer display on when you are ready for the product page to show exactly those values.',
    })
  }

  return notes
}

/** 'past' | 'soon' | 'future' | 'unknown' — from a YYYY-MM value. */
export function expiryState(value: string, now = new Date()): 'past' | 'soon' | 'future' | 'unknown' {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim())
  if (!match) return 'unknown'
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || month < 1 || month > 12) return 'unknown'
  // An expiry month is the last month the product is good: it ends on its last day.
  const end = new Date(Date.UTC(year, month, 1))
  end.setUTCDate(end.getUTCDate() - 1)
  const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (end < nowUtc) return 'past'
  const soon = new Date(nowUtc)
  soon.setUTCDate(soon.getUTCDate() + 60)
  return end <= soon ? 'soon' : 'future'
}

export type ComplianceRow = { key: ComplianceKey; label: string; value: string }

/**
 * Exactly what a customer is allowed to see. Empty unless the owner recorded the
 * field, confirmed it on a date, and switched customer display on. "Not found on
 * the pack" is never published, because a negative statement about certification
 * is worse than silence.
 */
export function customerFacingCompliance(product: Pick<CatalogProduct, 'compliance' | 'status'>): ComplianceRow[] {
  const compliance = product.compliance
  if (!compliance?.show_to_customers) return []
  const rows: ComplianceRow[] = []
  for (const key of KEYS) {
    const { value, confirmed_on } = fieldOf(compliance, key)
    if (!value || !confirmed_on) continue
    if (key === 'qmark_status') {
      if (value !== 'verified' && value !== 'not_applicable') continue
      rows.push({ key, label: COMPLIANCE_LABELS[key], value: QMARK_LABELS[value as 'verified' | 'not_applicable'] })
      continue
    }
    if (key === 'expiry') {
      const state = expiryState(value)
      if (state === 'past') continue
      const [year, month] = value.split('-')
      const monthName = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
      rows.push({ key, label: COMPLIANCE_LABELS[key], value: `${monthName} ${year}` })
      continue
    }
    rows.push({ key, label: COMPLIANCE_LABELS[key], value })
  }
  return rows
}

/** A one-line count for the dashboard chips. */
export function complianceSummary(product: Pick<CatalogProduct, 'compliance'>): { recorded: number; confirmed: number; shown: number } {
  const compliance = product.compliance ?? emptyCompliance()
  let recorded = 0
  let confirmed = 0
  for (const key of KEYS) {
    const { value, confirmed_on } = fieldOf(compliance, key)
    if (value) recorded += 1
    if (value && confirmed_on) confirmed += 1
  }
  return { recorded, confirmed, shown: customerFacingCompliance({ compliance, status: 'published' }).length }
}

/** The latest date any field was confirmed, for the "as at" line. */
export function lastConfirmedOn(product: Pick<CatalogProduct, 'compliance'>): string | null {
  const compliance = product.compliance
  if (!compliance) return null
  const dates = KEYS.map((key) => fieldOf(compliance, key).confirmed_on).filter((date): date is string => Boolean(date))
  if (!dates.length) return null
  return dates.sort().at(-1) ?? null
}

/** Formats an ISO date as "12 Oct 2026" without depending on the device locale. */
export function formatConfirmedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
