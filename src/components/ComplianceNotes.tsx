import { AlertTriangle, FileWarning, Info } from 'lucide-react'
import type { CatalogProduct } from '../catalog/types'
import { COMPLIANCE_LABELS, complianceNotes, type ComplianceNote } from '../lib/compliance'

type Props = {
  products: CatalogProduct[]
  onSelect: (productId: string) => void
}

const LEVEL_ORDER: Record<ComplianceNote['level'], number> = { warning: 0, confirm: 1, record: 2 }
const LEVEL_CHIP: Record<ComplianceNote['level'], string> = {
  warning: 'Needs attention',
  confirm: 'Unconfirmed',
  record: 'Not recorded',
}

/**
 * The owner-facing half of the UNBS/PDPO record: what is missing, what is
 * unconfirmed, and what is already wrong. It comes before the product list on
 * purpose — a gap you cannot see is a gap you will not fill.
 *
 * Nothing is shown to a customer from this panel. Confirming a value here is
 * what makes it eligible to appear on the product page, and only when the owner
 * also switches customer display on.
 */
export function ComplianceNotes({ products, onSelect }: Props) {
  const rows = products
    .map((product) => ({ product, notes: complianceNotes(product) }))
    .filter((row) => row.notes.length > 0)
    .sort((a, b) => {
      const worstA = Math.min(...a.notes.map((note) => LEVEL_ORDER[note.level]))
      const worstB = Math.min(...b.notes.map((note) => LEVEL_ORDER[note.level]))
      return worstA - worstB || a.product.name.localeCompare(b.product.name)
    })

  if (products.length === 0) return null

  const totalWarnings = rows.reduce((count, row) => count + row.notes.filter((note) => note.level === 'warning').length, 0)
  const complete = rows.length === 0

  return (
    <section className="compliance-panel" aria-labelledby="compliance-notes-title">
      <div className="panel-heading">
        <h2 id="compliance-notes-title">Important notes</h2>
        <span className={`chip ${totalWarnings ? 'chip-blocked' : 'chip-published'}`}>
          {complete ? 'All records complete' : totalWarnings ? `${totalWarnings} to fix` : `${rows.length} to fill in`}
        </span>
      </div>

      <p className="compliance-intro">
        <Info size={14} aria-hidden="true" />
        <span>
          These are pack records for UNBS and PDPO purposes. They are owner-only: a value appears on the product page only when you
          record it, confirm you read it off the pack, and switch display on for that product. Nothing here is guessed by the site.
        </span>
      </p>

      {complete
        ? <p className="gate-pass"><FileWarning size={14} aria-hidden="true" /> Every product has a complete pack record. Nothing is waiting on you.</p>
        : <ul className="compliance-list">
            {rows.map(({ product, notes }) => <li key={product.id}>
              <div className="compliance-product">
                <button type="button" className="link-button" onClick={() => onSelect(product.id)}>
                  {product.name || 'Untitled draft'}
                </button>
                <span className={`chip chip-${product.status}`}>{product.status === 'published' ? 'Published' : 'Draft'}</span>
              </div>
              <ul className="compliance-note-list">
                {notes.map((note) => <li key={note.key} className={`compliance-note compliance-note-${note.level}`}>
                  {note.level === 'warning'
                    ? <AlertTriangle size={13} aria-hidden="true" />
                    : <span className="note-dot" aria-hidden="true" />}
                  <span>
                    <b>{note.title}</b>
                    <small>{note.detail}</small>
                  </span>
                  <span className="note-chip">{LEVEL_CHIP[note.level]}</span>
                </li>)}
              </ul>
            </li>)}
          </ul>}
    </section>
  )
}

export { COMPLIANCE_LABELS }
