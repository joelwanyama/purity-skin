import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CirclePlus, Package, PencilLine, Plus, Search } from 'lucide-react'
import { Modal } from '../components/Modal'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/database.types'
import { formatUGX } from '../lib/format'

const STARTER = [
  ['Kojic & Turmeric Soap (150g)', 'Cleanse'], ['Kojic Papaya Soap', 'Cleanse'], ['Refreshing Body Wash', 'Cleanse'],
  ['Foaming Body Scrub', 'Cleanse'], ['Qasil Powder', 'Cleanse'], ['5% Glycolic Acid Toner', 'Treat'],
  ['Milky Complex Toner', 'Treat'], ['Darkspot Serum', 'Treat'], ['Advanced Brightening Face Cream', 'Treat'],
  ['Emulsified Body Butter “Brighten”', 'Treat'], ['Brightening Body Lotion', 'Treat'], ['Ultra Clarifying Oil', 'Seal'],
  ['Sunscreen (Bio UV)', 'Protect'], ['Glow Combo', 'Bundle'], ['Natural Glow Package', 'Bundle'],
]
type Draft = { id?: string; name: string; category: string; description: string; price_ugx: string; cost_ugx: string; reorder_level: string; image_path: string; is_published: boolean }
const blank = (): Draft => ({ name: '', category: '', description: '', price_ugx: '', cost_ugx: '', reorder_level: '5', image_path: '', is_published: false })
const parseAmount = (value: string) => value.trim() === '' ? null : /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN

