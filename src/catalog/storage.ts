import bundled from './catalog.data.json'
import { normalizeSettings, parseCatalog, slugify, uniqueSlug } from './validation'
import type { CatalogFile, CatalogProduct, CatalogSettings, CatalogSnapshot } from './types'

export const STORAGE_KEY = 'purity.catalog.v1'

/** The committed file. Parsed on load so a malformed edit cannot break the shop. */
export function committedCatalog(): CatalogFile {
  const result = parseCatalog(bundled)
  if (result.ok) return result.catalog
  return {
    version: 1,
    note: String(bundled.note ?? ''),
    settings: normalizeSettings(bundled.settings),
    products: [],
  }
}

function readLocal(): CatalogFile | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const result = parseCatalog(JSON.parse(raw) as unknown)
    return result.ok ? result.catalog : null
  } catch {
    return null
  }
}

export function loadSnapshot(): CatalogSnapshot {
  const local = readLocal()
  if (local) return { products: local.products, settings: local.settings, source: 'browser', hasLocalChanges: true }
  const commit = committedCatalog()
  return { products: commit.products, settings: commit.settings, source: 'committed', hasLocalChanges: false }
}

export function saveLocal(catalog: Pick<CatalogFile, 'products' | 'settings'>): { ok: boolean; error?: string } {
  if (typeof localStorage === 'undefined') return { ok: false, error: 'This browser cannot store drafts.' }
  const payload: CatalogFile = {
    version: 1,
    note: committedCatalog().note,
    settings: { ...catalog.settings, updated_at: new Date().toISOString() },
    products: catalog.products,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return { ok: true }
  } catch {
    return { ok: false, error: 'Draft could not be saved. The browser storage may be full or blocked.' }
  }
}

export function clearLocal(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

export function serializeCatalog(products: CatalogProduct[], settings: CatalogSettings): string {
  const payload: CatalogFile = {
    version: 1,
    note: committedCatalog().note,
    settings,
    products,
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function downloadCatalog(products: CatalogProduct[], settings: CatalogSettings): void {
  const blob = new Blob([serializeCatalog(products, settings)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'catalog.data.json'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function importCatalogText(text: string): { ok: true; catalog: CatalogFile; warnings: string[] } | { ok: false; errors: string[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['That file is not valid JSON.'] }
  }
  return parseCatalog(parsed)
}

export function publishedProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.filter((product) => product.status === 'published')
}

export function findPublishedBySlug(products: CatalogProduct[], slug: string): CatalogProduct | undefined {
  const wanted = slugify(slug)
  return publishedProducts(products).find((product) => product.slug === wanted)
}

export function categoriesOf(products: CatalogProduct[]): string[] {
  const seen = new Map<string, string>()
  for (const product of products) {
    const key = product.category.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, product.category.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function filterProducts(
  products: CatalogProduct[],
  { category = 'All', query = '' }: { category?: string; query?: string },
): CatalogProduct[] {
  const needle = query.trim().toLowerCase()
  return products.filter((product) => {
    if (category !== 'All' && product.category.toLowerCase() !== category.toLowerCase()) return false
    if (!needle) return true
    return `${product.name} ${product.category} ${product.summary} ${product.description}`.toLowerCase().includes(needle)
  })
}

export { uniqueSlug, slugify }
