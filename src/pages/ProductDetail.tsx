import { ArrowLeft, BadgeCheck, Check, MessageCircle, PackageCheck, Plus, ShieldQuestion, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ProductPhoto } from '../components/ProductPhoto'
import { findPublishedBySlug, publishedProducts } from '../catalog/storage'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { useEnquiry } from '../order/useEnquiry'
import { formatUGX, whatsappHref } from '../lib/format'
import { customerFacingCompliance, formatConfirmedDate, lastConfirmedOn } from '../lib/compliance'
import { usePageMeta } from '../lib/pageMeta'

export function ProductDetail() {
  const { slug = '' } = useParams()
  const { products, settings } = useShopCatalog()
  const { add, quantityOf } = useEnquiry()
  const product = findPublishedBySlug(products, slug)
  usePageMeta({
    title: product ? `${product.name}${product.size_label ? ` ${product.size_label}` : ''}` : 'Product not listed',
    description: product
      ? `${product.name}${product.size_label ? ` (${product.size_label})` : ''} — ${formatUGX(product.price_ugx)}. ${product.summary || 'Ask PURITY SKIN about this product on WhatsApp.'}`
      : 'This product is not currently listed in the PURITY SKIN shop.',
    path: product ? `/shop/${product.slug}` : '/shop',
    noindex: !product,
  })
  const generalWa = whatsappHref(settings.whatsapp_number, 'Hello PURITY SKIN, please tell me what is currently available.')

  if (!product) {
    return <div className="page">
      <header className="page-header">
        <p className="section-kicker">NOT IN THE SHOP</p>
        <h1>This product is not listed.</h1>
        <p className="page-intro">It may have been unpublished, or the link may be out of date. The current collection is the shortest way back.</p>
      </header>
      <div className="empty-panel">
        <PackageCheck size={22} aria-hidden="true" />
        <h2>Where next?</h2>
        <p>Browse everything that is published right now, or ask us directly whether this product is available.</p>
        <div className="empty-actions">
          <Link className="button button-primary" to="/shop">Go to the shop</Link>
          {generalWa && <a className="button button-secondary" href={generalWa} target="_blank" rel="noreferrer">Ask us</a>}
        </div>
      </div>
    </div>
  }

  const enquire = whatsappHref(settings.whatsapp_number, `Hello PURITY SKIN, I would like to ask about ${product.name}${product.size_label ? ` (${product.size_label})` : ''}.`)
  const related = publishedProducts(products).filter((item) => item.id !== product.id).slice(0, 3)
  // Only what the owner recorded, confirmed and chose to publish — see lib/compliance.ts.
  const packChecks = customerFacingCompliance(product)
  const confirmedOn = lastConfirmedOn(product)
  const inList = quantityOf(product.id)

  return <div className="page">
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="/shop"><ArrowLeft size={14} aria-hidden="true" /> Shop</Link>
      <span aria-hidden="true">/</span>
      <span>{product.category || 'PURITY SKIN'}</span>
    </nav>

    <article className="product-detail">
      <div className="detail-visual">
        <ProductPhoto name={product.name} imagePath={product.image_path} photoState={product.photo_state} variant="detail" priority />
        {product.photo_state !== 'ready' && <p className="photo-note">Photo not published yet. Ask us on WhatsApp and we will send a current photo of the product.</p>}
      </div>

      <div className="detail-copy">
        <p className="card-meta"><span>{product.category || 'PURITY SKIN'}</span>{product.size_label && <span>{product.size_label}</span>}</p>
        <h1>{product.name}</h1>
        <p className="detail-price">{formatUGX(product.price_ugx)}</p>
        {product.summary && <p className="detail-summary">{product.summary}</p>}
        <p className="detail-description">{product.description}</p>

        <div className="detail-actions">
          {enquire
            ? <a className="button button-primary" href={enquire} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Ask about this product</a>
            : <span className="muted-note">Contact details are being confirmed.</span>}
          {inList > 0
            ? <Link className="button button-secondary" to="/enquiry"><Check size={16} aria-hidden="true" /> In your enquiry · {inList}</Link>
            : <button
                type="button"
                className="button button-secondary"
                onClick={() => add(product)}
              ><Plus size={16} aria-hidden="true" /> Add to enquiry</button>}
        </div>
        <p className="detail-fineprint">Adding to the enquiry only builds a message. It does not reserve the item or take payment — <Link to="/how-to-order">how ordering works</Link>.</p>

        <dl className="detail-facts">
          <div><dt><Truck size={15} aria-hidden="true" /> Delivery</dt><dd>{settings.delivery_summary || 'Confirmed on WhatsApp before you pay.'}</dd></div>
          <div><dt><PackageCheck size={15} aria-hidden="true" /> Availability</dt><dd>Confirmed by a real person before payment.</dd></div>
          <div><dt><ShieldQuestion size={15} aria-hidden="true" /> Suitability</dt><dd>Tell us about sensitive skin, allergies or current treatment in the chat.</dd></div>
        </dl>

        {packChecks.length > 0 && <section className="detail-checks" aria-labelledby="pack-checks-title">
          <h2 id="pack-checks-title"><BadgeCheck size={16} aria-hidden="true" /> What we checked on the pack</h2>
          <dl>
            {packChecks.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
          </dl>
          <p className="detail-fineprint">
            {confirmedOn ? `Read off the pack and confirmed by us on ${formatConfirmedDate(confirmedOn)}. ` : ''}
            This is a record of what is printed on the pack — not a certification by this website, and no guarantee that a future batch is identical. <Link to="/policies#pack-record">What this means</Link>.
          </p>
        </section>}

        <p className="detail-disclaimer">If you have a skin condition, are pregnant or are using prescription treatment, speak to a qualified health professional before starting a new product.</p>
      </div>
    </article>

    {related.length > 0 && <section className="related-section" aria-labelledby="related-title">
      <div className="section-title-row"><div><p className="section-kicker">ALSO LISTED</p><h2 id="related-title">Others in the shop.</h2></div></div>
      <div className="product-grid">
        {related.map((item) => <ProductCardLite key={item.id} name={item.name} slug={item.slug} price={item.price_ugx} category={item.category} />)}
      </div>
    </section>}
  </div>
}

function ProductCardLite({ name, slug, price, category }: { name: string; slug: string; price: number | null; category: string }) {
  return <article className="product-card product-card-lite">
    <div className="card-body">
      <p className="card-meta"><span>{category || 'PURITY SKIN'}</span></p>
      <h3><Link to={`/shop/${slug}`}>{name}</Link></h3>
      <p className="card-price">{formatUGX(price)}</p>
    </div>
  </article>
}
