import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CatalogProduct } from '../catalog/types'
import { formatUGX, whatsappHref } from '../lib/format'
import { ProductPhoto } from './ProductPhoto'

type Props = {
  product: CatalogProduct
  whatsappNumber: string
  priority?: boolean
}

export function ProductCard({ product, whatsappNumber, priority = false }: Props) {
  const enquire = whatsappHref(whatsappNumber, `Hello PURITY SKIN, I would like to ask about ${product.name}.`)

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
          {enquire
            ? <a className="button button-quiet" href={enquire} target="_blank" rel="noreferrer">
                <MessageCircle size={15} aria-hidden="true" /> Ask about this
              </a>
            : <Link className="button button-quiet" to={`/shop/${product.slug}`}>
                Details <ArrowUpRight size={15} aria-hidden="true" />
              </Link>}
        </div>
      </div>
    </article>
  )
}
