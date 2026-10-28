/**
 * Turns the shop's catalogue into a Meta/WhatsApp product feed (CSV) for
 * Commerce Manager, so the owner does not retype every product by hand.
 *
 * Field names follow Meta's commerce feed: id, title, description,
 * availability, condition, price, link, image_link, brand. Prices carry the
 * currency code, which is what Meta expects ("48000 UGX").
 *
 * Deliberate limits, so a feed can never advertise something the shop cannot
 * back up:
 *  - only published products are exported;
 *  - a product with no photo is skipped (Meta requires image_link) and reported;
 *  - a product without a confirmed price is skipped and reported;
 *  - no claims are invented: the description is exactly the owner's text.
 */

const HEADER = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'google_product_category',
]

/** RFC 4180 quoting: wrap when needed, double any inner quote. */
export function csvField(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function absoluteUrl(baseUrl, pathOrUrl) {
  if (!pathOrUrl) return ''
  if (/^https:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = String(baseUrl).replace(/\/+$/, '')
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

/**
 * @param {{ products: Array<object>, settings: { business_name?: string }, baseUrl: string }} input
 * @returns {{ csv: string, included: number, skipped: Array<{ name: string, reason: string }> }}
 */
export function toWhatsAppCatalogCsv({ products = [], settings = {}, baseUrl }) {
  if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
    throw new Error('baseUrl must be an absolute https URL so image links work in WhatsApp.')
  }
  const brand = (settings.business_name || 'PURITY SKIN').trim()
  const rows = []
  const skipped = []

  for (const product of products) {
    if (product.status !== 'published') continue
    if (product.price_ugx === null || !Number.isInteger(product.price_ugx) || product.price_ugx <= 0) {
      skipped.push({ name: product.name || product.id, reason: 'no confirmed price' })
      continue
    }
    if (!product.image_path) {
      skipped.push({ name: product.name || product.id, reason: 'no approved photo' })
      continue
    }
    const size = (product.size_label || '').trim()
    const title = (size ? `${product.name} — ${size}` : product.name).slice(0, 100)
    rows.push([
      product.slug || product.id,
      title,
      (product.description || product.summary || '').slice(0, 5000),
      'in stock',
      'new',
      `${product.price_ugx} UGX`,
      absoluteUrl(baseUrl, `/shop/${product.slug}`),
      absoluteUrl(baseUrl, product.image_path),
      brand,
      'Health & Beauty > Personal Care > Cosmetics > Skin Care',
    ].map(csvField).join(','))
  }

  const csv = `${[HEADER.join(','), ...rows].join('\n')}\n`
  return { csv, included: rows.length, skipped }
}
