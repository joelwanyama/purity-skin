import type { CatalogFile, CatalogProduct, CatalogSettings, ComplianceField, ProductCompliance } from './types'

export type ValidationResult = { errors: string[]; warnings: string[] }

const MAX_NAME = 70
const MAX_SUMMARY = 120
const MAX_DESCRIPTION = 1200
const MIN_DESCRIPTION = 40
const MAX_PRICE = 100_000_000

/** Claim language that needs evidence before it can appear next to a price. */
const UNVERIFIED_CLAIM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bcures?\b/i, label: '"cure" claims need documented evidence' },
  { pattern: /\bheals?\b/i, label: '"heals" is a medical claim' },
  { pattern: /\btreats?\b/i, label: '"treats" is a medical claim' },
  { pattern: /\bpermanent(ly)?\b/i, label: '"permanent" is an unprovable claim' },
  { pattern: /\bguarantee[ds]?\b/i, label: 'guarantees need a stated, honoured policy' },
  { pattern: /\b100\s?%/i, label: '"100%" claims need proof' },
  { pattern: /\bdermatologist[- ](approved|tested)\b/i, label: 'clinical endorsement needs documentation' },
  { pattern: /\b(fda|who|nbs)\b/i, label: 'regulator reference needs documentation' },
  { pattern: /\bwhitens?\b|\bbleach/i, label: 'skin-lightening wording is regulated and needs review' },
]

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || 'product'
  const used = new Set(taken)
  if (!used.has(root)) return root
  let index = 2
  while (used.has(`${root}-${index}`)) index += 1
  return `${root}-${index}`
}

/** Image paths must be root-relative or absolute https. Nothing else is allowed. */
export function isSafeImagePath(value: string): boolean {
  if (!value.trim()) return false
  if (/^https:\/\/[^\s]+$/i.test(value)) return true
  return /^\/(?!\/)[^\s]*$/.test(value)
}

export function claimWarnings(text: string): string[] {
  const found: string[] = []
  for (const { pattern, label } of UNVERIFIED_CLAIM_PATTERNS) {
    if (pattern.test(text)) found.push(label)
  }
  return found
}

/**
 * Gate in front of publishing. A product cannot appear in the public shop until
 * it clears every error here; that is what keeps invented data off the site.
 */
export function validateProductForPublish(product: CatalogProduct): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const name = product.name.trim()
  if (name.length < 2) errors.push('Product name is required.')
  if (name.length > MAX_NAME) errors.push(`Product name must be ${MAX_NAME} characters or fewer.`)
  if (!product.category.trim()) errors.push('Product type is required (for example: Serum).')
  if (!product.size_label.trim()) errors.push('Pack size is required exactly as printed (for example: 30 ml).')

  if (product.price_ugx === null || !Number.isFinite(product.price_ugx)) {
    errors.push('A confirmed price in UGX is required.')
  } else if (!Number.isInteger(product.price_ugx) || product.price_ugx <= 0) {
    errors.push('Price must be a whole number of shillings above zero.')
  } else if (product.price_ugx > MAX_PRICE) {
    errors.push('Price looks like a typo; check the amount.')
  } else if (product.price_ugx < 100) {
    warnings.push('Price is under UGX 100 — confirm this is not a typo.')
  }

  const description = product.description.trim()
  if (description.length < MIN_DESCRIPTION) {
    errors.push(`Description needs at least ${MIN_DESCRIPTION} characters so customers know what they are buying.`)
  }
  if (description.length > MAX_DESCRIPTION) errors.push(`Description must be ${MAX_DESCRIPTION} characters or fewer.`)

  if (product.summary.trim().length > MAX_SUMMARY) errors.push(`Summary must be ${MAX_SUMMARY} characters or fewer.`)
  if (!product.summary.trim()) warnings.push('No short summary — cards will fall back to the description.')

  if (!product.owner_confirmed) errors.push('Confirm the name, pack size and price are real before publishing.')
  if (!product.claims_checked) errors.push('Confirm label wording and claims have been checked before publishing.')

  if (product.image_path && !isSafeImagePath(product.image_path)) {
    errors.push('Photo path must start with "/" or be a full https:// address.')
  }
  if (product.photo_state === 'pending' || !product.image_path) {
    warnings.push('No approved photo yet — the shop will show a photo slot.')
  }

  warnings.push(...claimWarnings(`${product.name} ${product.summary} ${product.description}`))
  return { errors, warnings }
}

export function canPublish(product: CatalogProduct): boolean {
  return validateProductForPublish(product).errors.length === 0
}

/** Drafts only need enough to be identifiable in the studio. */
export function validateProductDraft(product: CatalogProduct): ValidationResult {
  const errors: string[] = []
  if (!product.name.trim()) errors.push('Give the draft a name so you can find it later.')
  if (product.price_ugx !== null && (!Number.isInteger(product.price_ugx) || product.price_ugx < 0)) {
    errors.push('Price must be a whole number of shillings.')
  }
  return { errors, warnings: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asIsoDate(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value
  return new Date().toISOString()
}

const COMPLIANCE_KEYS = ['qmark_status', 'manufacturer', 'batch_lot', 'expiry'] as const

function asNullableDate(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value)) ? value : null
}

/**
 * Compliance values are never invented or defaulted: an unreadable field comes
 * back empty, which is exactly the "not recorded" state the dashboard shows.
 */
