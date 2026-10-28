import { ArrowUpRight, MessageCircle, Search, ShieldCheck, Truck, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { whatsappHref } from '../lib/format'
import { usePageMeta } from '../lib/pageMeta'

const steps = [
  { icon: Search, title: '1. Find the product', body: 'Browse the shop and open the product you are interested in. The price you see is the confirmed price, not an estimate.' },
  { icon: MessageCircle, title: '2. Message us', body: 'Tap “Add” on the products you want, open your enquiry, then send the list. The message arrives in our WhatsApp inbox with names, sizes and the listed prices already filled in.' },
  { icon: Truck, title: '3. Agree delivery', body: 'We confirm availability, where you are and how the item reaches you. Nothing is added to an automatic cart.' },
  { icon: Wallet, title: '4. Pay once confirmed', body: 'Payment is arranged directly with PURITY SKIN after you both agree the order and the total. This website never handles your money.' },
]

export function HowToOrder() {
  usePageMeta({
    title: 'How to order',
    description: 'Four steps from browsing to delivery: find the product, message us, agree delivery, pay once confirmed. This site never takes payment.',
    path: '/how-to-order',
  })
  const { settings } = useShopCatalog()
  const generalWa = whatsappHref(settings.whatsapp_number, 'Hello PURITY SKIN, I would like to place an order.')

  return <div className="page">
    <header className="page-header">
      <p className="section-kicker">HOW TO ORDER</p>
      <h1>Four steps, one conversation.</h1>
      <p className="page-intro">There is no checkout here on purpose. Skincare questions deserve a person, and a person confirms every order.</p>
    </header>

    <ol className="step-list step-list-wide">
      {steps.map((step) => <li key={step.title}>
        <span className="step-icon" aria-hidden="true"><step.icon size={18} /></span>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
      </li>)}
    </ol>

    <section className="info-block" aria-labelledby="what-to-send">
      <h2 id="what-to-send">What to include in your message</h2>
      <ul className="plain-list">
        <li>The product name and pack size you want — the enquiry list fills this in for you.</li>
        <li>The area or neighbourhood for delivery, so we can answer about delivery honestly.</li>
        <li>Anything relevant about your skin: sensitivity, allergies, or products you already use.</li>
        <li>Any question you want answered before you commit.</li>
      </ul>
    </section>

    <section className="info-block" aria-labelledby="delivery-info">
      <h2 id="delivery-info">Delivery and payment</h2>
      {settings.delivery_summary
        ? <p>{settings.delivery_summary}</p>
        : <p>Delivery areas, timing and any fee are confirmed in the conversation before you pay. We do not publish a delivery price we have not agreed with you.</p>}
      <p>Payment happens after confirmation, directly with PURITY SKIN. Because this site takes no payment, there is no card form, no saved wallet and nothing to charge by accident.</p>
    </section>

    <section className="info-block" aria-labelledby="safety-info">
      <h2 id="safety-info">Before you start a new product</h2>
      <p><ShieldCheck size={16} aria-hidden="true" /> Patch-test new products as you would any skincare. If you have a skin condition, are pregnant or are using prescription treatment, speak to a qualified health professional first. We will not promise a cure or a medical outcome, and we do not sell on that basis.</p>
      <Link className="button button-quiet" to="/policies">Read the full policies <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </section>

    {generalWa && <div className="page-cta">
      <div><h2>Ready when you are.</h2><p>Start with a question. There is no obligation to buy.</p></div>
      <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Message PURITY SKIN</a>
    </div>}
  </div>
}
