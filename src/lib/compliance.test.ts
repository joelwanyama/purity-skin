import { describe, expect, it } from 'vitest'
import type { ProductCompliance } from '../catalog/types'
import {
  complianceNotes, complianceSummary, customerFacingCompliance, emptyCompliance,
  expiryState, formatConfirmedDate, hasComplianceRecord, lastConfirmedOn,
} from './compliance'

const complianceWith = (patch: Partial<ProductCompliance> = {}): ProductCompliance => ({
  ...emptyCompliance(),
  ...patch,
})

const product = (compliance: ProductCompliance | undefined, status: 'draft' | 'published' = 'published') => ({
  compliance,
  status,
  name: 'Sample Serum (test only)',
})

describe('owner notes', () => {
  it('starts with an empty record and says so, field by field', () => {
    const notes = complianceNotes(product(undefined))
    expect(notes.map((note) => note.key)).toEqual(['qmark_status', 'manufacturer', 'batch_lot', 'expiry'])
    expect(notes.every((note) => note.level === 'record')).toBe(true)
    expect(notes[0].detail).toMatch(/Q-Mark/)
  })

  it('asks for a confirmation when a value was typed but never checked', () => {
    const notes = complianceNotes(product(complianceWith({
      manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: null },
    })))
    const manufacturer = notes.find((note) => note.key === 'manufacturer')!
    expect(manufacturer.level).toBe('confirm')
    expect(manufacturer.title).toMatch(/recorded but not confirmed/i)
  })

  it('warns when the Q-Mark was looked for and not found', () => {
    const notes = complianceNotes(product(complianceWith({
      qmark_status: { value: 'unverified', confirmed_on: '2026-10-01T00:00:00.000Z' },
    })))
    const qmark = notes.find((note) => note.key === 'qmark_status')!
    expect(qmark.level).toBe('warning')
    expect(qmark.detail).toMatch(/never say this product is Q-Mark certified/i)
  })

  it('warns when the recorded expiry has already passed', () => {
    const notes = complianceNotes(product(complianceWith({
      expiry: { value: '2025-01', confirmed_on: '2025-01-01T00:00:00.000Z' },
    })))
    expect(notes.find((note) => note.key === 'expiry')?.level).toBe('warning')
  })

  it('reminds the owner to switch display on once something is confirmed', () => {
    const notes = complianceNotes(product(complianceWith({
      manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: '2026-10-01T00:00:00.000Z' },
    })))
    expect(notes.find((note) => note.key === 'show_to_customers')).toBeTruthy()
  })

  it('stops asking for a gap once it is recorded and confirmed', () => {
    const notes = complianceNotes(product(complianceWith({
      manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: '2026-10-01T00:00:00.000Z' },
    })))
    expect(notes.some((note) => note.key === 'manufacturer')).toBe(false)
  })
})

describe('what a customer may see', () => {
  const full: ProductCompliance = complianceWith({
    qmark_status: { value: 'verified', confirmed_on: '2026-10-01T00:00:00.000Z' },
    manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: '2026-10-01T00:00:00.000Z' },
    batch_lot: { value: 'B-2291', confirmed_on: '2026-10-01T00:00:00.000Z' },
    expiry: { value: '2027-04', confirmed_on: '2026-10-01T00:00:00.000Z' },
  })

  it('shows nothing at all while customer display is off', () => {
    expect(customerFacingCompliance(product(full))).toEqual([])
  })

  it('shows exactly the confirmed fields once the owner switches display on', () => {
    const rows = customerFacingCompliance(product({ ...full, show_to_customers: true }))
    expect(rows).toEqual([
      { key: 'qmark_status', label: 'UNBS Q-Mark', value: 'Seen on the pack' },
      { key: 'manufacturer', label: 'Manufacturer', value: 'Kampala Cosmetics Ltd' },
      { key: 'batch_lot', label: 'Batch / lot', value: 'B-2291' },
      { key: 'expiry', label: 'Expiry', value: 'Apr 2027' },
    ])
  })

  it('never publishes "not found on the pack"', () => {
    const rows = customerFacingCompliance(product({
      ...complianceWith({ qmark_status: { value: 'unverified', confirmed_on: '2026-10-01T00:00:00.000Z' } }),
      show_to_customers: true,
    }))
    expect(rows).toEqual([])
  })

  it('hides an unconfirmed value even when display is on', () => {
    const rows = customerFacingCompliance(product({
      ...complianceWith({ manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: null } }),
      show_to_customers: true,
    }))
    expect(rows).toEqual([])
  })

  it('hides an expiry that has already passed rather than advertising a dead batch', () => {
    const rows = customerFacingCompliance(product({
      ...complianceWith({ expiry: { value: '2024-02', confirmed_on: '2024-01-01T00:00:00.000Z' } }),
      show_to_customers: true,
    }))
    expect(rows).toEqual([])
  })

  it('shows "not applicable" as recorded instead of implying certification', () => {
    const rows = customerFacingCompliance(product({
      ...complianceWith({ qmark_status: { value: 'not_applicable', confirmed_on: '2026-10-01T00:00:00.000Z' } }),
      show_to_customers: true,
    }))
    expect(rows[0].value).toBe('Not applicable to this product')
  })
})

describe('expiry parsing', () => {
  const now = new Date('2026-10-29T00:00:00.000Z')

  it('treats the expiry month as the last good month', () => {
    expect(expiryState('2026-10', now)).toBe('soon')
    expect(expiryState('2026-09', now)).toBe('past')
    expect(expiryState('2026-12', now)).toBe('future')
  })

  it('returns unknown for anything that is not YYYY-MM', () => {
    for (const value of ['', '2026', '2026-13', 'soon', '2026-1-1']) expect(expiryState(value, now)).toBe('unknown')
  })
})

describe('summaries and formatting', () => {
  it('counts recorded, confirmed and shown separately', () => {
    const compliance = {
      ...complianceWith({
        manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: '2026-10-01T00:00:00.000Z' },
        batch_lot: { value: 'B-2291', confirmed_on: null },
      }),
      show_to_customers: true,
    }
    expect(complianceSummary({ compliance })).toEqual({ recorded: 2, confirmed: 1, shown: 1 })
  })

  it('finds the most recent confirmation date', () => {
    const compliance = complianceWith({
      manufacturer: { value: 'A', confirmed_on: '2026-10-01T00:00:00.000Z' },
      batch_lot: { value: 'B', confirmed_on: '2026-10-20T00:00:00.000Z' },
    })
    expect(lastConfirmedOn({ compliance })).toBe('2026-10-20T00:00:00.000Z')
    expect(lastConfirmedOn({ compliance: undefined })).toBeNull()
    expect(formatConfirmedDate('2026-10-20T00:00:00.000Z')).toBe('20 Oct 2026')
  })

  it('knows an empty record from a real one', () => {
    expect(hasComplianceRecord({ compliance: undefined })).toBe(false)
    expect(hasComplianceRecord({ compliance: emptyCompliance() })).toBe(false)
    expect(hasComplianceRecord({ compliance: { ...emptyCompliance(), show_to_customers: true } })).toBe(true)
    expect(hasComplianceRecord({ compliance: complianceWith({ expiry: { value: '2027-04', confirmed_on: null } }) })).toBe(true)
  })
})