export function normalizeCompliance(value: unknown): ProductCompliance | undefined {
  if (!isRecord(value)) return undefined
  const field = (key: string): ComplianceField => {
    const raw = value[key]
    const record = isRecord(raw) ? raw : {}
    const text = asString(record.value).trim()
    const confirmed = text ? asNullableDate(record.confirmed_on) : null
    return { value: text, confirmed_on: confirmed }
  }
  // A catalogue with no compliance keys at all stays without the field, so its
  // JSON round-trips byte-for-byte and product pages render exactly as before.
  if (!COMPLIANCE_KEYS.some((key) => isRecord(value[key]))) return undefined
  return {
    qmark_status: field('qmark_status'),
    manufacturer: field('manufacturer'),
    batch_lot: field('batch_lot'),
    expiry: field('expiry'),
    show_to_customers: asBoolean(value.show_to_customers),
  }
}

function normalizeProduct(value: unknown, index: number, errors: string[]): CatalogProduct | null {
  if (!isRecord(value)) {
    errors.push(`Product ${index + 1}: not an object.`)
    return null
  }
  const name = asString(value.name).trim()
  const id = asString(value.id).trim() || `local-${index + 1}`
  const rawPrice = value.price_ugx
  let price: number | null = null
  if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) price = Math.round(rawPrice)
  else if (typeof rawPrice === 'string' && rawPrice.trim() !== '' && Number.isFinite(Number(rawPrice))) price = Math.round(Number(rawPrice))

  const imagePath = asString(value.image_path).trim()
  const photoState = value.photo_state === 'ready' ? 'ready' : 'pending'
  const status = value.status === 'published' ? 'published' : 'draft'

  const product: CatalogProduct = {
    id,
    slug: asString(value.slug).trim() || slugify(name) || `product-${index + 1}`,
    name,
    category: asString(value.category).trim(),
    size_label: asString(value.size_label).trim(),
    summary: asString(value.summary).trim(),
    description: asString(value.description).trim(),
    price_ugx: price,
    image_path: imagePath || null,
    photo_state: photoState,
    status,
    owner_confirmed: asBoolean(value.owner_confirmed),
    claims_checked: asBoolean(value.claims_checked),
    created_at: asIsoDate(value.created_at),
    updated_at: asIsoDate(value.updated_at),
  }
  const compliance = normalizeCompliance(value.compliance)
  if (compliance) product.compliance = compliance

  if (status === 'published') {
    const gate = validateProductForPublish(product)
    if (gate.errors.length) {
      // Imported data cannot sneak an unverified product into the public shop.
      product.status = 'draft'
      errors.push(`"${name || `Product ${index + 1}`}" was unpublished on import: ${gate.errors.join(' ')}`)
    }
  }
  return product
}

export function normalizeSettings(value: unknown): CatalogSettings {
  const record = isRecord(value) ? value : {}
  return {
    business_name: asString(record.business_name).trim() || 'PURITY SKIN',
    whatsapp_number: asString(record.whatsapp_number).replace(/[^\d]/g, ''),
    location: asString(record.location).trim() || 'Kampala, Uganda',
    delivery_summary: asString(record.delivery_summary).trim(),
    updated_at: asIsoDate(record.updated_at),
  }
}

export type ParseResult =
  | { ok: true; catalog: CatalogFile; warnings: string[] }
  | { ok: false; errors: string[] }

/**
 * Parses an imported or stored catalogue. Imported products that fail the
 * publish gate are demoted to drafts instead of being rejected outright.
 */
export function parseCatalog(value: unknown): ParseResult {
  if (!isRecord(value)) return { ok: false, errors: ['That file is not a catalogue object.'] }
  const productsValue = value.products
  if (!Array.isArray(productsValue)) return { ok: false, errors: ['The catalogue is missing a "products" list.'] }

  const errors: string[] = []
  const products: CatalogProduct[] = []
  productsValue.forEach((entry, index) => {
    const product = normalizeProduct(entry, index, errors)
    if (product) products.push(product)
  })

  const seenIds = new Set<string>()
  const seenSlugs = new Set<string>()
  for (const product of products) {
    if (seenIds.has(product.id)) errors.push(`Duplicate product id "${product.id}".`)
    seenIds.add(product.id)
    if (seenSlugs.has(product.slug)) {
      product.slug = uniqueSlug(product.slug, seenSlugs)
      errors.push(`Duplicate link "${product.slug}" was renamed to "${product.slug}".`)
    }
    seenSlugs.add(product.slug)
  }

  const settings = normalizeSettings(value.settings)
  if (settings.whatsapp_number.length < 9) {
    return { ok: false, errors: [...errors, 'The WhatsApp number needs at least 9 digits.'] }
  }

  return {
    ok: true,
    catalog: { version: 1, note: asString(value.note), settings, products },
    warnings: errors,
  }
}

export function createEmptyProduct(existingSlugs: Iterable<string>): CatalogProduct {
  const now = new Date().toISOString()
  return {
    id: `local-${Math.random().toString(36).slice(2, 10)}`,
    slug: uniqueSlug('new-product', existingSlugs),
    name: '',
    category: '',
    size_label: '',
    summary: '',
    description: '',
    price_ugx: null,
    image_path: null,
    photo_state: 'pending',
    status: 'draft',
    owner_confirmed: false,
    claims_checked: false,
    created_at: now,
    updated_at: now,
  }
}
