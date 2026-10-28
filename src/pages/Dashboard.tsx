import { useEffect, useState } from 'react'
import { ArrowRight, AlertTriangle, ClipboardList, Package, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatEATDate, formatUGX } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/database.types'

type OrderSummary = { id: string; customer_name: string; total_ugx: number; status: string; created_at: string }
type Load = { busy: boolean; error: string; products: Product[]; recent: OrderSummary[]; monthOrders: OrderSummary[] }

function monthStartEAT() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value ?? '2026'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  return `${year}-${month}-01T00:00:00+03:00`
}

export function Dashboard() {
  const [data, setData] = useState<Load>({ busy: true, error: '', products: [], recent: [], monthOrders: [] })
  const [dateLabel] = useState(() => new Intl.DateTimeFormat('en-UG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Kampala' }).format(new Date()))

  async function load(showLoading = false) {
    if (!supabase) return
    if (showLoading) setData((current) => ({ ...current, busy: true, error: '' }))
    const [products, orders, month] = await Promise.all([
      supabase.from('products').select('*').order('name').limit(500),
      supabase.from('orders').select('id,customer_name,total_ugx,status,created_at').order('created_at', { ascending: false }).limit(8),
      supabase.from('orders').select('id,customer_name,total_ugx,status,created_at').gte('created_at', monthStartEAT()).neq('status', 'cancelled').limit(1000),
    ])
    const error = products.error ?? orders.error ?? month.error
    if (error) { setData({ busy: false, error: error.message, products: [], recent: [], monthOrders: [] }); return }
    setData({ busy: false, error: '', products: (products.data ?? []) as Product[], recent: orders.data ?? [], monthOrders: month.data ?? [] })
  }
  // oxlint-disable-next-line react/set-state-in-effect -- This effect starts the initial Supabase read; UI state changes only after its async response.
  useEffect(() => { void load() }, [])

  const lowStock = data.products.filter((product) => product.reorder_level > 0 && product.stock_on_hand <= product.reorder_level)
  const monthRevenue = data.monthOrders.reduce((total, order) => total + order.total_ugx, 0)

  return <div className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">OWNER OVERVIEW · {dateLabel.toUpperCase()}</p><h1>Good to see you.</h1><p>Here is what needs your attention in the business today.</p></div><button className="icon-button" onClick={() => void load(true)} aria-label="Refresh overview" disabled={data.busy}><RefreshCw size={17} aria-hidden="true" /></button></div>
    {data.error && <div className="notice-block error-block" role="alert"><strong>The overview could not load.</strong><span>{data.error}</span></div>}
    <div className="metric-strip" aria-label="Business summary">
      <section className="metric"><span>Sales this month</span><strong>{data.busy ? '…' : formatUGX(monthRevenue)}</strong><small>{data.monthOrders.length} recorded orders</small></section>
      <section className="metric"><span>Active shop listings</span><strong>{data.busy ? '…' : data.products.filter((product) => product.is_published).length}</strong><small>of {data.products.length} products</small></section>
      <section className="metric"><span>Stock alerts</span><strong>{data.busy ? '…' : lowStock.length}</strong><small>at or below reorder level</small></section>
    </div>
    <div className="dashboard-columns">
      <section className="data-panel"><div className="panel-heading"><div><p className="section-kicker">ACTION QUEUE</p><h2>Worth checking</h2></div><Link to="/owner/inventory" className="text-link">Stock room <ArrowRight size={15} aria-hidden="true" /></Link></div>
        {data.busy ? <p className="table-state">Loading stock…</p> : lowStock.length ? <div className="alert-list">{lowStock.slice(0, 8).map((product) => <div className="alert-row" key={product.id}><span className="alert-symbol"><AlertTriangle size={17} aria-hidden="true" /></span><span className="alert-name"><b>{product.name}</b><small>Reorder at {product.reorder_level} · on hand {product.stock_on_hand}</small></span><span className="status-pill status-warn">Check stock</span></div>)}</div> : <div className="empty-inline"><Package size={20} aria-hidden="true" /><p>{data.products.length ? 'No low-stock alerts. Check that reorder levels are set for each item.' : 'Your catalog is empty. Add products and set your reorder levels to start tracking stock.'}</p>{!data.products.length && <Link to="/owner/products" className="text-link">Add products <ArrowRight size={15} aria-hidden="true" /></Link>}</div>}
      </section>
      <section className="data-panel"><div className="panel-heading"><div><p className="section-kicker">ORDER DESK</p><h2>Recent orders</h2></div><Link to="/owner/orders" className="text-link">All orders <ArrowRight size={15} aria-hidden="true" /></Link></div>
        {data.busy ? <p className="table-state">Loading orders…</p> : data.recent.length ? <div className="recent-orders">{data.recent.map((order) => <div className="recent-row" key={order.id}><span className="order-token">{order.id.slice(0, 6).toUpperCase()}</span><span className="recent-who"><b>{order.customer_name || 'Walk-in'}</b><small>{formatEATDate(order.created_at)}</small></span><span className="recent-total">{formatUGX(order.total_ugx)}</span></div>)}</div> : <div className="empty-inline"><ClipboardList size={20} aria-hidden="true" /><p>No orders yet. Record each confirmed sale so the stock and sales picture stays reliable.</p><Link to="/owner/orders" className="text-link">Open order desk <ArrowRight size={15} aria-hidden="true" /></Link></div>}
      </section>
    </div>
    <p className="data-note">Dashboard figures come from recorded transactions only. They are not forecasts or guarantees.</p>
  </div>
}
