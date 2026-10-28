import { useMemo, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { ProductCard } from '../components/ProductCard'
import { categoriesOf, filterProducts, publishedProducts } from '../catalog/storage'
import { useShopCatalog } from '../catalog/useShopCatalog'
import { whatsappHref } from '../lib/format'
import { usePageMeta } from '../lib/pageMeta'

export function Shop() {
  usePageMeta({
    title: 'Shop the collection',
    description: 'Every PURITY SKIN product currently published, with confirmed prices in Ugandan shillings and a WhatsApp enquiry for each item.',
    path: '/shop',
  })
  const { products, settings } = useShopCatalog()
  const list = publishedProducts(products)
  const categories = useMemo(() => categoriesOf(list), [list])
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const visible = filterProducts(list, { category, query })
  const generalWa = whatsappHref(settings.whatsapp_number, 'Hello PURITY SKIN, please tell me what is currently available.')

  return <div className="page">
    <header className="page-header">
      <p className="section-kicker">THE SHOP</p>
      <h1>Everything currently listed.</h1>
      <p className="page-intro">Prices are shown in Ugandan shillings. Nothing is added to your cart here — you confirm the order with us on WhatsApp.</p>
    </header>

    {list.length === 0
      ? <div className="shop-state">
          <p className="state-label">CURRENT AVAILABILITY</p>
          <h2>No products are listed online right now.</h2>
          <p>The shop stays empty until a product has a confirmed price and an approved photo. Ask us directly and we will tell you what is ready to order.</p>
          {generalWa && <a className="button button-primary" href={generalWa} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> Check availability</a>}
        </div>
      : <>
        <div className="shop-controls">
          <div className="filter-row" role="group" aria-label="Filter by product type">
            {['All', ...categories].map((item) => <button
              key={item}
              type="button"
              className={`filter-chip${category === item ? ' is-active' : ''}`}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >{item}</button>)}
          </div>
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the shop" />
          </label>
        </div>

        <p className="result-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'product' : 'products'}{category !== 'All' ? ` in ${category}` : ''}{query ? ` matching “${query}”` : ''}</p>

        {visible.length === 0
          ? <div className="empty-panel">
              <Search size={22} aria-hidden="true" />
              <h3>Nothing matches that yet.</h3>
              <p>Try a different product type or clear the search.</p>
              <div className="empty-actions"><button type="button" className="button button-secondary" onClick={() => { setCategory('All'); setQuery('') }}>Clear filters</button></div>
            </div>
          : <div className="product-grid">
              {visible.map((product, index) => <ProductCard key={product.id} product={product} whatsappNumber={settings.whatsapp_number} priority={index === 0} />)}
            </div>}
      </>}
  </div>
}
