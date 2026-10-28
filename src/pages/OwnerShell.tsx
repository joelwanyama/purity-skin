import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { Boxes, ChartNoAxesCombined, CircleUserRound, ClipboardList, LogOut, Menu, Package, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const nav = [
  { to: '/owner', label: 'Overview', icon: ChartNoAxesCombined, end: true },
  { to: '/owner/orders', label: 'Orders', icon: ClipboardList },
  { to: '/owner/products', label: 'Products & prices', icon: Package },
  { to: '/owner/inventory', label: 'Stock room', icon: Boxes },
  { to: '/owner/customers', label: 'Customers', icon: CircleUserRound },
]

export function OwnerShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [setupError, setSetupError] = useState('')
  const pageLabel = nav.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))?.label ?? 'Overview'

  useEffect(() => {
    if (!supabase || !user) return
    let alive = true
    async function verifyOwnerProvisioning() {
      try {
        const [profile, settings] = await Promise.all([
          supabase!.from('profiles').select('id').eq('id', user!.id).maybeSingle(),
          supabase!.from('business_settings').select('user_id,is_store_owner').eq('user_id', user!.id).maybeSingle(),
        ])
        if (!alive) return
        const issue = profile.error ?? settings.error
        if (issue) { setSetupError('We could not verify this account for the owner workspace. Contact the account administrator.'); setReady(true); return }
        if (!profile.data || !settings.data?.is_store_owner) {
          setSetupError('This account has not been provisioned as the PURITY SKIN owner. Public customer sign-up does not grant business access.');
          setReady(true);
          return
        }
        setReady(true)
      } catch {
        if (alive) { setSetupError('Owner access could not be verified. Check your connection and contact the account administrator.'); setReady(true) }
      }
    }
    void verifyOwnerProvisioning()
    return () => { alive = false }
  }, [user])

  async function leave() { await signOut() }

  if (ready && setupError) return <main className="owner-login-page"><header className="login-top"><Link to="/" className="back-link">Back to the shop</Link><span className="brand-lockup"><span className="brand-monogram">PS</span><span><strong>PURITY SKIN</strong><small>PRIVATE OWNER WORKSPACE</small></span></span></header><section className="login-panel"><p className="section-kicker">PRIVATE ACCESS</p><h1>Owner access required.</h1><p className="login-intro">{setupError}</p><div className="modal-actions"><Link to="/" className="button button-secondary">Back to the shop</Link><button className="button button-primary" onClick={() => void leave()}><LogOut size={16} aria-hidden="true" /> Sign out</button></div></section></main>

  return <div className="owner-app">
    <header className="owner-topbar"><button className="mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button><a className="brand-lockup" href="/" aria-label="PURITY SKIN shop"><span className="brand-monogram">PS</span><span><strong>PURITY SKIN</strong><small>BUSINESS WORKSPACE</small></span></a><span className="topbar-current">{pageLabel}</span><div className="owner-user"><span className="owner-email">{user?.email}</span><button className="signout-button" onClick={() => void leave()}><LogOut size={16} aria-hidden="true" /><span>Sign out</span></button></div></header>
    <div className="owner-layout">
      <aside className={`owner-sidebar ${menuOpen ? 'open' : ''}`} aria-label="Owner navigation"><div className="sidebar-label">WORKSPACE</div><nav>{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav><div className="sidebar-spacer" /><div className="sidebar-privacy"><span className="privacy-dot" aria-hidden="true" />Private owner area</div></aside>
      <main className="owner-main" id="main">{!ready ? <div className="center-state"><span className="spinner" aria-hidden="true" />Verifying private owner access…</div> : children}</main>
    </div>
  </div>
}
