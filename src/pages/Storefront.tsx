import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, MessageCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { hasSupabaseConfig } from '../lib/supabase'
import type { Product } from '../lib/database.types'
import { formatUGX, whatsappHref } from '../lib/format'
import { supabase } from '../lib/supabase'

type PublicProduct = Pick<Product, 'id' | 'name' | 'category' | 'description' | 'price_ugx' | 'image_path'>
type StoreInfo = { business_name: string; whatsapp_number: string }
type LoadState = 'loading' | 'ready' | 'empty' | 'error' | 'unconfigured'

export function Storefront() {
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [state, setState] = useState<LoadState>(hasSupabaseConfig ? 'loading' : 'unconfigured')
  const [message, setMessage] = useState('')

  async function load() {
    if (!supabase) return
    try {
      const [catalog, profile] = await Promise.all([
        supabase.from('public_catalog').select('id,name,category,description,price_ugx,image_path').order('name'),
        supabase.from('public_business_profile').select('business_name,whatsapp_number').limit(1).maybeSingle(),
      ])
      if (catalog.error || profile.error) {
        setMessage('The shop request failed.')
        setState('error')
        return
      }
      setProducts((catalog.data ?? []) as PublicProduct[])
      setStore(profile.data)
      setState(catalog.data?.length ? 'ready' : 'empty')
    } catch {
      setMessage('The shop request could not reach the server.')
      setState('error')
    }
  }

  // oxlint-disable-next-line react/set-state-in-effect -- This effect starts the initial Supabase read; UI state changes only after its async response.
  useEffect(() => { void load() }, [])

  const businessName = store?.business_name || 'PURITY SKIN'
  const waNumber = store?.whatsapp_number || '256757377624'
  const generalWa = whatsappHref(waNumber, 'Hello PURITY SKIN, please tell me what is currently available.')

  return <div className="store-page">
    <header className="store-header">
      <a className="brand-lockup" href="#top" aria-label="PURITY SKIN home"><span className="brand-monogram">PS</span><span><strong>{businessName}</strong><small>FORMULATED TO FIX · KAMPALA</small></span></a>
      <nav aria-label="Main navigation" className="store-nav"><a href="#collection">Collection</a><a href="#how-to-order">How to order</a><Link to="/owner">Owner sign-in</Link></nav>
      {generalWa && <a className="button button-primary header-cta" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>}
    </header>

    <main id="main">
      <section id="top" className="store-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="location-line"><span className="location-mark" aria-hidden="true" /> KAMPALA · UGANDA</p>
          <h1 id="hero-title" aria-label="Skincare, made with intention">Skincare, made<br /><span>with intention.</span></h1>
          <p className="hero-body">Meet the PURITY SKIN collection. Browse what is currently listed, check the price, then ask us anything before you order.</p>
          <div className="hero-actions"><a className="button button-primary" href="#collection">Explore the collection <ArrowDown size={16} aria-hidden="true" /></a>{generalWa && <a className="button button-quiet" href={generalWa} target="_blank" rel="noreferrer">Ask us on WhatsApp <ArrowUpRight size={15} aria-hidden="true" /></a>}</div>
          <p className="hero-note">A real person confirms availability and delivery with you.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring" aria-hidden="true" /><div className="art-caption"><span>FORMULATED TO FIX</span><span>PS / KLA</span></div>
          <div className="art-mark" aria-hidden="true">PS</div>
          <p className="art-note">FORMULATED IN KAMPALA<br /><b>UGANDA</b></p>
        </div>
      </section>

      <section id="collection" className="collection-section" aria-labelledby="collection-title">
        <div className="section-title-row"><div><p className="section-kicker">THE CURRENT LINEUP</p><h2 id="collection-title">Find your next step.</h2></div><span className="collection-count">{state === 'ready' ? `${products.length} ${products.length === 1 ? 'item' : 'items'}` : 'PURITY SKIN'}</span></div>
        {!hasSupabaseConfig && <div className="shop-state"><p className="state-label">STORE SETUP IN PROGRESS</p><h3>The live collection is being prepared.</h3><p>For current availability and prices, message PURITY SKIN directly. We will not show sample products or guessed prices.</p>{generalWa && <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Ask what is available</a>}</div>}
        {state === 'loading' && <div className="shop-state" role="status"><span className="spinner" aria-hidden="true" /><p>Loading the current collection…</p></div>}
        {state === 'error' && <div className="shop-state" role="alert"><p className="state-label">SHOP UNAVAILABLE</p><h3>We could not load the catalog.</h3><p>Nothing is lost. Please try again or ask us on WhatsApp.</p><div className="state-actions"><button className="button button-secondary" onClick={() => { setState('loading'); void load() }}><RefreshCw size={16} aria-hidden="true" /> Try again</button>{generalWa && <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer">Contact PURITY SKIN</a>}</div><span className="sr-only">Technical detail: {message}</span></div>}
        {state === 'empty' && <div className="shop-state"><p className="state-label">CURRENT AVAILABILITY</p><h3>No products are listed online right now.</h3><p>Availability can change. Ask us directly and we will confirm what is ready to order.</p>{generalWa && <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Check availability</a>}</div>}
        {state === 'ready' && <div className="product-list">{products.map((product, index) => <article className="product-row" key={product.id}>
          <div className="product-visual">{product.image_path && supabase ? <img src={supabase.storage.from('catalog').getPublicUrl(product.image_path).data.publicUrl} alt={product.name} loading="lazy" /> : <div className="photo-pending"><span>PS</span><small>IMAGE<br />COMING SOON</small></div>}</div>
          <div className="product-details"><div className="product-meta"><span>{product.category || 'PURITY SKIN'}</span><span>0{index + 1}</span></div><h3>{product.name}</h3><p>{product.description || 'Ask us for product details and how to use.'}</p><div className="product-actions"><strong>{formatUGX(product.price_ugx)}</strong>{whatsappHref(waNumber, `Hello PURITY SKIN, I would like to ask about ${product.name}.`)
            ? <a className="button button-quiet" href={whatsappHref(waNumber, `Hello PURITY SKIN, I would like to ask about ${product.name}.`) || '#'} target="_blank" rel="noreferrer">Ask about this <ArrowUpRight size={15} aria-hidden="true" /></a> : <span className="muted-note">Contact details coming soon</span>}</div></div>
        </article>)}</div>}
      </section>

      <section id="how-to-order" className="order-note"><div><p className="section-kicker">A SIMPLE HANDOFF</p><h2>Questions first.<br />Order when ready.</h2></div><p>Choose an item and message us on WhatsApp. We confirm current availability, delivery details and the final order with you directly. Payment is arranged with PURITY SKIN; this website does not take payment.</p>{generalWa && <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Start a conversation</a>}</section>
    </main>

    <footer className="store-footer"><a className="footer-brand" href="#top">PURITY SKIN <span>· FORMULATED TO FIX</span></a><span>Kampala, Uganda</span><Link to="/owner">Owner sign-in</Link></footer>
  </div>
}
