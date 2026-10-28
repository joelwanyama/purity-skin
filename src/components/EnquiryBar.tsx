import { useState } from 'react'
import { X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { formatUGX } from '../lib/format'
import { useEnquiry } from '../order/useEnquiry'

/**
 * A single, quiet reminder that something is waiting to be sent. It states only
 * that a list exists — never that stock is held or an order is placed.
 */
export function EnquiryBar() {
  const { items, totalUgx, hasUnpriced } = useEnquiry()
  const { pathname } = useLocation()
  // Dismissing remembers the size of the list, so any later change re-shows it.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)

  if (items === 0 || dismissedAt === items || pathname === '/enquiry') return null

  return <div className="enquiry-bar" role="region" aria-label="Your enquiry list">
    <div className="enquiry-bar-inner">
      <p className="enquiry-bar-copy" aria-live="polite">
        <strong>{items} {items === 1 ? 'item' : 'items'}</strong>
        <span>{formatUGX(totalUgx)}{hasUnpriced ? ' + one to be priced' : ''} · nothing paid online</span>
      </p>
      <div className="enquiry-bar-actions">
        <Link className="button button-primary button-small" to="/enquiry">Review enquiry</Link>
        <button
          type="button"
          className="icon-button enquiry-bar-close"
          onClick={() => setDismissedAt(items)}
          aria-label="Hide the enquiry reminder. Your list is kept."
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
}
