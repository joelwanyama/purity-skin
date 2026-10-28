import { describe, expect, it } from 'vitest'
import { formatEATDate, formatUGX, whatsappHref } from './format'

describe('business formatting', () => {
  it('formats integer prices in UGX with no decimals', () => {
    expect(formatUGX(50000)).toBe('UGX 50,000')
    expect(formatUGX(null)).toBe('Set price')
  })
  it('uses Kampala time for business dates', () => {
    expect(formatEATDate('2026-10-28')).toMatch(/28 Oct 2026/)
    expect(formatEATDate('bad-date')).toBe('—')
  })
  it('creates an encoded WhatsApp link without leaking malformed characters', () => {
    expect(whatsappHref('+256 757 377 624', 'Ask about soap?')).toBe('https://wa.me/256757377624?text=Ask%20about%20soap%3F')
    expect(whatsappHref('', 'Hello')).toBeNull()
  })
})
