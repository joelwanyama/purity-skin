import { Check, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CatalogProduct } from '../catalog/types'
import { formatUGX } from '../lib/format'
import { useEnquiry } from '../order/useEnquiry'
import { ProductPhoto } from './ProductPhoto'

type Props = {
  product: CatalogProduct
  priority?: boolean
}

export function ProductCard({ product, priority = false }: Props) {
  const { add, quantityOf } = useEnquiry()
  const inList = quantityOf(product.id)

  return (
    <article className="product-card">
      <Link className="card-visual" to={`/shop/${product.slug}`} aria-label={`${product.name} — view details`}>
        <ProductPhoto
          name={product.name}
          imagePath={product.image_path}
          photoState={product.photo_state}
          priority={priority}
        />
      </Link>
      <div className="card-body">
        <p className="card-meta">
          <span>{product.category || 'PURITY SKIN'}</span>
          {product.size_label && <span>{product.size_label}</span>}
        </p>
        <h3><Link to={`/shop/${product.slug}`}>{product.name}</Link></h3>
        <p className="card-summary">{product.summary || product.description}</p>
        <div className="card-foot">
          <strong>{formatUGX(product.price_ugx)}</strong>
          <div className="card-actions">
            {inList > 0
              ? <Link className="button button-secondary button-small card-added" to="/enquiry">
                  <Check size={14} aria-hidden="true" /> In enquiry · {inList}
                </Link>
              : <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => add(product)}
                  aria-label={`Add ${product.name} to your enquiry`}
                >
                  <Plus size={14} aria-hidden="true" /> Add
                </button>}
          </div>
        </div>
      </div>
    </article>
  )
}