export function Products() {
  const [rows, setRows] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [importing, setImporting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const load = useCallback(async (showLoading = false) => {
    if (!supabase) return
    if (showLoading) { setLoading(true); setError('') }
    const result = await supabase.from('products').select('*').order('name').limit(500)
    if (result.error) setError(result.error.message)
    else setRows((result.data ?? []) as Product[])
    setLoading(false)
  }, [])
  // oxlint-disable-next-line react/set-state-in-effect -- This effect starts the initial Supabase read; UI state changes only after its async response.
  useEffect(() => { void load() }, [load])

  const shown = rows.filter((product) => `${product.name} ${product.category ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const openNew = () => { setFormError(''); setImageFile(null); setDraft(blank()) }
  const openEdit = (product: Product) => { setFormError(''); setImageFile(null); setDraft({ id: product.id, name: product.name, category: product.category ?? '', description: product.description ?? '', price_ugx: product.price_ugx === null ? '' : String(product.price_ugx), cost_ugx: product.cost_ugx === null ? '' : String(product.cost_ugx), reorder_level: String(product.reorder_level), image_path: product.image_path ?? '', is_published: product.is_published }) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !draft) return
    const price = parseAmount(draft.price_ugx), cost = parseAmount(draft.cost_ugx), reorder = Number(draft.reorder_level)
    if (!draft.name.trim()) { setFormError('Add a product name.'); return }
    if (Number.isNaN(price) || Number.isNaN(cost) || !Number.isSafeInteger(reorder) || reorder < 0) { setFormError('Use whole UGX amounts and a non-negative reorder level.'); return }
    if (draft.is_published && price === null) { setFormError('Set the confirmed selling price before publishing.'); return }
    setSaving(true); setFormError('')
    let uploadedPath: string | null = null
    try {
      let userId: string | null = null
      if (imageFile || !draft.id) {
        const { data: authData } = await supabase.auth.getUser()
        userId = authData.user?.id ?? null
        if (!userId) { setFormError('Owner session expired. Sign in again.'); return }
      }
      let imagePath = draft.image_path || null
      if (imageFile && userId) {
        const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[imageFile.type]
        if (!extension || imageFile.size > 4 * 1024 * 1024) { setFormError('Choose a JPEG, PNG or WebP product photo under 4 MB.'); return }
        uploadedPath = `products/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('catalog').upload(uploadedPath, imageFile, { contentType: imageFile.type, cacheControl: '31536000', upsert: false })
        if (uploadError) { uploadedPath = null; setFormError('The photo could not be uploaded. Check the project setup and try again.'); return }
        imagePath = uploadedPath
      }
      const payload = { name: draft.name.trim(), category: draft.category.trim() || null, description: draft.description.trim() || null, price_ugx: price, cost_ugx: cost, reorder_level: reorder, image_path: imagePath, is_published: draft.is_published }
      let saveError: string | null = null
      if (draft.id) {
        const result = await supabase.from('products').update(payload).eq('id', draft.id)
        saveError = result.error?.message ?? null
      } else {
        const result = await supabase.from('products').insert({ ...payload, user_id: userId! })
        saveError = result.error?.message ?? null
      }
      if (saveError) {
        if (uploadedPath) await supabase.storage.from('catalog').remove([uploadedPath])
        uploadedPath = null
        setFormError(saveError)
        return
      }
      setDraft(null); setImageFile(null); await load()
    } catch {
      if (uploadedPath) await supabase.storage.from('catalog').remove([uploadedPath])
      setFormError('The product could not be saved. Check your connection and try again.')
    } finally { setSaving(false) }
  }

  function chooseImage(file: File | null) {
    setFormError('')
    if (!file) { setImageFile(null); return }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setImageFile(null); setFormError('Choose a JPEG, PNG or WebP image.'); return }
    if (file.size > 4 * 1024 * 1024) { setImageFile(null); setFormError('The photo must be under 4 MB.'); return }
    setImageFile(file)
  }

  async function addStarter() {
    if (!supabase || rows.length) return
    setImporting(true); setError('')
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) { setError('Your owner session expired. Sign in again.'); setImporting(false); return }
    const result = await supabase.from('products').insert(STARTER.map(([name, category]) => ({ user_id: userId, name, category, price_ugx: null, cost_ugx: null, reorder_level: 5, is_published: false })))
    setImporting(false)
    if (result.error) { setError(result.error.message); return }
    await load()
  }

  return <div className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">CATALOG CONTROL</p><h1>Products & prices</h1><p>One trusted record for the shop price, private cost and stock threshold.</p></div><button className="button button-primary" onClick={openNew}><Plus size={17} aria-hidden="true" /> Add product</button></div>
    <div className="safety-note"><b>Draft by default.</b> Old prototype prices are not imported as verified facts. A product reaches the public shop only after you enter its confirmed price and publish it.</div>
    <section className="data-panel">
      <div className="panel-heading"><div><p className="section-kicker">PRODUCT RECORDS</p><h2>{rows.length} {rows.length === 1 ? 'product' : 'products'}</h2></div><label className="search-field"><Search size={16} aria-hidden="true" /><span className="sr-only">Search products</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search catalog" /></label></div>
      {error && <div className="notice-block error-block" role="alert"><strong>Could not save or load products.</strong><span>{error}</span><button className="text-link" onClick={() => void load(true)}>Try again</button></div>}
      {loading ? <p className="table-state">Loading your catalog…</p> : rows.length === 0 ? <div className="empty-panel"><Package size={24} aria-hidden="true" /><h3>No product records yet.</h3><p>Start with the PURITY SKIN product names, then confirm prices, costs and product wording before publishing.</p><div className="empty-actions"><button className="button button-primary" onClick={() => void addStarter()} disabled={importing}><CirclePlus size={16} aria-hidden="true" /> {importing ? 'Adding drafts…' : 'Add 15 starter products as drafts'}</button><button className="button button-secondary" onClick={openNew}>Add one product</button></div><small>Starter entries have blank prices and costs. Nothing is published.</small></div> : shown.length === 0 ? <p className="table-state">No products match that search.</p> : <div className="table-scroll"><table className="owner-table"><thead><tr><th>PRODUCT</th><th>RETAIL PRICE</th><th>UNIT COST · PRIVATE</th><th>STOCK</th><th>SHOP</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>{shown.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.category || 'Uncategorised'}</small></td><td className="number-cell">{formatUGX(product.price_ugx)}</td><td className="number-cell">{formatUGX(product.cost_ugx)}</td><td className="number-cell">{product.stock_on_hand}</td><td><span className={`status-pill ${product.is_published ? 'status-good' : 'status-muted'}`}>{product.is_published ? 'Published' : 'Draft'}</span></td><td><button className="icon-button" aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)}><PencilLine size={16} aria-hidden="true" /></button></td></tr>)}</tbody></table></div>}
    </section>
    {draft && <Modal title={draft.id ? 'Edit product record' : 'Add product'} onClose={() => { setDraft(null); setImageFile(null) }}>
      <form className="stack-form" onSubmit={save}>
        <label className="field"><span>Product name</span><input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} required /></label>
        <div className="form-two"><label className="field"><span>Category</span><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} maxLength={60} placeholder="Cleanse, Treat, Seal…" /></label><label className="field"><span>Reorder threshold (units)</span><input type="number" min="0" step="1" value={draft.reorder_level} onChange={(e) => setDraft({ ...draft, reorder_level: e.target.value })} required /></label></div>
        <div className="form-two"><label className="field"><span>Selling price (UGX)</span><input inputMode="numeric" type="number" min="0" step="1" value={draft.price_ugx} onChange={(e) => setDraft({ ...draft, price_ugx: e.target.value })} placeholder="Confirmed price" /></label><label className="field"><span>Unit cost (UGX) · private</span><input inputMode="numeric" type="number" min="0" step="1" value={draft.cost_ugx} onChange={(e) => setDraft({ ...draft, cost_ugx: e.target.value })} placeholder="Optional until verified" /></label></div>
        <label className="field"><span>Product photo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0] ?? null)} /><small>JPEG, PNG or WebP · up to 4 MB. Use a real, owner-approved product photo; no stock or generated image is added automatically.</small>{draft.image_path && <small>Current product photo is saved. {imageFile ? 'A new photo will replace it.' : 'Choose a file only if you want to replace it.'}</small>}{imageFile && <small>Selected: {imageFile.name}</small>}</label>
        <label className="field"><span>Approved description for customers</span><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} maxLength={450} placeholder="Enter accurate, reviewed product information. Avoid unsupported treatment or outcome claims." /></label>
        <label className="toggle-row"><input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} /><span><b>Publish to the customer shop</b><small>Visible to anyone with the shop link once saved.</small></span></label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => { setDraft(null); setImageFile(null) }}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button></div>
      </form>
    </Modal>}
  </div>
}
