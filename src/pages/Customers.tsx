import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CircleUserRound, Plus, Search, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { Modal } from '../components/Modal'
import type { Customer } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type Draft = { id?: string; full_name: string; phone: string; notes: string; marketing_consent: boolean; consent_source: string }
const emptyDraft = (): Draft => ({ full_name: '', phone: '', notes: '', marketing_consent: false, consent_source: '' })

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const load = useCallback(async (showLoading = false) => {
    if (!supabase) return
    if (showLoading) { setLoading(true); setError('') }
    const { data, error: loadError } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(1000)
    if (loadError) setError(loadError.message); else setCustomers((data ?? []) as Customer[])
    setLoading(false)
  }, [])
  // oxlint-disable-next-line react/set-state-in-effect -- This effect starts the initial Supabase read; UI state changes only after its async response.
  useEffect(() => { void load() }, [load])

  const filtered = customers.filter((customer) => `${customer.full_name} ${customer.phone ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  function edit(customer?: Customer) { setError(''); setDraft(customer ? { id: customer.id, full_name: customer.full_name, phone: customer.phone ?? '', notes: customer.notes ?? '', marketing_consent: customer.marketing_consent, consent_source: customer.consent_note ?? '' } : emptyDraft()) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !draft) return
    if (!draft.full_name.trim()) { setError('Add the customer name.'); return }
    if (draft.marketing_consent && !draft.consent_source.trim()) { setError('Record where/how they explicitly agreed before enabling marketing messages.'); return }
    setSaving(true); setError('')
    const previous = customers.find((customer) => customer.id === draft.id)
    const consentChangedOn = draft.marketing_consent && !previous?.marketing_consent
    const consentWithdrawnOn = !draft.marketing_consent && Boolean(previous?.marketing_consent)
    const payload = {
      full_name: draft.full_name.trim(), phone: draft.phone.trim() || null, notes: draft.notes.trim() || null,
      marketing_consent: draft.marketing_consent,
      consent_note: draft.marketing_consent ? draft.consent_source.trim() : (consentWithdrawnOn ? 'Consent withdrawn by owner' : null),
      consent_recorded_at: consentChangedOn ? new Date().toISOString() : previous?.consent_recorded_at ?? null,
      consent_withdrawn_at: consentWithdrawnOn ? new Date().toISOString() : draft.marketing_consent ? null : previous?.consent_withdrawn_at ?? null,
    }
    let result
    if (draft.id) result = await supabase.from('customers').update(payload).eq('id', draft.id)
    else {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (!userId) { setError('Owner session expired. Sign in again.'); setSaving(false); return }
      result = await supabase.from('customers').insert({ ...payload, user_id: userId })
    }
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    setDraft(null); await load()
  }

  return <div className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">CUSTOMER RECORDS</p><h1>Customers</h1><p>Keep only the details needed to serve an order. Marketing permission is a separate choice.</p></div><button className="button button-primary" onClick={() => edit()}><Plus size={17} aria-hidden="true" /> Add customer</button></div>
    <div className="safety-note"><ShieldCheck size={17} aria-hidden="true" /><span><b>Customer-only access is not enabled yet.</b> The later invite feature will be individual, verified and revocable. There is no shared customer PIN and no customer can browse another customer's record.</span></div>
    {error && !draft && <div className="notice-block error-block" role="alert"><strong>Customer records could not load.</strong><span>{error}</span><button className="text-link" onClick={() => void load(true)}>Try again</button></div>}
    <section className="data-panel"><div className="panel-heading"><div><p className="section-kicker">CUSTOMER BOOK</p><h2>{customers.length} {customers.length === 1 ? 'record' : 'records'}</h2></div><label className="search-field"><Search size={16} aria-hidden="true" /><span className="sr-only">Search customer records</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" /></label></div>
      <div className="privacy-note"><b>Use customer information only for the purpose agreed.</b> A phone number used to arrange delivery is not automatic consent for future promotions. Ask permission first and respect opt-outs.</div>
      {loading ? <p className="table-state">Loading customer records…</p> : customers.length === 0 ? <div className="empty-panel"><CircleUserRound size={24} aria-hidden="true" /><h3>No customers saved yet.</h3><p>Add a customer when there is a real business reason, such as an order or requested follow-up.</p><button className="button button-primary" onClick={() => edit()}><UserRoundPlus size={16} aria-hidden="true" /> Add first customer</button></div> : filtered.length === 0 ? <p className="table-state">No customer matches that search.</p> : <div className="table-scroll"><table className="owner-table"><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>MARKETING</th><th>ADDED</th><th></th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><b>{customer.full_name}</b></td><td>{customer.phone || '—'}</td><td><span className={`status-pill ${customer.marketing_consent ? 'status-good' : 'status-muted'}`}>{customer.marketing_consent ? 'Opted in' : 'Not opted in'}</span></td><td>{new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeZone: 'Africa/Kampala' }).format(new Date(customer.created_at))}</td><td><button className="text-link" onClick={() => edit(customer)}>Edit</button></td></tr>)}</tbody></table></div>}
    </section>
    {draft && <Modal title={draft.id ? 'Update customer record' : 'Add customer record'} onClose={() => setDraft(null)}><form className="stack-form" onSubmit={save}>
      <label className="field"><span>Customer name</span><input autoFocus value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} maxLength={120} required /></label>
      <label className="field"><span>Phone number</span><input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} maxLength={30} placeholder="Only if needed for the order or requested follow-up" /></label>
      <label className="field"><span>Minimal service note · optional</span><textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} maxLength={240} placeholder="Avoid sensitive health or skin-condition notes." /></label>
      <label className="toggle-row"><input type="checkbox" checked={draft.marketing_consent} onChange={(e) => setDraft({ ...draft, marketing_consent: e.target.checked, consent_source: e.target.checked ? draft.consent_source : '' })} /><span><b>They explicitly agreed to marketing messages</b><small>Not required for an order. Do not check this unless they actively opted in.</small></span></label>
      {draft.marketing_consent && <label className="field"><span>How was consent recorded?</span><select value={draft.consent_source} onChange={(e) => setDraft({ ...draft, consent_source: e.target.value })} required><option value="">Choose a source</option><option>WhatsApp message</option><option>In person</option><option>Written form</option><option>Other documented request</option></select></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setDraft(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button></div>
    </form></Modal>}
  </div>
}
