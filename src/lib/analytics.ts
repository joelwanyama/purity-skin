/**
 * Counting, kept to the smallest thing that answers "is any of this working?".
 *
 * What this deliberately does not do:
 *  - no cookies, no localStorage identifier, no fingerprint, no IP stored by us;
 *  - no per-person journeys, no session reconstruction, no advertising pixels;
 *  - no third-party script until the owner pastes a Cloudflare Web Analytics
 *    beacon token into the build environment.
 *
 * Cloudflare's Web Analytics is cookieless and reports aggregate page views and
 * referrers only. Enquiries are not counted here: every enquiry is a WhatsApp
 * message, so the owner already has a better record of them than we could build.
 *
 * With no token, this module injects nothing and the site collects nothing.
 * docs/PRIVACY-ANALYTICS.md states exactly what is and is not collected.
 */

export const BEACON_ORIGIN = 'https://static.cloudflareinsights.com/beacon.min.js'

type Env = { VITE_CF_BEACON_TOKEN?: string }

/** The token baked in at build time, or an empty string. */
export function beaconToken(env: Env = (import.meta as unknown as { env?: Env }).env ?? {}): string {
  return String(env.VITE_CF_BEACON_TOKEN ?? '').trim()
}

const configuredToken = beaconToken()

/** True only when a real beacon token was present at build time. */
export const analyticsEnabled = Boolean(configuredToken)

/**
 * Adds the beacon once. Safe to call on every load: it no-ops without a token,
 * when already present, or outside a browser. The token is injectable so the
 * behaviour can be tested without pretending a build-time value exists.
 */
export function startAnalytics(options: { token?: string; doc?: Document } = {}): boolean {
  const token = (options.token ?? configuredToken).trim()
  const target = options.doc ?? (typeof document === 'undefined' ? null : document)
  if (!token) return false
  if (!target) return false
  if (target.querySelector('script[data-purity-analytics]')) return true
  const script = document.createElement('script')
  script.src = BEACON_ORIGIN
  script.defer = true
  script.dataset.purityAnalytics = 'on'
  script.setAttribute('data-cf-beacon', JSON.stringify({ token, spa: false }))
  target.head.append(script)
  return true
}
