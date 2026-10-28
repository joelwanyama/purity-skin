import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Check, Download, FileJson, FolderOpen, Laptop, PencilLine,
  Plus, RotateCcw, Trash2, Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useShopCatalog } from '../catalog/useShopCatalog'
import {
  committedCatalog, downloadCatalog, importCatalogText, loadSnapshot, serializeCatalog,
} from '../catalog/storage'
import {
  canPublish, createEmptyProduct, uniqueSlug, validateProductForPublish,
} from '../catalog/validation'
import type { CatalogProduct, CatalogSettings } from '../catalog/types'
import { formatUGX } from '../lib/format'
import { usePageMeta } from '../lib/pageMeta'

type Note = { tone: 'ok' | 'warn' | 'bad'; text: string }

const COMMON_CATEGORIES = ['Serum', 'Cleanser', 'Toner', 'Moisturiser', 'Sunscreen', 'Soap', 'Scrub', 'Oil', 'Mask']

export function Studio() {
  const { products, settings, hasLocalChanges, persist, discard } = useShopCatalog()
  const [draftProducts, setDraftProducts] = useState<CatalogProduct[]>(products)
  const [draftSettings, setDraftSettings] = useState<CatalogSettings>(settings)
  const [selectedId, setSelectedId] = useState<string | null>(products[0]?.id ?? null)
  const [note, setNote] = useState<Note | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  usePageMeta({
    title: 'Catalogue studio',
    description: 'Local catalogue drafting tool for PURITY SKIN.',
    path: '/studio/catalogue',
    noindex: true,
  })

  const selected = draftProducts.find((product) => product.id === selectedId) ?? null
  const gate = selected ? validateProductForPublish(selected) : null
  const published = draftProducts.filter((product) => product.status === 'published')
  const unsaved = useMemo(
    () => JSON.stringify({ p: draftProducts, s: draftSettings }) !== JSON.stringify({ p: products, s: settings }),
    [draftProducts, draftSettings, products, settings],
  )

  /**
   * Every mutation goes through one of these two helpers, which write to this
   * browser immediately. "Download JSON" is the step that publishes, so an edit
   * or a publish toggle can never be lost by navigating away.
   */
  function commitProducts(next: CatalogProduct[], nextSettings = draftSettings) {
    setDraftProducts(next)
    setDraftSettings(nextSettings)
    const result = persist(next, nextSettings)
    if (!result.ok) setNote({ tone: 'bad', text: result.error ?? 'Draft could not be saved in this browser.' })
    return result
  }

  function commitSettings(next: CatalogSettings) {
    setDraftSettings(next)
    const result = persist(draftProducts, next)
    if (!result.ok) setNote({ tone: 'bad', text: result.error ?? 'Shop details could not be saved in this browser.' })
    return result
  }

  function updateProduct(patch: Partial<CatalogProduct>) {
    if (!selected) return
    commitProducts(draftProducts.map((product) =>
      product.id === selected.id ? { ...product, ...patch, updated_at: new Date().toISOString() } : product))
  }

  function renameProduct(name: string) {
    if (!selected) return
    const taken = draftProducts.filter((product) => product.id !== selected.id).map((product) => product.slug)
    const slug = selected.status === 'published' ? selected.slug : uniqueSlug(name || 'product', taken)
    updateProduct({ name, slug })
  }

  function addProduct() {
    const existing = createEmptyProduct(draftProducts.map((product) => product.slug))
    commitProducts([existing, ...draftProducts])
    setSelectedId(existing.id)
    setNote({ tone: 'warn', text: 'New draft added. It stays invisible in the shop until it passes the publish checks.' })
  }

  function removeProduct(id: string) {
    commitProducts(draftProducts.filter((product) => product.id !== id))
    if (selectedId === id) setSelectedId(null)
    setNote({ tone: 'warn', text: 'Product removed from this draft. Save to keep the change.' })
  }

  function reset() {
    if (!window.confirm('Discard browser drafts and reload the committed catalogue?')) return
    discard()
    const fresh = loadSnapshot()
    setDraftProducts(fresh.products)
    setDraftSettings(fresh.settings)
    setSelectedId(fresh.products[0]?.id ?? null)
    setNote({ tone: 'warn', text: 'Browser drafts discarded. The committed catalogue is loaded.' })
  }

  function exportJson() {
    downloadCatalog(draftProducts, draftSettings)
    setNote({ tone: 'ok', text: 'catalog.data.json downloaded. Commit it to src/catalog/ to publish for everyone.' })
  }

  async function importJson(file: File) {
    const text = await file.text()
    const result = importCatalogText(text)
    if (!result.ok) {
      setNote({ tone: 'bad', text: `Import failed: ${result.errors.slice(0, 3).join(' ')}` })
      return
    }
    commitProducts(result.catalog.products, result.catalog.settings)
    setSelectedId(result.catalog.products[0]?.id ?? null)
    setNote({
      tone: result.warnings.length ? 'warn' : 'ok',
      text: result.warnings.length
        ? `Imported with adjustments: ${result.warnings.slice(0, 3).join(' ')}`
        : `Imported ${result.catalog.products.length} products.`,
    })
  }

  return <div className="page studio">
    <header className="page-header">
      <p className="section-kicker">CATALOGUE STUDIO</p>
      <h1>Build the line-up before the database exists.</h1>
      <p className="page-intro">This editor runs entirely in your browser. Nothing is sent anywhere, no sign-in is needed, and nothing you do here is visible to customers until the exported file is committed to the repository.</p>
    </header>

    <div className="studio-banner">
      <Laptop size={18} aria-hidden="true" />
      <div>
        <strong>Local draft mode {hasLocalChanges || unsaved ? '· browser drafts active' : '· nothing edited yet'}</strong>
        <p>Changes are saved in this browser only. Use <b>Download JSON</b> and commit <code className="inline-code">src/catalog/catalog.data.json</code> to publish. This is not the protected owner workspace — that arrives with the database step.</p>
      </div>
    </div>

    {note && <p className={`studio-note studio-note-${note.tone}`} role="status">{note.text}</p>}

    <div className="studio-toolbar">
      <button type="button" className="button button-primary" onClick={addProduct}><Plus size={16} aria-hidden="true" /> New product</button>
      <button type="button" className="button button-secondary" onClick={exportJson}><Download size={16} aria-hidden="true" /> Download JSON</button>
      <button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()}><Upload size={16} aria-hidden="true" /> Import JSON</button>
      <button type="button" className="button button-quiet" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Discard drafts</button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Import a catalogue JSON file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importJson(file)
          event.target.value = ''
        }}
      />
    </div>

    <div className="studio-stats">
      <div><strong>{draftProducts.length}</strong><span>products in draft</span></div>
      <div><strong>{published.length}</strong><span>published to the shop</span></div>
      <div><strong>{draftProducts.filter((product) => canPublish(product)).length}</strong><span>passing the publish checks</span></div>
      <div><strong>{draftProducts.filter((product) => product.photo_state === 'ready').length}</strong><span>with an approved photo</span></div>
    </div>

    <div className="studio-columns">
      <section className="data-panel" aria-labelledby="draft-list">
        <div className="panel-heading">
          <h2 id="draft-list">Draft line-up</h2>
          <span className="collection-count">{draftProducts.length}</span>
        </div>
        {draftProducts.length === 0
          ? <div className="empty-panel">
              <FileJson size={22} aria-hidden="true" />
              <h3>The catalogue is honestly empty.</h3>
              <p>Start with a real product: name, pack size, the price you actually charge, and a photo you have the right to use.</p>
              <div className="empty-actions"><button type="button" className="button button-primary" onClick={addProduct}><Plus size={16} aria-hidden="true" /> Add the first product</button></div>
            </div>
          : <ul className="draft-list">
              {draftProducts.map((product) => {
                const productGate = validateProductForPublish(product)
                return <li key={product.id} className={product.id === selectedId ? 'is-selected' : undefined}>
                  <button type="button" className="draft-row" onClick={() => setSelectedId(product.id)} aria-current={product.id === selectedId}>
                    <span className="draft-main">
                      <b>{product.name || 'Untitled draft'}</b>
                      <small>{[product.category, product.size_label].filter(Boolean).join(' · ') || 'No type or size yet'}</small>
                    </span>
                    <span className="draft-side">
                      <span className={`chip chip-${product.status}`}>{product.status === 'published' ? 'Published' : 'Draft'}</span>
                      <small>{formatUGX(product.price_ugx)}</small>
                      {productGate.errors.length > 0 && <span className="chip chip-blocked">{productGate.errors.length} blocked</span>}
                    </span>
                  </button>
                </li>
              })}
            </ul>}
      </section>

      <section className="data-panel" aria-labelledby="editor-title">
        <div className="panel-heading">
          <h2 id="editor-title">{selected ? 'Edit product' : 'Nothing selected'}</h2>
          {selected && <button type="button" className="button button-danger button-small" onClick={() => removeProduct(selected.id)}>
            <Trash2 size={14} aria-hidden="true" /> Remove
          </button>}
        </div>

        {!selected
          ? <div className="empty-panel">
              <PencilLine size={22} aria-hidden="true" />
              <h3>Pick a product to edit</h3>
              <p>Or add a new one. Every field here feeds the public shop exactly as you type it.</p>
            </div>
          : <div className="studio-form">
              <label className="field">Product name
                <input value={selected.name} onChange={(event) => renameProduct(event.target.value)} placeholder="Exactly as printed on the pack" />
                <small>Link: /shop/{selected.slug}</small>
              </label>

              <div className="form-two">
                <label className="field">Product type
                  <input list="product-types" value={selected.category} onChange={(event) => updateProduct({ category: event.target.value })} placeholder="Serum" />
                  <datalist id="product-types">{COMMON_CATEGORIES.map((item) => <option key={item} value={item} />)}</datalist>
                </label>
                <label className="field">Pack size
                  <input value={selected.size_label} onChange={(event) => updateProduct({ size_label: event.target.value })} placeholder="30 ml" />
                </label>
              </div>

              <div className="form-two">
                <label className="field">Price (UGX)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={selected.price_ugx ?? ''}
                    onChange={(event) => updateProduct({ price_ugx: event.target.value === '' ? null : Math.round(Number(event.target.value)) })}
                    placeholder="Leave empty until confirmed"
                  />
                </label>
                <label className="field">Photo state
                  <select value={selected.photo_state} onChange={(event) => updateProduct({ photo_state: event.target.value as 'pending' | 'ready' })}>
                    <option value="pending">No approved photo yet</option>
                    <option value="ready">Approved photo in place</option>
                  </select>
                </label>
              </div>

              <label className="field">Photo path
                <input
                  value={selected.image_path ?? ''}
                  onChange={(event) => updateProduct({ image_path: event.target.value.trim() || null })}
                  placeholder="/images/products/serum-01.jpg"
                />
                <small>Root-relative path to a committed file, or a full https URL. Sizes and naming: docs/ASSETS.md.</small>
              </label>

              <label className="field">One-line summary
                <input value={selected.summary} onChange={(event) => updateProduct({ summary: event.target.value })} maxLength={120} placeholder="Shown on cards. Keep it factual." />
              </label>

              <label className="field">Description
                <textarea value={selected.description} onChange={(event) => updateProduct({ description: event.target.value })} placeholder="What it is, what it is used for, how to use it. No medical claims." />
                <small>{selected.description.trim().length}/40 characters minimum</small>
              </label>

              <div className="gate-block">
                <p className="gate-title">Publish checks</p>
                <label className="toggle-row">
                  <input type="checkbox" checked={selected.owner_confirmed} onChange={(event) => updateProduct({ owner_confirmed: event.target.checked })} />
                  <span><b>The name, pack size and price are real</b><small>I have checked this against the actual product.</small></span>
                </label>
                <label className="toggle-row">
                  <input type="checkbox" checked={selected.claims_checked} onChange={(event) => updateProduct({ claims_checked: event.target.checked })} />
                  <span><b>The wording and claims have been checked</b><small>No cure, treatment, permanent or guaranteed claims.</small></span>
                </label>

                {gate && gate.errors.length > 0 && <ul className="gate-list gate-errors">
                  {gate.errors.map((error) => <li key={error}><AlertTriangle size={13} aria-hidden="true" /> {error}</li>)}
                </ul>}
                {gate && gate.warnings.length > 0 && <ul className="gate-list gate-warnings">
                  {gate.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>}
                {gate && gate.errors.length === 0 && <p className="gate-pass"><Check size={14} aria-hidden="true" /> This product passes every publish check.</p>}

                <div className="gate-actions">
                  {selected.status === 'published'
                    ? <button type="button" className="button button-secondary" onClick={() => updateProduct({ status: 'draft' })}>Unpublish</button>
                    : <button
                        type="button"
                        className="button button-primary"
                        disabled={!gate || gate.errors.length > 0}
                        onClick={() => updateProduct({ status: 'published' })}
                      >Publish to shop</button>}
                </div>
              </div>

              <div className="studio-preview">
                <p className="gate-title">How the card will look</p>
                <ProductCard product={selected} whatsappNumber={draftSettings.whatsapp_number} />
              </div>
            </div>}
      </section>
    </div>

    <section className="data-panel" aria-labelledby="settings-title">
      <div className="panel-heading"><h2 id="settings-title">Shop details</h2><small>Used by the header, footer and every WhatsApp link</small></div>
      <div className="form-two">
        <label className="field">Business name
          <input value={draftSettings.business_name} onChange={(event) => commitSettings({ ...draftSettings, business_name: event.target.value })} />
        </label>
        <label className="field">WhatsApp number
          <input value={draftSettings.whatsapp_number} onChange={(event) => commitSettings({ ...draftSettings, whatsapp_number: event.target.value.replace(/[^\d]/g, '') })} placeholder="256..." />
          <small>Digits only, including country code. Confirm this is the number that answers messages.</small>
        </label>
        <label className="field">Location
          <input value={draftSettings.location} onChange={(event) => commitSettings({ ...draftSettings, location: event.target.value })} />
        </label>
        <label className="field">Delivery summary (optional)
          <input value={draftSettings.delivery_summary} onChange={(event) => commitSettings({ ...draftSettings, delivery_summary: event.target.value })} placeholder="Leave empty until delivery is agreed" />
        </label>
      </div>
      <div className="studio-toolbar">
        <button type="button" className="button button-secondary" onClick={() => { navigator.clipboard?.writeText(serializeCatalog(draftProducts, draftSettings)).then(() => setNote({ tone: 'ok', text: 'JSON copied. Paste it over src/catalog/catalog.data.json.' })).catch(() => setNote({ tone: 'bad', text: 'Clipboard unavailable. Use Download JSON instead.' })) }}><FolderOpen size={16} aria-hidden="true" /> Copy JSON</button>
        <span className="autosave-note"><Check size={14} aria-hidden="true" /> Edits save to this browser automatically</span>
      </div>
    </section>

    <p className="studio-foot">Committed catalogue: {committedCatalog().products.length} products · documentation in <code className="inline-code">docs/CATALOGUE.md</code> · photo specification in <code className="inline-code">docs/ASSETS.md</code> · <Link to="/shop">view the public shop</Link></p>
  </div>
}
