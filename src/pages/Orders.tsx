import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, CirclePlus, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import type { Customer, Product } from '../lib/database.types'
import { formatEATDate, formatUGX } from '../lib/format'
import { supabase } from '../lib/supabase'

type OrderRow = { id: string; customer_id: string | null; customer_name: string; customer_phone: string | null; status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'; payment_method: string; total_ugx: number; created_at: string }
type ItemRow = { id: string; product_name: string; quantity: number; unit_price_ugx: number; unit_cost_ugx: number | null }
type CartLine = { product_id: string; quantity: string }
type NewOrder = { customer_id: string; customer_name: string; customer_phone: string; payment_method: 'cash' | 'mobile_money' | 'bank' | 'other'; status: 'pending' | 'paid'; lines: CartLine[] }
const paymentLabel: Record<string,string> = { cash: 'Cash', mobile_money: 'Mobile Money', bank: 'Bank transfer', other: 'Other' }
const initialOrder = (productId = ''): NewOrder => ({ customer_id: '', customer_name: '', customer_phone: '', payment_method: 'mobile_money', status: 'pending', lines: [{ product_id: productId, quantity: '1' }] })

export function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<NewOrder | null>(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<OrderRow | null>(null)
  const [lines, setLines] = useState<ItemRow[]>([])
  const [detailBusy, setDetailBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(async (showLoading = false) => {
    if (!supabase) return
    if (showLoading) { setLoading(true); setError('') }
    const [o, p, c] = await Promise.all([
      supabase.from('orders').select('id,customer_id,customer_name,customer_phone,status,payment_method,total_ugx,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('products').select('*').order('name').limit(500),
      supabase.from('customers').select('*').order('full_name').limit(1000),
    ])
    const issue = o.error ?? p.error ?? c.error
    if (issue) setError(issue.message)
    else { setOrders((o.data ?? []) as OrderRow[]); setProducts((p.data ?? []) as Product[]); setCustomers((c.data ?? []) as Customer[]) }
    setLoading(false)
  }, [])
  // oxlint-disable-next-line react/set-state-in-effect -- This effect starts the initial Supabase read; UI state changes only after its async response.
  useEffect(() => { void load() }, [load])

  const saleable = products.filter((product) => product.price_ugx !== null)
  const filtered = orders.filter((order) => `${order.customer_name} ${order.id} ${order.status}`.toLowerCase().includes(query.toLowerCase()))
  const totalPreview = useMemo(() => draft?.lines.reduce((sum, line) => sum + (products.find((p) => p.id === line.product_id)?.price_ugx ?? 0) * Math.max(0, Number(line.quantity) || 0), 0) ?? 0, [draft, products])

  function startOrder() {
    if (!saleable.length) { setError('Add at least one product with a confirmed price before recording a sale.'); return }
    setError(''); setDraft(initialOrder(saleable[0].id))
  }
  function customerChanged(id: string) {
    const customer = customers.find((row) => row.id === id)
    setDraft((current) => current ? { ...current, customer_id: id, customer_name: customer?.full_name ?? '', customer_phone: customer?.phone ?? '' } : current)
  }
  function setLine(index: number, patch: Partial<CartLine>) { setDraft((current) => current ? { ...current, lines: current.lines.map((line, i) => i === index ? { ...line, ...patch } : line) } : current) }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !draft) return
    const items = draft.lines.map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity) }))
    if (items.some((item) => !item.product_id || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) { setError('Each line needs a product and a whole-number quantity of at least one.'); return }
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product || product.stock_on_hand < item.quantity) { setError(`Not enough stock for ${product?.name ?? 'that product'}. Recheck the stock room.`); return }
    }
    setSaving(true); setError('')
    const { error: saveError } = await supabase.rpc('create_sale_order', {
      p_customer_id: draft.customer_id || null,
      p_customer_name: draft.customer_name.trim() || 'Walk-in',
      p_customer_phone: draft.customer_phone.trim() || null,
      p_payment_method: draft.payment_method,
      p_status: draft.status,
      p_items: items,
    })
    setSaving(false)
    if (saveError) { setError(saveError.message); return }
    setDraft(null); await load()
  }

  async function openDetails(order: OrderRow) {
    if (!supabase) return
    setDetail(order); setDetailBusy(true); setLines([])
    const { data, error: detailError } = await supabase.from('order_items').select('id,product_name,quantity,unit_price_ugx,unit_cost_ugx').eq('order_id', order.id).order('created_at')
    setDetailBusy(false)
    if (detailError) setError(detailError.message); else setLines((data ?? []) as ItemRow[])
  }

  async function moveStatus(next: 'paid' | 'fulfilled' | 'cancelled', reason = '') {
    if (!supabase || !detail) return
    setStatusBusy(true); setError('')
    const { error: updateError } = await supabase.rpc('set_order_status', { p_order_id: detail.id, p_new_status: next, p_reason: reason || `Marked ${next}` })
    setStatusBusy(false)
    if (updateError) { setError(updateError.message); return }
    setDetail(null); await load()
  }

  return <div className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">CONFIRM · RECORD · FULFIL</p><h1>Order desk</h1><p>Recorded prices are snapshots. Recording a sale updates stock in the same transaction.</p></div><button className="button button-primary" onClick={startOrder}><Plus size={17} aria-hidden="true" /> Record order</button></div>
    <div className="metric-strip compact-metrics"><section className="metric"><span>Orders in view</span><strong>{loading ? '…' : orders.length}</strong><small>Most recent 200 records</small></section><section className="metric"><span>Awaiting payment</span><strong>{loading ? '…' : orders.filter((order) => order.status === 'pending').length}</strong><small>Follow up with customer</small></section><section className="metric"><span>Ready to fulfil</span><strong>{loading ? '…' : orders.filter((order) => order.status === 'paid').length}</strong><small>Payment recorded</small></section></div>
    {error && <div className="notice-block error-block" role="alert"><strong>Order action needs attention.</strong><span>{error}</span></div>}
    <section className="data-panel"><div className="panel-heading"><div><p className="section-kicker">SALES HISTORY</p><h2>Orders</h2></div><label className="search-field"><span className="sr-only">Search orders</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, order ID or status" /></label></div>
      {loading ? <p className="table-state">Loading orders…</p> : orders.length === 0 ? <div className="empty-panel"><ClipboardList size={24} aria-hidden="true" /><h3>No orders recorded yet.</h3><p>After you confirm an order with a customer, record it here. Stock and sales update together.</p><button className="button button-primary" onClick={startOrder}><CirclePlus size={16} aria-hidden="true" /> Record first order</button></div> : filtered.length === 0 ? <p className="table-state">No matching orders.</p> : <div className="table-scroll"><table className="owner-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE · EAT</th><th>PAYMENT</th><th>STATUS</th><th>TOTAL</th><th></th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}><td><span className="mono-token">{order.id.slice(0, 8).toUpperCase()}</span></td><td>{order.customer_name || 'Walk-in'}</td><td>{formatEATDate(order.created_at)}</td><td>{paymentLabel[order.payment_method] ?? order.payment_method}</td><td><span className={`status-pill status-${order.status}`}>{order.status}</span></td><td className="number-cell">{formatUGX(order.total_ugx)}</td><td><button className="text-link" onClick={() => void openDetails(order)}>Details <ArrowRight size={14} aria-hidden="true" /></button></td></tr>)}</tbody></table></div>}
    </section>
    {draft && <Modal title="Record confirmed order" onClose={() => setDraft(null)} width="wide"><form className="stack-form" onSubmit={create}>
      <div className="form-two"><label className="field"><span>Existing customer (optional)</span><select value={draft.customer_id} onChange={(e) => customerChanged(e.target.value)}><option value="">Walk-in / add details manually</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.full_name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select></label><label className="field"><span>Customer name</span><input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} maxLength={120} placeholder="Walk-in" /></label></div>
      <label className="field"><span>Customer phone · for this order</span><input type="tel" value={draft.customer_phone} onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value })} maxLength={30} placeholder="Optional" /></label>
      <div className="line-items-heading"><b>Items</b><button className="button button-secondary button-small" type="button" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { product_id: saleable[0]?.id ?? '', quantity: '1' }] })} disabled={draft.lines.length >= 10}><Plus size={15} /> Add line</button></div>
      <div className="sale-lines">{draft.lines.map((line, index) => { const product = products.find((p) => p.id === line.product_id); return <div className="sale-line" key={`${index}-${line.product_id}`}><label className="field product-select"><span>Product</span><select value={line.product_id} onChange={(e) => setLine(index, { product_id: e.target.value })}>{saleable.map((item) => <option value={item.id} key={item.id}>{item.name} · {formatUGX(item.price_ugx)} · {item.stock_on_hand} on hand</option>)}</select></label><label className="field quantity-select"><span>Qty</span><input type="number" min="1" max={product?.stock_on_hand ?? 0} step="1" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} required /></label><span className="line-total">{formatUGX((product?.price_ugx ?? 0) * (Number(line.quantity) || 0))}</span><button className="icon-button remove-line" type="button" aria-label={`Remove line ${index + 1}`} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== index) })} disabled={draft.lines.length === 1}><Trash2 size={16} /></button></div> })}</div>
      <div className="form-two"><label className="field"><span>Payment method</span><select value={draft.payment_method} onChange={(e) => setDraft({ ...draft, payment_method: e.target.value as NewOrder['payment_method'] })}><option value="mobile_money">Mobile Money</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="other">Other</option></select></label><label className="field"><span>Payment status</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as NewOrder['status'] })}><option value="pending">Pending · not yet received</option><option value="paid">Paid · received and confirmed</option></select></label></div>
      <div className="sale-total"><span>Order total</span><b>{formatUGX(totalPreview)}</b></div>
      <p className="form-hint">This records the order; it does not collect or process payment. Stock availability is checked again on the server before saving.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setDraft(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Recording…' : 'Record order & adjust stock'}</button></div>
    </form></Modal>}
    {detail && <Modal title={`Order ${detail.id.slice(0, 8).toUpperCase()}`} onClose={() => setDetail(null)}>
      <div className="order-detail"><div className="detail-pairs"><span>Customer<strong>{detail.customer_name || 'Walk-in'}</strong></span><span>Date<strong>{formatEATDate(detail.created_at)}</strong></span><span>Payment<strong>{paymentLabel[detail.payment_method] ?? detail.payment_method} · {detail.status}</strong></span><span>Total<strong>{formatUGX(detail.total_ugx)}</strong></span></div><h3>Items</h3>{detailBusy ? <p>Loading items…</p> : lines.map((line) => <div className="detail-line" key={line.id}><span>{line.quantity} × {line.product_name}</span><b>{formatUGX(line.quantity * line.unit_price_ugx)}</b></div>)}
        {detail.status === 'pending' && <div className="modal-actions"><button className="button button-danger" type="button" onClick={() => { setCancelReason(''); setCancelReasonOpen(true) }} disabled={statusBusy}>Cancel order</button><button className="button button-primary" onClick={() => void moveStatus('paid')} disabled={statusBusy}>{statusBusy ? 'Saving…' : 'Mark payment received'}</button></div>}
        {detail.status === 'paid' && <div className="modal-actions"><button className="button button-danger" type="button" onClick={() => { setCancelReason(''); setCancelReasonOpen(true) }} disabled={statusBusy}>Cancel order</button><button className="button button-primary" onClick={() => void moveStatus('fulfilled')} disabled={statusBusy}>{statusBusy ? 'Saving…' : 'Mark fulfilled'}</button></div>}
        {cancelReasonOpen && <form className="stack-form" onSubmit={(event) => { event.preventDefault(); if (cancelReason.trim()) void moveStatus('cancelled', cancelReason.trim()) }}><p className="form-hint">Cancelling returns the items to stock. This action is recorded in the order history.</p><label className="field"><span>Why is this order being cancelled?</span><textarea autoFocus required maxLength={240} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Enter the reason for your records." /></label><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setCancelReasonOpen(false)} disabled={statusBusy}>Keep order</button><button className="button button-danger" disabled={statusBusy || !cancelReason.trim()}>{statusBusy ? 'Saving…' : 'Confirm cancellation'}</button></div></form>}
        {detail.status === 'cancelled' && <p className="form-hint">This order was cancelled. Its stock was returned to the inventory count.</p>}
      </div>
    </Modal>}
  </div>
}
