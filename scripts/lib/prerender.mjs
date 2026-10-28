/**
 * The prerenderer, as a plain function so it can be tested without publishing
 * anything.
 *
 * Why prerender at all: WhatsApp, Facebook, Google and most link unfurlers fetch
 * the HTML and never run JavaScript. A single-page app therefore previews the
 * same for every product — or not at all. These snapshots carry that product's
 * own title, price, photo and structured data, plus a readable <noscript>
 * summary. Real visitors still load the app, which renders the same product from
 * the same catalogue.
 *
 * Only the committed catalogue is used. A draft that exists solely in the
 * owner's browser is never published, because the build cannot see it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const DEFAULT_ORIGIN = 'https://purityskin.pages.dev'
export const SITE_NAME = 'PURITY SKIN'

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

const formatPrice = (value) =>
  `UGX ${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(value)}`

/** Products the public shop is allowed to show: published, named, with a slug. */
export function publishableProducts(catalogue) {
  return (catalogue?.products ?? []).filter(
    (product) =>
      product &&
      product.status === 'published' &&
      typeof product.slug === 'string' &&
      product.slug.trim() &&
      typeof product.name === 'string' &&
      product.name.trim(),
  )
}

/** Absolute URL for the 1200x630 share crop, when the photo pipeline made one. */
function shareImageFor(dist, origin, imagePath) {
  if (!imagePath || typeof imagePath !== 'string' || /^https:\/\//i.test(imagePath)) return null
  const sharePath = imagePath.replace(/\.(jpe?g|png)$/i, '-share.jpg')
  if (sharePath === imagePath) return null
  return existsSync(path.join(dist, sharePath.replace(/^\/+/, ''))) ? `${origin}${sharePath}` : null
}

/** Absolute URL for a photo, or null when the file is not actually in the build. */
function photoFor(dist, origin, imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return null
  const absolute = /^https:\/\//i.test(imagePath)
    ? imagePath
    : `${origin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
  if (absolute !== `${origin}${imagePath}` || /^https:\/\//i.test(imagePath)) {
    if (/^https:\/\//i.test(imagePath) && !imagePath.startsWith(origin)) return absolute
  }
  return existsSync(path.join(dist, imagePath.replace(/^\/+/, ''))) ? absolute : null
}

/** Swap the head metadata for this page. Everything else stays as built. */
function withMeta(template, meta) {
  const {
    title, description, url, image, imageWidth = 1200, imageHeight = 630, imageType,
    type = 'website', jsonLd, noscript, businessName,
  } = meta
  let html = template
  const swap = (pattern, replacement) => {
    if (!pattern.test(html)) throw new Error(`prerender: template is missing the tag for ${pattern}`)
    html = html.replace(pattern, replacement)
  }

  swap(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  swap(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
  swap(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeHtml(url)}" />`)
  swap(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${type}" />`)
  swap(/<meta property="og:site_name" content="[^"]*" \/>/, `<meta property="og:site_name" content="${escapeHtml(businessName)}" />`)
  swap(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
  swap(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
  swap(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${escapeHtml(image)}" />`)
  swap(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escapeHtml(url)}" />`)
  swap(/<meta property="og:image:type" content="[^"]*" \/>/, `<meta property="og:image:type" content="${imageType ?? (/\.png$/i.test(image) ? 'image/png' : 'image/jpeg')}" />`)
  swap(/<meta property="og:image:width" content="[^"]*" \/>/, `<meta property="og:image:width" content="${imageWidth}" />`)
  swap(/<meta property="og:image:height" content="[^"]*" \/>/, `<meta property="og:image:height" content="${imageHeight}" />`)
  swap(/<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${escapeHtml(title)}" />`)
  swap(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
  swap(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
  swap(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${escapeHtml(image)}" />`)

  if (jsonLd) {
    html = html.replace('</head>', `    <script type="application/ld+json">${escapeJson(jsonLd)}</script>\n  </head>`)
  }
  if (noscript) {
    const block = `<noscript>\n      <div style="max-width:640px;margin:12vh auto;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F4EFEF;background:#0D0A0B">\n${noscript}\n      </div>\n    </noscript>`
    if (/<noscript>[\s\S]*?<\/noscript>/.test(html)) {
      html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, block)
    } else {
      html = html.replace('</body>', `  ${block}\n  </body>`)
    }
  }
  return html
}

/**
 * @param {object} options
 * @param {string} options.root project root (defaults to cwd)
 * @param {string} [options.origin] site origin used in absolute URLs
 * @param {object} [options.catalogue] catalogue object; read from the project when omitted
 */
export function prerender({ root = process.cwd(), origin = DEFAULT_ORIGIN, catalogue, log = console.log } = {}) {
  const dist = path.join(root, 'dist')
  const indexPath = path.join(dist, 'index.html')

  if (!existsSync(indexPath)) {
    throw new Error('prerender: dist/index.html is missing — run vite build first.')
  }

  const template = readFileSync(indexPath, 'utf8')
  let data = catalogue
  if (!data) {
    try {
      data = JSON.parse(readFileSync(path.join(root, 'src/catalog/catalog.data.json'), 'utf8'))
    } catch {
      log('prerender: catalogue could not be read; only /shop will be written.')
      data = { settings: {}, products: [] }
    }
  }

  const settings = data.settings ?? {}
  const businessName = (settings.business_name || SITE_NAME).trim() || SITE_NAME
  const whatsapp = settings.whatsapp_number ? escapeHtml(String(settings.whatsapp_number)) : ''
  const published = publishableProducts(data)
  const defaultImage = `${origin}/og.png`
  const urls = []
  let written = 0

  for (const product of published) {
    const slug = String(product.slug).trim()
    const size = String(product.size_label ?? '').trim()
    const price = Number.isInteger(product.price_ugx) && product.price_ugx > 0 ? product.price_ugx : null
    const priceLabel = price === null ? 'Price confirmed on WhatsApp' : formatPrice(price)
    const summary = String(product.summary || product.description || '').trim()
    const description = `${product.name}${size ? ` (${size})` : ''} — ${priceLabel}. ${summary}`.slice(0, 300)
    const url = `${origin}/shop/${slug}`
    const shareImage = shareImageFor(dist, origin, product.image_path)
    const photo = photoFor(dist, origin, product.image_path)
    const image = shareImage ?? photo ?? defaultImage

    // Structured data only when a confirmed whole-shilling price exists: a
    // "Product" with a guessed offer is exactly the invention we refuse to ship.
    const jsonLd = price === null ? undefined : {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: String(product.name),
      description: String(product.description || summary).slice(0, 500),
      sku: String(product.id ?? slug),
      brand: { '@type': 'Brand', name: businessName },
      ...(photo ? { image: [photo] } : {}),
      offers: {
        '@type': 'Offer',
        price: String(price),
        priceCurrency: 'UGX',
        availability: 'https://schema.org/InStock',
        url,
        seller: { '@type': 'Organization', name: businessName },
      },
    }

    const noscript = [
      `        <h1 style="font-size:24px;margin:0 0 12px">${escapeHtml(product.name)}</h1>`,
      `        <p style="line-height:1.6;color:#BDB2B6;margin:0 0 8px">${escapeHtml(priceLabel)}${size ? ` · ${escapeHtml(size)}` : ''}</p>`,
      summary ? `        <p style="line-height:1.6;color:#BDB2B6">${escapeHtml(summary)}</p>` : '',
      `        <p style="line-height:1.6;color:#BDB2B6">This shop needs JavaScript to show the full catalogue. You can still reach ${escapeHtml(businessName)} on WhatsApp${whatsapp ? ` at ${whatsapp}` : ''} to confirm availability, price and delivery.</p>`,
    ].filter(Boolean).join('\n')

    const html = withMeta(template, {
      title: `${product.name}${size ? ` ${size}` : ''} · ${businessName}`,
      description,
      url,
      image,
      // The share crop and the brand fallback are both 1200x630; a bare portrait
      // photo is 4:5, so declare whichever file we actually point at.
      imageWidth: 1200,
      imageHeight: shareImage || !photo || photo === defaultImage ? 630 : 1500,
      type: 'product',
      jsonLd,
      noscript,
      businessName,
    })

    // Written as shop/<slug>.html, not shop/<slug>/index.html: Cloudflare Pages
    // 308-redirects /shop/<slug> to /shop/<slug>/ when the page is a directory
    // index, and a canonical URL that redirects is a canonical URL wasted.
    mkdirSync(path.join(dist, 'shop'), { recursive: true })
    writeFileSync(path.join(dist, 'shop', `${slug}.html`), html, 'utf8')
    urls.push({ loc: url, changefreq: 'weekly', priority: '0.8' })
    written += 1
  }

  {
    const url = `${origin}/shop`
    const count = published.length
    const description = count
      ? `${count} ${count === 1 ? 'product' : 'products'} from ${businessName}, with confirmed prices in Ugandan shillings and a WhatsApp enquiry for each item.`
      : `Every ${businessName} product currently published, with confirmed prices in Ugandan shillings and a WhatsApp enquiry for each item.`
    const jsonLd = count ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${businessName} collection`,
      numberOfItems: count,
      itemListElement: published.slice(0, 50).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}/shop/${product.slug}`,
        name: String(product.name),
      })),
    } : undefined

    const html = withMeta(template, {
      title: `Shop the collection · ${businessName}`,
      description,
      url,
      image: defaultImage,
      jsonLd,
      noscript: `        <h1 style="font-size:24px;margin:0 0 12px">${escapeHtml(businessName)}</h1>\n        <p style="line-height:1.6;color:#BDB2B6">This shop needs JavaScript to show the collection. You can still reach us on WhatsApp${whatsapp ? ` at ${whatsapp}` : ''} and we will confirm availability, prices and delivery directly.</p>`,
      businessName,
    })
    writeFileSync(path.join(dist, 'shop.html'), html, 'utf8')
    written += 1
  }

  const sitemapPath = path.join(dist, 'sitemap.xml')
  if (existsSync(sitemapPath) && urls.length) {
    let sitemap = readFileSync(sitemapPath, 'utf8')
    const extra = urls
      .filter((entry) => !sitemap.includes(`<loc>${entry.loc}</loc>`))
      .map((entry) => `  <url><loc>${entry.loc}</loc><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`)
      .join('\n')
    if (extra) writeFileSync(sitemapPath, sitemap.replace('</urlset>', `${extra}\n</urlset>`), 'utf8')
  }

  const manifest = { origin, pages: written, products: published.map((product) => String(product.slug).trim()) }
  writeFileSync(path.join(dist, 'prerender.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  log(`prerender: wrote ${written} page${written === 1 ? '' : 's'} (${published.length} product${published.length === 1 ? '' : 's'})`)
  return manifest
}
