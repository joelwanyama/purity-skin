import { ArrowLeft, Compass } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePageMeta } from '../lib/pageMeta'

export function NotFound() {
  const location = useLocation()
  usePageMeta({ title: 'Page not found', description: 'That address is not part of the PURITY SKIN shop.', noindex: true })

  return <div className="page">
    <header className="page-header">
      <p className="section-kicker">404</p>
      <h1>That page does not exist.</h1>
      <p className="page-intro">
        Nothing is broken and no order was placed — the address <code className="inline-code">{location.pathname}</code> simply is not part of this site.
      </p>
    </header>
    <div className="empty-panel">
      <Compass size={22} aria-hidden="true" />
      <h2>Try one of these instead</h2>
      <p>The shop lists everything currently published. How-to-order explains the WhatsApp handoff in four steps.</p>
      <div className="empty-actions">
        <Link className="button button-primary" to="/shop">Go to the shop</Link>
        <Link className="button button-secondary" to="/">Back to the start</Link>
      </div>
      <Link className="button button-quiet" to="/how-to-order"><ArrowLeft size={15} aria-hidden="true" /> How ordering works</Link>
    </div>
  </div>
}
