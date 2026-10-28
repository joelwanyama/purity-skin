import { useState } from 'react'
import { Minus, MessageCircle, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { formatUGX, whatsappHref } from '../lib/format'
import { usePageMeta } from '../lib/pageMeta'
import { MAX_QUANTITY, buildEnquiryMessage, summarize } from '../order/enquiry'
import { useEnquiry } from '../order/useEnquiry'

/**
 * The customer's own list, kept in this browser until they choose to send it.
 * Explicitly not a checkout: no stock is reserved, no payment is taken, and the
 * total is only the sum of the prices published on the site.
 */
export function Enquiry() {
  usePageMeta({
    title: 'Your enquiry',
    description: 'The products you want to ask PURITY SKIN about, sent as one WhatsApp message. Nothing is paid on this site.',
    path: '/enquiry',
    noindex: true,
  })

  const { settings } = useShopCatalog()
  const { lines, items, hasUnpriced, note, setNote, setQuantity, remove, clear, removed, dismissRemoved } = useEnquiry()
  const [confirmClear, setConfirmClear] = useState(false)

  const message = buildEnquiryMessage({ businessName: settings.business_name, lines, note })
  const sendHref = whatsappHref(settings.whatsapp_number, message)
  const totals = summarize(lines)

  if (lines.length === 0) {
    return <div className="page">
      <header className="page-header">
        <p className="section-kicker">ORDER ENQUIRY</p>
        <h1>Nothing on your list yet.</h1>
        <p className="page-intro">Add a product from the shop and it waits here until you send it. The list is kept in this browser only.</p>
      </header>
      <div className="empty-panel">
        <ShoppingBag size={22} aria-hidden="true" />
        <h2>Your enquiry is empty.</h2>
        <p>Browse the collection, add what you want to ask about, then send the whole list in one WhatsApp message.</p>
        <div className="empty-actions">
          <Link className="button button-primary" to="/shop">Go to the shop</Link>
          <Link className="button button-secondary" to="/how-to-order">How ordering works</Link>
        </div>
      </div>
    </div>
  }

  return <div className="page">
    <header className="page-header">
      <p className="section-kicker">ORDER ENQUIRY</p>
      <h1>Your enquiry.</h1>
      <p className="page-intro">
        Send this list to PURITY SKIN and a person confirms availability, delivery and the final total with you.
        Nothing is reserved by adding it here, and nothing is paid on this site.
      </p>
    </header>

    {removed.length > 0 && <div className="notice-row">
      <p>
        {removed.join(', ')} {removed.length === 1 ? 'is' : 'are'} no longer listed, so {removed.length === 1 ? 'it was' : 'they were'} removed from this list.
      </p>
      <button type="button" className="button button-quiet button-small" onClick={dismissRemoved}>Dismiss</button>
    </div>}

    <ul className="enquiry-list">
      {lines.map((line) => {
        const { product, quantity, lineTotal } = line
        return <li key={product.id} className="enquiry-line">
          <div className="enquiry-line-copy">
            <p className="card-meta">
              <span>{product.category || 'PURITY SKIN'}</span>
              {product.size_label && <span>{product.size_label}</span>}
            </p>
            <h2><Link to={`/shop/${product.slug}`}>{product.name}</Link></h2>
            <p className="enquiry-unit">
              {product.price_ugx === null
                ? 'Price to be confirmed with you'
                : `${formatUGX(product.price_ugx)} each${quantity > 1 ? ` · ${formatUGX(lineTotal ?? 0)} for ${quantity}` : ''}`}
            </p>
          </div>

          <div className="enquiry-line-controls">
            <div className="quantity" role="group" aria-label={`Quantity for ${product.name}`}>
              <button
                type="button"
                className="quantity-button"
                onClick={() => setQuantity(product.id, quantity - 1)}
                disabled={quantity <= 1}
                aria-label={`One fewer ${product.name}`}
              >
                <Minus size={14} aria-hidden="true" />
              </button>
              <output className="quantity-value" aria-live="polite">{quantity}</output>
              <button
                type="button"
                className="quantity-button"
                onClick={() => setQuantity(product.id, quantity + 1)}
                disabled={quantity >= MAX_QUANTITY}
                aria-label={`One more ${product.name}`}
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="button button-quiet button-small enquiry-remove"
              onClick={() => remove(product.id)}
            >
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          </div>
        </li>
      })}
    </ul>

    <section className="enquiry-summary" aria-labelledby="enquiry-summary-title">
      <div className="enquiry-maths">
        <h2 id="enquiry-summary-title">What happens next</h2>
        <dl className="enquiry-totals">
          <div><dt>Items</dt><dd>{items}</dd></div>
          <div>
            <dt>{hasUnpriced ? 'Total of the prices listed' : 'Total of listed prices'}</dt>
            <dd>{formatUGX(totals.totalUgx)}</dd>
          </div>
          <div><dt>Delivery</dt><dd>{settings.delivery_summary || 'Confirmed with you in the chat'}</dd></div>
        </dl>
        <p className="enquiry-fineprint">
          The total above is a sum of the prices published on this site. It is not an invoice: delivery, any fee and
          availability are confirmed by a person before you pay anything.
        </p>
      </div>

      <div className="enquiry-send">
        <label className="field">
          <span>Anything we should know? (optional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={400}
            placeholder="Delivery area, a question, or anything about your skin that matters."
          />
        </label>

        {sendHref
          ? <a className="button button-primary" href={sendHref} target="_blank" rel="noreferrer">
              <MessageCircle size={17} aria-hidden="true" /> Send this list on WhatsApp
            </a>
          : <p className="muted-note">The WhatsApp number is still being confirmed, so this list cannot be sent yet.</p>}

        <p className="enquiry-fineprint">
          Your list stays in this browser so you can send it again if WhatsApp does not open.
        </p>

        <div className="enquiry-secondary-actions">
          <Link className="button button-secondary button-small" to="/shop">Keep browsing</Link>
          {confirmClear
            ? <button type="button" className="button button-danger button-small" onClick={() => { clear(); setConfirmClear(false) }}>
                Clear {items} {items === 1 ? 'item' : 'items'} for good
              </button>
            : <button type="button" className="button button-quiet button-small" onClick={() => setConfirmClear(true)}>
                Clear list
              </button>}
        </div>
      </div>
    </section>
  </div>
}
