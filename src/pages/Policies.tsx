import { Link } from 'react-router-dom'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { analyticsEnabled } from '../lib/analytics'
import { usePageMeta } from '../lib/pageMeta'

export function Policies() {
  usePageMeta({
    title: 'Policies',
    description: 'Ordering, delivery, returns, claims, privacy and accessibility for the PURITY SKIN shop.',
    path: '/policies',
  })
  const { settings } = useShopCatalog()

  return <div className="page">
    <header className="page-header">
      <p className="section-kicker">POLICIES</p>
      <h1>How this shop actually works.</h1>
      <p className="page-intro">Last updated 28 October 2026. These pages describe the current shop, not an aspirational version of it. Anything not yet decided is described as not yet decided.</p>
    </header>

    <div className="policy-grid">
      <section className="info-block" id="ordering" aria-labelledby="ordering-title">
        <h2 id="ordering-title">Ordering and payment</h2>
        <ul className="plain-list">
          <li>Browsing needs no account. There is no cart and no online checkout.</li>
          <li>An order exists once you and PURITY SKIN have agreed it in writing on WhatsApp, including the item and the total.</li>
          <li>This website does not process payments and never asks for card or mobile-money details.</li>
          <li>Payment is made directly with PURITY SKIN after confirmation.</li>
          <li>A listed price is the price we confirmed. If a listing was wrong, we tell you before you pay rather than after.</li>
        </ul>
      </section>

      <section className="info-block" id="delivery" aria-labelledby="delivery-title">
        <h2 id="delivery-title">Delivery</h2>
        {settings.delivery_summary
          ? <p>{settings.delivery_summary}</p>
          : <p>Delivery areas, timing and fees are agreed in the conversation. We do not publish a flat fee that we have not confirmed with you.</p>}
        <p>If something cannot be delivered to your area, we say so before you pay.</p>
      </section>

      <section className="info-block" id="returns" aria-labelledby="returns-title">
        <h2 id="returns-title">Problems, returns and reactions</h2>
        <ul className="plain-list">
          <li>If an item arrives damaged, wrong or not what you agreed, contact us the same day with a photo and we will agree a replacement or refund.</li>
          <li>Opened skincare cannot be resold, so change-of-mind returns are not offered. Ask questions before ordering — we would rather talk you out of the wrong product.</li>
          <li>If you react to a product, stop using it and seek medical advice. Tell us as well so we can record it.</li>
        </ul>
      </section>

      <section className="info-block" id="claims" aria-labelledby="claims-title">
        <h2 id="claims-title">Product information and claims</h2>
        <ul className="plain-list">
          <li>We do not make medical claims. No cures, no permanent results, no guaranteed outcomes.</li>
          <li>Descriptions stick to what a product is, its pack size and how it is used.</li>
          <li>If you need ingredient detail for an allergy or a condition, ask before ordering and we will tell you what we can verify.</li>
          <li>Patch-test new products, and speak to a qualified health professional if you have a skin condition, are pregnant or are using prescription treatment.</li>
        </ul>
      </section>

      <section className="info-block" id="pack-record" aria-labelledby="pack-record-title">
        <h2 id="pack-record-title">What "what we checked on the pack" means</h2>
        <ul className="plain-list">
          <li>Some product pages show a short list: the UNBS Q-Mark, the manufacturer, the batch or lot code and the expiry month.</li>
          <li>Every one of those lines was read off the physical pack by PURITY SKIN and confirmed on the date printed beside it. Nothing on that list is copied from a wholesaler's website or filled in automatically.</li>
          <li>It is a record, not a certification. This website is not UNBS and cannot certify anything; it only repeats what was verified on the pack you are being sold.</li>
          <li>If a field is not shown, it is because it has not been verified — not because the product failed a test. Ask us in the chat and we will tell you what we can check.</li>
          <li>UNBS asks cosmetics buyers to look for the Q-Mark on the pack. When we have seen it we say so; when we have not seen it we say nothing at all rather than imply it.</li>
          <li>Always check the expiry date and batch on the pack when your order arrives, and tell us the same day if anything does not match.</li>
        </ul>
      </section>

      <section className="info-block" id="privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacy and your details</h2>
        <ul className="plain-list">
          <li>Browsing stores nothing about you on our servers beyond ordinary web-server logs.</li>
          <li>If you message us, we keep your name, number and the conversation so we can answer you and complete an order.</li>
          <li>We do not sell or rent your details, and we do not add you to marketing lists without asking.</li>
          <li>The catalogue editor on this site saves drafts in your own browser. It sends nothing anywhere.</li>
          <li>Ask us to delete your details and we will, unless we must keep a record of a completed sale.</li>
        </ul>
        <h3 className="info-subhead">Counting visits</h3>
        {analyticsEnabled
          ? <ul className="plain-list">
              <li>This shop counts visits with Cloudflare Web Analytics: a cookie-free service that reports daily totals and which page was opened. It sets no cookie, stores no identifier on your device and does not follow you to other sites.</li>
              <li>We see numbers — how many people opened the shop, which products were viewed — never who you are, and we cannot single anyone out.</li>
              <li>There is no advertising pixel, no social tracker and no profile of you. Nothing about your visit is sold or shared for marketing.</li>
              <li>Enquiries are not counted by the website at all. They reach us as WhatsApp messages, which is also the record we keep.</li>
            </ul>
          : <p>This shop does not run analytics, advertising pixels or cross-site trackers, and sets no cookies of its own. If aggregate visit counting is ever switched on it will be cookie-free and anonymous, it will be described here in plain words, and it will never identify a person.</p>}
      </section>

      <section className="info-block" id="accessibility" aria-labelledby="accessibility-title">
        <h2 id="accessibility-title">Accessibility</h2>
        <p>The shop is built to work on a small phone, with a keyboard, and with a screen reader. Text meets WCAG AA contrast, tap targets are at least 44 pixels, and animation is switched off when your device asks for reduced motion.</p>
        <p>If something is hard to use, tell us on WhatsApp and we will fix it or take your order another way.</p>
      </section>
    </div>

    <div className="page-cta">
      <div><h2>Something unclear?</h2><p>Ask about any of this before you order.</p></div>
      <Link className="button button-secondary" to="/how-to-order">How to order</Link>
    </div>
  </div>
}
