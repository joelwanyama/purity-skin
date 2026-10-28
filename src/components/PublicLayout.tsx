import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { MessageCircle, Menu, X } from 'lucide-react'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { useEnquiry } from '../order/useEnquiry'
import { EnquiryBar } from './EnquiryBar'
import { whatsappHref } from '../lib/format'

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/how-to-order', label: 'How to order' },
  { to: '/about', label: 'About' },
  { to: '/policies', label: 'Policies' },
]

export function PublicLayout() {
  const { settings } = useShopCatalog()
  const { items } = useEnquiry()
  const [menuOpen, setMenuOpen] = useState(false)
  const generalWa = whatsappHref(settings.whatsapp_number, 'Hello PURITY SKIN, please tell me what is currently available.')

  return <div className={`store-page${items > 0 ? ' has-enquiry-bar' : ''}`}>
    <header className="store-header">
      <Link className="brand-lockup" to="/" aria-label="PURITY SKIN home">
        <span className="brand-monogram"><img src="/brand/purity-mark.png" alt="" width={39} height={39} /></span>
        <span><strong>{settings.business_name}</strong><small>FORMULATED TO FIX · KAMPALA</small></span>
      </Link>

      <nav className="store-nav" aria-label="Main navigation">
        {links.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
        <Link to="/owner">Owner sign-in</Link>
      </nav>

      <div className="header-actions">
        {generalWa && <a className="button button-primary header-cta" href={generalWa} target="_blank" rel="noreferrer">
          <MessageCircle size={17} aria-hidden="true" /> WhatsApp
        </a>}
        <button
          type="button"
          className="icon-button mobile-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {menuOpen && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
        {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>{link.label}</NavLink>)}
        <Link to="/owner" onClick={() => setMenuOpen(false)}>Owner sign-in</Link>
      </nav>}
    </header>

    <main id="main"><Outlet /></main>

    <footer className="store-footer">
      <div className="footer-brand">
        <span className="brand-monogram" aria-hidden="true"><img src="/brand/purity-mark.png" alt="" width={39} height={39} /></span>
        <span><strong>{settings.business_name}</strong><small>{settings.location} · FORMULATED TO FIX</small></span>
      </div>
      <div className="footer-columns">
        <div>
          <h2 className="footer-heading">Browse</h2>
          <Link to="/shop">Shop</Link>
          <Link to="/how-to-order">How to order</Link>
          <Link to="/about">About</Link>
        </div>
        <div>
          <h2 className="footer-heading">Practical</h2>
          <Link to="/policies">Policies</Link>
          <Link to="/policies#privacy">Privacy</Link>
          <Link to="/owner">Owner sign-in</Link>
        </div>
        <div>
          <h2 className="footer-heading">Contact</h2>
          {generalWa
            ? <a href={generalWa} target="_blank" rel="noreferrer">WhatsApp us</a>
            : <span className="muted-note">Number to be confirmed</span>}
          <span className="muted-note">{settings.location}</span>
        </div>
      </div>
      <p className="footer-legal">No account needed to browse. Orders are confirmed with a real person on WhatsApp. This site does not take payment.</p>
    </footer>

    <EnquiryBar />
  </div>
}
