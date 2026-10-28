import { afterEach, describe, expect, it } from 'vitest'
import { BEACON_ORIGIN, analyticsEnabled, beaconToken, startAnalytics } from './analytics'

afterEach(() => {
  document.querySelectorAll('script[data-purity-analytics]').forEach((node) => node.remove())
})

describe('counting is off by default', () => {
  it('is off when no token was configured at build time', () => {
    expect(beaconToken({})).toBe('')
    expect(beaconToken()).toBe('')
    expect(analyticsEnabled).toBe(false)
    expect(startAnalytics()).toBe(false)
    expect(document.querySelector('script[data-purity-analytics]')).toBeNull()
  })

  it('ignores a blank or whitespace token', () => {
    expect(beaconToken({ VITE_CF_BEACON_TOKEN: '   ' })).toBe('')
    expect(startAnalytics({ token: '  ' })).toBe(false)
  })
})

describe('counting when the owner supplies a beacon token', () => {
  it('loads the Cloudflare beacon once, with the token', () => {
    expect(startAnalytics({ token: 'abc123' })).toBe(true)

    const scripts = document.querySelectorAll('script[data-purity-analytics]')
    expect(scripts).toHaveLength(1)
    const script = scripts[0] as HTMLScriptElement
    expect(script.src).toBe(BEACON_ORIGIN)
    expect(script.defer).toBe(true)
    expect(JSON.parse(script.getAttribute('data-cf-beacon') ?? '{}')).toEqual({ token: 'abc123', spa: false })

    // Calling twice must not add a second beacon.
    expect(startAnalytics({ token: 'abc123' })).toBe(true)
    expect(document.querySelectorAll('script[data-purity-analytics]')).toHaveLength(1)
  })

  it('sets no cookie and stores no identifier of its own', () => {
    const before = document.cookie
    startAnalytics({ token: 'abc123' })
    expect(document.cookie).toBe(before)
    expect(Object.keys(localStorage)).toEqual([])
    expect(Object.keys(sessionStorage)).toEqual([])
  })
})
