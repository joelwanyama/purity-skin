/**
 * CLI wrapper: `node scripts/prerender.mjs` (runs as part of `npm run build`).
 * Set SITE_ORIGIN to prerender for a different host, e.g. a custom domain.
 * The logic lives in scripts/lib/prerender.mjs so it can be unit tested.
 */
import { DEFAULT_ORIGIN, prerender } from './lib/prerender.mjs'

prerender({ origin: process.env.SITE_ORIGIN || DEFAULT_ORIGIN })
