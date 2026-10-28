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

/**
 * The UNBS / PDPO record the owner keeps about a physical pack.
 *
 * Two rules hold everywhere:
 *  - nothing here is ever inferred, guessed or defaulted — an empty value means
 *    "not recorded", and an empty record shows nothing at all to shoppers;
 *  - a field reaches the shop only when the owner recorded it, confirmed it on a
 *    date, and switched customer display on. The dashboard shows the gaps first.
 */
export type ComplianceValue = '' | 'verified' | 'not_applicable' | 'unverified'

export type ComplianceField = {
  /** What the owner read off the pack. Empty string means not recorded. */
  value: string
  /** ISO date the owner confirmed this against the physical pack, or null. */
  confirmed_on: string | null
}

export type ComplianceKey = 'qmark_status' | 'manufacturer' | 'batch_lot' | 'expiry'

export type ProductCompliance = {
  /** UNBS Q-Mark: seen on the pack, not applicable, or not found. */
  qmark_status: ComplianceField
  /** Manufacturer or licence holder exactly as printed. */
  manufacturer: ComplianceField
  /** Batch or lot code exactly as printed. */
  batch_lot: ComplianceField
  /** Expiry as printed, stored as YYYY-MM. */
  expiry: ComplianceField
  /** Owner decision: show the confirmed values on the product page. */
  show_to_customers: boolean
}

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
  /**
   * Optional so catalogues written before this existed stay valid. Absent and
   * "empty" behave identically: nothing is shown to shoppers.
   */
  compliance?: ProductCompliance
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
