/**
 * Catalogue domain types.
 *
 * This is the pre-Supabase source of truth for shop content. Field names stay
 * close to the planned Postgres columns (`price_ugx`, `image_path`,
 * `is_published`) so the swap to Supabase stays a small adapter change rather
 * than a rewrite. See docs/CATALOGUE.md.
 */

export type PhotoState = 'pending' | 'ready'
export type ProductStatus = 'draft' | 'published'

export type CatalogProduct = {
  /** Stable identifier. Locally generated; maps to `products.id` later. */
  id: string
  /** URL segment for /shop/:slug. Lowercase, hyphenated, unique. */
  slug: string
  name: string
  /** Plain product type, e.g. "Serum". Not a marketing claim. */
  category: string
  /** Size as printed on the pack, e.g. "30 ml". Never guessed. */
  size_label: string
  /** One-line description shown on cards. */
  summary: string
  description: string
  /** Whole shillings. Null until the owner sets a real price. */
  price_ugx: number | null
  /** Root-relative path or absolute https URL. Null while no photo exists. */
  image_path: string | null
  photo_state: PhotoState
  status: ProductStatus
  /** Honesty gate: owner has confirmed the product, size and price are real. */
  owner_confirmed: boolean
  /** Honesty gate: label wording, ingredients and claims have been checked. */
  claims_checked: boolean
  created_at: string
  updated_at: string
}

export type CatalogSettings = {
  business_name: string
  whatsapp_number: string
  location: string
  /** Short, owner-confirmed statement about delivery. Empty until confirmed. */
  delivery_summary: string
  updated_at: string
}

export type CatalogFile = {
  version: 1
  note: string
  settings: CatalogSettings
  products: CatalogProduct[]
}

export type CatalogSnapshot = {
  products: CatalogProduct[]
  settings: CatalogSettings
  /** Where this snapshot came from: the committed file or this browser. */
  source: 'committed' | 'browser'
  /** True when a browser-local override is active. */
  hasLocalChanges: boolean
}

export function isPublished(product: CatalogProduct): boolean {
  return product.status === 'published'
}
