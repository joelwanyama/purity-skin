import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { CatalogProvider } from './catalog/CatalogProvider'
import { PublicLayout } from './components/PublicLayout'
import { hasSupabaseConfig } from './lib/supabase'
import { About } from './pages/About'
import { Customers } from './pages/Customers'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { HowToOrder } from './pages/HowToOrder'
import { Inventory } from './pages/Inventory'
import { NotFound } from './pages/NotFound'
import { Orders } from './pages/Orders'
import { OwnerLogin } from './pages/OwnerLogin'
import { OwnerResetPassword } from './pages/OwnerResetPassword'
import { OwnerShell } from './pages/OwnerShell'
import { Policies } from './pages/Policies'
import { ProductDetail } from './pages/ProductDetail'
import { Products } from './pages/Products'
import { Shop } from './pages/Shop'
import { Studio } from './pages/Studio'
import './index.css'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

function OwnerRoutes() {
  const { user, loading } = useAuth()
  if (!hasSupabaseConfig) return <OwnerLogin configurationMissing />
  if (loading) return <main className="center-state" aria-live="polite"><span className="spinner" aria-hidden="true" />Checking owner session…</main>
  if (!user) return <OwnerLogin />
  return <OwnerShell><Outlet /></OwnerShell>
}

export default function App() {
  return <CatalogProvider><BrowserRouter><ScrollToTop /><AuthProvider><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/shop/:slug" element={<ProductDetail />} />
      <Route path="/how-to-order" element={<HowToOrder />} />
      <Route path="/about" element={<About />} />
      <Route path="/policies" element={<Policies />} />
      <Route path="/studio/catalogue" element={<Studio />} />
      <Route path="*" element={<NotFound />} />
    </Route>
    <Route path="/owner/reset-password" element={<OwnerResetPassword />} />
    <Route path="/owner" element={<OwnerRoutes />}>
      <Route index element={<Dashboard />} />
      <Route path="products" element={<Products />} />
      <Route path="inventory" element={<Inventory />} />
      <Route path="orders" element={<Orders />} />
      <Route path="customers" element={<Customers />} />
      <Route path="*" element={<Navigate to="/owner" replace />} />
    </Route>
  </Routes></AuthProvider></BrowserRouter></CatalogProvider>
}
