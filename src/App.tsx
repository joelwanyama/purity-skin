import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { hasSupabaseConfig } from './lib/supabase'
import { Storefront } from './pages/Storefront'
import { OwnerLogin } from './pages/OwnerLogin'
import { OwnerResetPassword } from './pages/OwnerResetPassword'
import { OwnerShell } from './pages/OwnerShell'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { Inventory } from './pages/Inventory'
import { Orders } from './pages/Orders'
import { Customers } from './pages/Customers'
import './index.css'

function OwnerRoutes() {
  const { user, loading } = useAuth()
  if (!hasSupabaseConfig) return <OwnerLogin configurationMissing />
  if (loading) return <main className="center-state" aria-live="polite"><span className="spinner" aria-hidden="true" />Checking owner session…</main>
  if (!user) return <OwnerLogin />
  return <OwnerShell><Outlet /></OwnerShell>
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<Storefront />} />
    <Route path="/owner/reset-password" element={<OwnerResetPassword />} />
    <Route path="/owner" element={<OwnerRoutes />}>
      <Route index element={<Dashboard />} />
      <Route path="products" element={<Products />} />
      <Route path="inventory" element={<Inventory />} />
      <Route path="orders" element={<Orders />} />
      <Route path="customers" element={<Customers />} />
      <Route path="*" element={<Navigate to="/owner" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
