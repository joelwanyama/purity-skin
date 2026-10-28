import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Boxes, Plus, RefreshCw } from 'lucide-react'
import { Modal } from '../components/Modal'
import type { Product } from '../lib/database.types'
import { formatEATDate } from '../lib/format'
import { supabase } from '../lib/supabase'

type Movement = { id: string; product_id: string; quantity_delta: number; reason: string; created_at: string; order_id: string | null }
type Draft = { product_id: string; quantity_delta: string; reason: string }
const REASONS = ['Production / restock', 'Damaged or expired', 'Count correction', 'Other']

export function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async (showLoading = false) => {
    if (!supabase) return
    if (showLoading) { setLoading(true); setError('') }
    const [p, m] = await Promise.all([
      supabase.from('products').select('*').order('name').limit(500),
      supabase.from('inventory_movements').select('id,product_id,quantity_delta,reason,created_at,order_id').order('created_at', { ascending: false }).limit(100),
    ])
    if (p.error || m.error) setError(p.error?.message ?? m.error?.message ?? 'Inventory could not load.')
    else { setProducts((p.data ?? []) as Product[]); setMovements(m.data ?? []) }
    setLoading(false)
  }, [])
  // oxlint-disable-next-line react/set-state-in-effect -- This effect starts the initial Supabase read; UI state changes only after its async response.
  useEffect(() => { void load() }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !draft) return
    const delta = Number(draft.quantity_delta)
    if (!Number.isSafeInteger(delta) || delta === 0) { setError('Enter a whole-number stock change.'); return }
    setSaving(true); setError('')
    const { error: saveError } = await supabase.rpc('adjust_stock', { p_product_id: draft.product_id, p_quantity_delta: delta, p_reason: draft.reason })
    setSaving(false)
    if (saveError) { setError(saveError.message); return }
    setDraft(null); await load()
  }

  const nameById = new Map(products.map((product) => [product.id, product.name]))
  const low = products.filter((product) => product.reorder_level > 0 && product.stock_on_hand <= product.reorder_level)

  return <div className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">STOCK LEDGER</p><h1>Stock room</h1><p>Every receipt, sale and correction is recorded as a dated movement.</p></div><button className="button button-primary" onClick={() => setDraft({ product_id: products[0]?.id ?? '', quantity_delta: '', reason: REASONS[0] })} disabled={!products.length}><Plus size={17} aria-hidden="true" /> Stock adjustment</button></div>
    {error && <div className="notice-block error-block" role="alert"><strong>Inventory action needs attention.</strong><span>{error}</span><button className="text-link" onClick={() => void load(true)}>Reload</button></div>}
    <section className="data-panel"><div className="panel-heading"><div><p className="section-kicker">CURRENT COUNT</p><h2>On-hand stock</h2></div><button className="icon-button" onClick={() => void load(true)} aria-label="Refresh stock" disabled={loading}><RefreshCw size={16} /></button></div>
      {loading ? <p className="table-state">Loading stock…</p> : products.length ? <div className="table-scroll"><table className="owner-table"><thead><tr><th>PRODUCT</th><th>ON HAND</th><th>REORDER AT</th><th>STATE</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.category || 'Uncategorised'}</small></td><td className="number-cell">{product.stock_on_hand}</td><td className="number-cell">{product.reorder_level}</td><td>{product.reorder_level > 0 && product.stock_on_hand <= product.reorder_level ? <span className="status-pill status-warn"><AlertTriangle size={13} aria-hidden="true" /> Check stock</span> : <span className="status-pill status-good">In range</span>}</td></tr>)}</tbody></table></div> : <div className="empty-panel"><Boxes size={24} /><h3>Nothing to count yet.</h3><p>Add products first. Then record a production/restock or an opening count.</p></div>}
      {!loading && low.length > 0 && <p className="inline-note">{low.length} product{low.length === 1 ? '' : 's'} at or below the reorder threshold.</p>}
    </section>
    <section className="data-panel"><div className="panel-heading"><div><p className="section-kicker">AUDIT TRAIL</p><h2>Recent movements</h2></div><span className="quiet-count">Last {movements.length} entries</span></div>
      {loading ? <p className="table-state">Loading movement history…</p> : movements.length ? <div className="table-scroll"><table className="owner-table"><thead><tr><th>DATE · EAT</th><th>PRODUCT</th><th>CHANGE</th><th>REASON</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{formatEATDate(movement.created_at)}</td><td>{nameById.get(movement.product_id) ?? 'Product record unavailable'}</td><td className={`number-cell ${movement.quantity_delta < 0 ? 'negative' : 'positive'}`}>{movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}</td><td>{movement.reason}</td></tr>)}</tbody></table></div> : <p className="table-state">Stock adjustments and completed sales will appear here.</p>}
    </section>
    {draft && <Modal title="Adjust stock count" onClose={() => setDraft(null)}><form className="stack-form" onSubmit={submit}>
      <label className="field"><span>Product</span><select required value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: e.target.value })}>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.stock_on_hand} on hand</option>)}</select></label>
      <label className="field"><span>Quantity change</span><input autoFocus type="number" step="1" required value={draft.quantity_delta} onChange={(e) => setDraft({ ...draft, quantity_delta: e.target.value })} placeholder="Use + for stock in, − for stock out" /><small>For example, enter 12 for a restock or −2 for a damaged-unit correction.</small></label>
      <label className="field"><span>Reason</span><select value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })}>{REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
      <p className="form-hint">The recorded quantity cannot take stock below zero. Sales automatically reduce stock through the order flow.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setDraft(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save movement'}</button></div>
    </form></Modal>}
  </div>
}
