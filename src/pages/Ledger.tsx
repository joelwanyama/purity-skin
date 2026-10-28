import { useMemo, useRef, useState } from 'react'
import { ClipboardPaste, Download, HardDrive, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/pageMeta'
import { formatUGX } from '../lib/format'
import {
  LEDGER_STATUSES, STATUS_LABELS, addEntry, createEntry, csvFilename, describeItems,
  loadLedger, localDate, parseEnquiryMessage, removeEntry, saveLedger, setStatus,
  summarizeLedger, toCsv, type LedgerEntry, type LedgerStatus,
} from '../order/ledger'

type Notice = { tone: 'ok' | 'warn' | 'bad'; text: string }

/**
 * The owner's order book. Everything on this page lives in this browser and
 * nowhere else: no account, no server, no copy on the internet.
 *
 * That is a privacy choice and a limitation, and the page says both out loud.
 */
export function Ledger() {
  usePageMeta({
    title: 'Order ledger',
    description: 'A private order ledger that stays in the owner’s browser.',
    path: '/studio/ledger',
    noindex: true,
  })

  // Read straight from this browser on first render: there is no server to wait for.
  const [entries, setEntries] = useState<LedgerEntry[]>(() => loadLedger())
  const [paste, setPaste] = useState('')
  const [preview, setPreview] = useState<{ customer: string; note: string; items: ReturnType<typeof parseEnquiryMessage>['items']; total: number | null } | null>(null)
  const [manual, setManual] = useState({ customer: '', what: '', total: '', date: '' })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | LedgerStatus>('all')
  const importInput = useRef<HTMLInputElement>(null)

  function commit(next: LedgerEntry[]) {
    setEntries(next)
    if (!saveLedger(next)) {
      setNotice({ tone: 'bad', text: 'This browser refused to save. Storage may be full or blocked — export the CSV before you close this page.' })
      return false
    }
    return true
  }

  const summary = useMemo(() => summarizeLedger(entries), [entries])
  const visible = useMemo(
    () => (statusFilter === 'all' ? entries : entries.filter((entry) => entry.status === statusFilter)),
    [entries, statusFilter],
  )

  function readPaste() {
    const parsed = parseEnquiryMessage(paste)
    if (!parsed.items.length && !parsed.total_ugx) {
      setPreview(null)
      setNotice({ tone: 'warn', text: 'Nothing in that text looked like an enquiry. Add it by hand below instead of guessing.' })
      return
    }
    setPreview({ customer: '', note: parsed.note, items: parsed.items, total: parsed.total_ugx })
    setNotice(null)
  }

  function savePaste() {
    if (!preview) return
    const entry = createEntry({
      customer: preview.customer,
      items: preview.items,
      total_ugx: preview.total,
      note: preview.note,
      source: 'paste',
    })
    if (!commit(addEntry(entries, entry))) return
    setPreview(null)
    setPaste('')
    setNotice({ tone: 'ok', text: `Saved: ${describeItems(entry.items)}. It stays in this browser until you export it.` })
  }

  function saveManual() {
    if (!manual.what.trim() && !manual.total.trim()) {
      setNotice({ tone: 'bad', text: 'Write what they asked for, or at least the amount.' })
      return
    }
    const amount = manual.total.trim() ? Number(manual.total.replace(/[^\d]/g, '')) : null
    const entry = createEntry({
      customer: manual.customer,
      items: manual.what.trim() ? [{ name: manual.what.trim().slice(0, 120), size: '', quantity: 1, line_total_ugx: null }] : [],
      total_ugx: amount === null || Number.isNaN(amount) ? null : amount,
      created_at: manual.date ? new Date(`${manual.date}T12:00:00`).toISOString() : undefined,
      source: 'manual',
    })
    if (!commit(addEntry(entries, entry))) return
    setManual({ customer: '', what: '', total: '', date: '' })
    setNotice({ tone: 'ok', text: 'Added to the ledger.' })
  }

  function changeStatus(id: string, status: LedgerStatus) {
    commit(setStatus(entries, id, status))
  }

  function deleteEntry(id: string) {
    const entry = entries.find((item) => item.id === id)
    if (!window.confirm(`Delete this entry? ${entry ? describeItems(entry.items) : ''}`)) return
    commit(removeEntry(entries, id))
    setNotice({ tone: 'warn', text: 'Entry deleted from this browser.' })
  }

  function exportCsv() {
    if (!entries.length) {
      setNotice({ tone: 'warn', text: 'There is nothing to export yet.' })
      return
    }
    const blob = new Blob([toCsv(entries)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = csvFilename()
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'ok', text: `Exported ${entries.length} entries as CSV. Keep that file somewhere safe — it is your only copy.` })
  }

  function clearAll() {
    if (!window.confirm('Delete every entry in this browser? Export the CSV first if you need a record.')) return
    commit([])
    setNotice({ tone: 'warn', text: 'The ledger is empty. This cannot be undone.' })
  }

  async function importJson(file: File) {
    const text = await file.text()
    try {
      const parsed = JSON.parse(text) as unknown
      const next = Array.isArray(parsed) ? (parsed as LedgerEntry[]) : []
      if (!next.length) throw new Error('empty')
      commit(next)
      setNotice({ tone: 'ok', text: `Restored ${next.length} entries into this browser.` })
    } catch {
      setNotice({ tone: 'bad', text: 'That file did not contain a ledger. Nothing was changed.' })
    }
  }

  function exportJson() {
    const blob = new Blob([`${JSON.stringify(entries, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `purity-skin-ledger-backup-${localDate()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'ok', text: 'Backup file downloaded. Importing it on another phone restores the list.' })
  }

  return <div className="page ledger-page">
    <header className="page-header">
      <p className="section-kicker">OWNER · ORDER LEDGER</p>
      <h1>What did I promise last Tuesday?</h1>
      <p className="page-intro">
        Paste the WhatsApp enquiry, or type it. Everything here stays in this browser on this device — no account, no server, nothing sent anywhere.
      </p>
    </header>

    <p className="ledger-warning">
      <TriangleAlert size={16} aria-hidden="true" />
      <span>
        <b>This is not a backup.</b> Clearing browser data, a private window, a new phone or a storage limit removes it. Export the CSV at least once a week, and use the JSON backup before changing phones.
      </span>
    </p>

    {notice && <p className={`studio-note studio-note-${notice.tone}`} role="status">{notice.text}</p>}

    <div className="ledger-stats">
      <div><strong>{summary.open}</strong><span>open</span></div>
      <div><strong>{summary.delivered}</strong><span>delivered</span></div>
      <div><strong>{formatUGX(summary.deliveredUgx)}</strong><span>delivered value</span></div>
      <div><strong>{formatUGX(summary.pipelineUgx)}</strong><span>open value</span></div>
      <div><strong>{summary.lastSevenDays}</strong><span>in the last 7 days</span></div>
    </div>

    <div className="ledger-columns">
      <section className="data-panel" aria-labelledby="paste-title">
        <div className="panel-heading"><h2 id="paste-title">Paste an enquiry</h2></div>
        <label className="field">Enquiry message
          <textarea
            value={paste}
            onChange={(event) => { setPaste(event.target.value); setPreview(null) }}
            rows={5}
            placeholder={'Hello PURITY SKIN, I would like to check these items:\n1. …'}
          />
          <small>Copy the message from WhatsApp. Items, sizes, quantities and the total are read from it — then you confirm before it is saved.</small>
        </label>
        <div className="ledger-actions">
          <button type="button" className="button button-primary" onClick={readPaste}><ClipboardPaste size={15} aria-hidden="true" /> Read the message</button>
        </div>

        {preview && <div className="ledger-preview" role="region" aria-label="Check before saving">
          <p className="gate-title">Check before saving</p>
          <ul className="plain-list">
            {preview.items.map((item, index) => <li key={`${item.name}-${index}`}>
              {item.quantity} × {item.name}{item.size ? ` (${item.size})` : ''} — {item.line_total_ugx === null ? 'no price given' : formatUGX(item.line_total_ugx)}
            </li>)}
            {!preview.items.length && <li>No items were read — this will be saved with the total only.</li>}
          </ul>
          <p className="ledger-preview-total">Total: <b>{preview.total === null ? 'not stated' : formatUGX(preview.total)}</b></p>
          {preview.note && <p className="ledger-preview-note">Their note: “{preview.note}”</p>}
          <label className="field">Who is it? (optional, your own words)
            <input value={preview.customer} onChange={(event) => setPreview({ ...preview, customer: event.target.value })} placeholder="Amina — Ntinda" maxLength={60} />
          </label>
          <div className="ledger-actions">
            <button type="button" className="button button-primary" onClick={savePaste}>Save to ledger</button>
            <button type="button" className="button button-quiet" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>}

        <div className="panel-heading ledger-subhead"><h2>Add it by hand</h2></div>
        <div className="form-two">
          <label className="field">Who
            <input value={manual.customer} onChange={(event) => setManual({ ...manual, customer: event.target.value })} placeholder="Amina — Ntinda" maxLength={60} />
          </label>
          <label className="field">When
            <input type="date" value={manual.date} onChange={(event) => setManual({ ...manual, date: event.target.value })} />
          </label>
        </div>
        <label className="field">What they asked for
          <input value={manual.what} onChange={(event) => setManual({ ...manual, what: event.target.value })} placeholder="Barrier Serum 30 ml × 2" maxLength={120} />
        </label>
        <label className="field">Agreed total (UGX, optional)
          <input inputMode="numeric" value={manual.total} onChange={(event) => setManual({ ...manual, total: event.target.value })} placeholder="96000" />
          <small>Leave empty if the price is not agreed yet. The ledger will say so rather than guess.</small>
        </label>
        <div className="ledger-actions">
          <button type="button" className="button button-secondary" onClick={saveManual}><Plus size={15} aria-hidden="true" /> Add entry</button>
        </div>
      </section>

      <section className="data-panel" aria-labelledby="book-title">
        <div className="panel-heading">
          <h2 id="book-title">The book</h2>
          <span className="collection-count">{entries.length} entries</span>
        </div>

        <div className="ledger-filters" role="group" aria-label="Filter by status">
          <button type="button" className={`chip chip-button${statusFilter === 'all' ? ' is-on' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
          {LEDGER_STATUSES.map((status) => <button
            key={status}
            type="button"
            className={`chip chip-button${statusFilter === status ? ' is-on' : ''}`}
            onClick={() => setStatusFilter(status)}
          >{STATUS_LABELS[status]}</button>)}
        </div>

        {visible.length === 0
            ? <div className="empty-panel">
                <HardDrive size={22} aria-hidden="true" />
                <h3>{entries.length ? 'Nothing with that status.' : 'The ledger is empty.'}</h3>
                <p>{entries.length ? 'Switch the filter, or change a status below.' : 'Paste your first enquiry on the left. Nothing is created until you save it.'}</p>
              </div>
            : <ul className="ledger-list">
                {visible.map((entry) => <li key={entry.id} className={`ledger-entry ledger-entry-${entry.status}`}>
                  <div className="ledger-entry-top">
                    <b>{entry.customer || 'Unnamed enquiry'}</b>
                    <span className="ledger-date">{new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="ledger-items">{describeItems(entry.items)}</p>
                  <div className="ledger-entry-foot">
                    <strong>{entry.total_ugx === null ? 'Price not agreed' : formatUGX(entry.total_ugx)}</strong>
                    <span className={`chip chip-status-${entry.status}`}>{STATUS_LABELS[entry.status]}</span>
                  </div>
                  {entry.note && <p className="ledger-note">“{entry.note}”</p>}
                  <div className="ledger-controls">
                    <label className="sr-only" htmlFor={`status-${entry.id}`}>Status for {entry.customer || 'this enquiry'}</label>
                    <select id={`status-${entry.id}`} value={entry.status} onChange={(event) => changeStatus(entry.id, event.target.value as LedgerStatus)}>
                      {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                    <button type="button" className="button button-quiet button-small" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </button>
                  </div>
                </li>)}
              </ul>}
      </section>
    </div>

    <div className="ledger-toolbar">
      <button type="button" className="button button-primary" onClick={exportCsv}><Download size={15} aria-hidden="true" /> Export CSV</button>
      <button type="button" className="button button-secondary" onClick={exportJson}>Backup (JSON)</button>
      <button type="button" className="button button-secondary" onClick={() => importInput.current?.click()}>Restore backup</button>
      <button type="button" className="button button-danger" onClick={clearAll}>Delete everything</button>
      <input
        ref={importInput}
        type="file"
        accept="application/json,.json"
        aria-label="Restore a ledger backup file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importJson(file)
          event.target.value = ''
        }}
      />
    </div>

    <p className="studio-foot">
      Nothing on this page is sent to a server, and no customer can see it. Back to <Link to="/studio/catalogue">the catalogue studio</Link> ·
      the rules the shop works to are on <Link to="/policies">policies</Link>.
    </p>
  </div>
}
