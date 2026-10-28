import { ArrowDown, ArrowUpRight, Check, MessageCircle, ShieldQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { publishedProducts } from '../catalog/storage'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { whatsappHref } from '../lib/format'
import { usePageMeta } from '../lib/pageMeta'

const steps = [
  { title: 'Browse what is listed', body: 'Only products with a confirmed price and an approved photo appear in the shop.' },
  { title: 'Ask on WhatsApp', body: 'One message starts a conversation with a real person about the product, your skin and delivery.' },
  { title: 'Confirm, then pay', body: 'Availability, delivery and the final amount are agreed in the chat before any money moves.' },
]

const promises = [
  'No invented products, prices or stock levels.',
  'No before/after or cure claims we cannot document.',
  'No payment taken on this website.',
  'No account needed to browse.',
]

export function Home() {
  usePageMeta({
    title: 'Skincare in Kampala, ordered on WhatsApp',
    description: 'Browse the PURITY SKIN collection, check confirmed prices in UGX, then order through WhatsApp. No account needed and no payment taken on this site.',
    path: '/',
  })
  const { products, settings } = useShopCatalog()
  const list = publishedProducts(products)
  const featured = list.slice(0, 3)
  const generalWa = whatsappHref(settings.whatsapp_number, 'Hello PURITY SKIN, please tell me what is currently available.')

  return <>
    <section id="top" className="store-hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="location-line"><span className="location-mark" aria-hidden="true" /> {settings.location.toUpperCase()}</p>
        <h1 id="hero-title" aria-label="Skincare, made with intention">Skincare, made<br /><span>with intention.</span></h1>
        <p className="hero-body">Browse the PURITY SKIN collection, check the price, then ask us anything before you order. Every listing is confirmed by us — nothing is guessed.</p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/shop">Explore the collection <ArrowDown size={16} aria-hidden="true" /></Link>
          {generalWa && <a className="button button-quiet" href={generalWa} target="_blank" rel="noreferrer">Ask us on WhatsApp <ArrowUpRight size={15} aria-hidden="true" /></a>}
        </div>
        <p className="hero-note">A real person confirms availability and delivery with you.</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-ring" />
        <div className="art-caption"><span>FORMULATED TO FIX</span><span>PS / KLA</span></div>
        <div className="art-mark">PS</div>
        <p className="art-note">FORMULATED IN KAMPALA<br /><b>UGANDA</b></p>
      </div>
    </section>

    <section className="collection-section" aria-labelledby="collection-title">
      <div className="section-title-row">
        <div><p className="section-kicker">THE CURRENT LINEUP</p><h2 id="collection-title">Find your next step.</h2></div>
        <span className="collection-count">{list.length ? `${list.length} ${list.length === 1 ? 'item' : 'items'}` : 'PURITY SKIN'}</span>
      </div>

      {list.length === 0 && <div className="shop-state">
        <p className="state-label">COLLECTION NOT PUBLISHED YET</p>
        <h3>The live collection is being prepared.</h3>
        <p>Products appear here only after the name, pack size, price and photo have been confirmed. We would rather show nothing than guess a price or publish a photo that is not ours.</p>
        {generalWa && <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Ask what is available</a>}
      </div>}

      {featured.length > 0 && <>
        <div className="product-grid">
          {featured.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}
        </div>
        <div className="section-foot"><Link className="button button-secondary" to="/shop">See the full collection <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      </>}
    </section>

    <section className="steps-section" aria-labelledby="steps-title">
      <div className="section-title-row">
        <div><p className="section-kicker">A SIMPLE HANDOFF</p><h2 id="steps-title">Questions first. Order when ready.</h2></div>
      </div>
      <ol className="step-list">
        {steps.map((step, index) => <li key={step.title}>
          <span className="step-number" aria-hidden="true">0{index + 1}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>)}
      </ol>
    </section>

    <section className="promise-section" aria-labelledby="promise-title">
      <div className="promise-copy">
        <p className="section-kicker">WHAT YOU CAN EXPECT</p>
        <h2 id="promise-title">Clear answers, or none at all.</h2>
        <p>Skincare advice is only useful when it is honest. Where we do not have documentation, we say so instead of borrowing a claim from somewhere else.</p>
        <Link className="button button-quiet" to="/policies">Read how we handle claims and data <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
      <ul className="promise-list">
        {promises.map((promise) => <li key={promise}><Check size={16} aria-hidden="true" /> {promise}</li>)}
      </ul>
      <div className="promise-foot">
        <ShieldQuestion size={18} aria-hidden="true" />
        <p>If you have a skin condition, are pregnant or are using prescription treatment, speak to a qualified health professional before starting a new product.</p>
      </div>
    </section>
  </>
}
