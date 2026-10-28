import { Check, ShieldCheck, X } from 'lucide-react'
import type { CatalogProduct, ComplianceKey, ProductCompliance } from '../catalog/types'
import {
  COMPLIANCE_LABELS, complianceSummary, customerFacingCompliance, emptyCompliance, formatConfirmedDate, QMARK_LABELS,
} from '../lib/compliance'

type Props = {
  product: CatalogProduct
  onChange: (compliance: ProductCompliance) => void
}

const today = () => new Date().toISOString()

const TEXT_FIELDS: Array<{ key: Exclude<ComplianceKey, 'qmark_status' | 'expiry'>; placeholder: string; hint: string }> = [
  { key: 'manufacturer', placeholder: 'Manufacturer as printed', hint: 'The manufacturer or licence holder printed on the pack. Leave empty if you cannot read it.' },
  { key: 'batch_lot', placeholder: 'Batch or lot code', hint: 'Copy the batch or lot code as printed. It lets you trace a problem to one batch.' },
]

/**
 * The pack record editor. Every value here is typed by the owner from the
 * physical pack; the site never fills one in. Two separate acts are needed
 * before a customer sees anything: confirming a field, then switching display on.
 */
export function ComplianceEditor({ product, onChange }: Props) {
  const compliance = product.compliance ?? emptyCompliance()
  const summary = complianceSummary(product)
  const shown = customerFacingCompliance(product)
  const setField = (key: ComplianceKey, patch: Partial<ProductCompliance[ComplianceKey]>) => {
    onChange({ ...compliance, [key]: { ...compliance[key], ...patch } })
  }
  const anyConfirmed = summary.confirmed > 0

  return (
    <section className="compliance-editor" aria-labelledby="pack-record-title">
      <div className="pack-record-head">
        <p className="gate-title" id="pack-record-title"><ShieldCheck size={14} aria-hidden="true" /> Pack record (owner only)</p>
        <span className="collection-count">{summary.confirmed} of 4 confirmed{summary.shown ? ` · ${summary.shown} shown` : ''}</span>
      </div>
      <p className="compliance-hint">Optional. Fill in what you can read off the pack, confirm it, then decide whether customers see it.</p>

      <label className="field">UNBS Q-Mark
        <select
          value={compliance.qmark_status.value}
          onChange={(event) => setField('qmark_status', { value: event.target.value, confirmed_on: null })}
        >
          <option value="">Not recorded</option>
          {(['verified', 'not_applicable', 'unverified'] as const).map((value) =>
            <option key={value} value={value}>{QMARK_LABELS[value]}</option>)}
        </select>
        <FieldConfirm
          keyName="qmark_status"
          value={compliance.qmark_status.value}
          confirmedOn={compliance.qmark_status.confirmed_on}
          onConfirm={(date) => setField('qmark_status', { confirmed_on: date })}
        />
      </label>

      {TEXT_FIELDS.map((field) => <label className="field" key={field.key}>{COMPLIANCE_LABELS[field.key]}
        <input
          value={compliance[field.key].value}
          onChange={(event) => setField(field.key, { value: event.target.value, confirmed_on: null })}
          placeholder={field.placeholder}
          maxLength={80}
        />
        <FieldConfirm
          keyName={field.key}
          value={compliance[field.key].value}
          confirmedOn={compliance[field.key].confirmed_on}
          onConfirm={(date) => setField(field.key, { confirmed_on: date })}
        />
      </label>)}

      <label className="field">Expiry (as printed)
        <input
          type="month"
          value={compliance.expiry.value}
          onChange={(event) => setField('expiry', { value: event.target.value, confirmed_on: null })}
        />
        <FieldConfirm
          keyName="expiry"
          value={compliance.expiry.value}
          confirmedOn={compliance.expiry.confirmed_on}
          onConfirm={(date) => setField('expiry', { confirmed_on: date })}
        />
      </label>

      <label className={`toggle-row pack-display${anyConfirmed ? '' : ' is-disabled'}`}>
        <input
          type="checkbox"
          checked={compliance.show_to_customers && anyConfirmed}
          disabled={!anyConfirmed}
          onChange={(event) => onChange({ ...compliance, show_to_customers: event.target.checked })}
        />
        <span>
          <b>Show my confirmed pack details to customers</b>
          <small>
            {!anyConfirmed
              ? 'Confirm at least one field first. Until then nothing about the pack reaches the shop.'
              : !compliance.show_to_customers
                ? `${summary.confirmed} of 4 confirmed, currently hidden. Switch this on when you want the product page to show them.`
                : shown.length
                  ? `Showing ${shown.map((row) => row.label.toLowerCase()).join(', ')} on the product page.`
                  : 'On, but nothing is safe to show yet — a "not found" Q-Mark stays hidden either way.'}
          </small>
        </span>
      </label>
    </section>
  )
}

function FieldConfirm({ value, confirmedOn, onConfirm }: { keyName: ComplianceKey; value: string; confirmedOn: string | null; onConfirm: (date: string | null) => void }) {
  if (!value.trim()) return <small className="confirm-note">Not recorded — customers see nothing for this line.</small>
  if (confirmedOn) {
    return <small className="confirm-note confirm-note-ok">
      <Check size={12} aria-hidden="true" /> Confirmed from the pack on {formatConfirmedDate(confirmedOn)}
      <button type="button" className="link-button" onClick={() => onConfirm(null)}>
        <X size={11} aria-hidden="true" /> undo
      </button>
    </small>
  }
  return <small className="confirm-note confirm-note-todo">
    Recorded, not confirmed — hidden from customers.
    <button type="button" className="link-button" onClick={() => onConfirm(today())}>
      I checked this on the pack
    </button>
  </small>
}
