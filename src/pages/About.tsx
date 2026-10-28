import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { whatsappHref } from '../lib/format'
import { usePageMeta } from '../lib/pageMeta'

export function About() {
  usePageMeta({
    title: 'About the shop',
    description: 'A small skincare shop in Kampala: how the catalogue is kept honest, what we will not claim, and how your information is handled.',
    path: '/about',
  })
  const { settings } = useShopCatalog()
  const generalWa = whatsappHref(settings.whatsapp_number, 'Hello PURITY SKIN, I would like to know more about your products.')

  return <div className="page">
    <header className="page-header">
      <p className="section-kicker">ABOUT THE SHOP</p>
      <h1>Formulated to fix. Sold honestly.</h1>
      <p className="page-intro">{settings.business_name} is a skincare shop in {settings.location}. This page explains how the shop works and what we will and will not say about a product.</p>
    </header>

    <div className="two-column">
      <section className="info-block" aria-labelledby="approach">
        <h2 id="approach">The approach</h2>
        <p>We keep the range small and ask questions before we sell. When you message us, you are talking to someone who can tell you what a product is for, how it is used and what it is not going to do.</p>
        <p>This shop is deliberately plain: no countdown timers, no invented “only 2 left”, no reviews we wrote ourselves.</p>
      </section>

      <section className="info-block" aria-labelledby="catalogue">
        <h2 id="catalogue">How the catalogue works</h2>
        <p>A product appears in the shop only when the name, pack size and price have been confirmed and an approved photo exists. If a listing is not ready, the shop shows fewer products rather than placeholder prices.</p>
        <p>Prices are in Ugandan shillings. If a price changes, the listing is updated before the sale, not after.</p>
      </section>

      <section className="info-block" aria-labelledby="claims">
        <h2 id="claims">What we will not claim</h2>
        <p>We do not describe products as cures, treatments or permanent fixes. Those are medical claims and they need documentation we do not have. Where a product is described, the wording stays to what the product is and how it is used.</p>
        <p>Skincare results vary. Anyone with a skin condition, who is pregnant or who is using prescription treatment should speak to a qualified health professional.</p>
      </section>

      <section className="info-block" aria-labelledby="data">
        <h2 id="data">Your information</h2>
        <p>Browsing needs no account and no sign-up. If you message us, we keep only what is needed to answer you and complete an order. We do not sell your details.</p>
        <Link className="button button-quiet" to="/policies#privacy">Read the privacy section <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </section>
    </div>

    {generalWa && <div className="page-cta">
      <div><h2>Ask us anything.</h2><p>Product questions, availability, delivery — start with a message.</p></div>
      <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>
    </div>}
  </div>
}
