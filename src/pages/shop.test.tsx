import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { CatalogProvider } from '../catalog/CatalogProvider'
import { EnquiryProvider } from '../order/EnquiryProvider'
import { STORAGE_KEY } from '../catalog/storage'
import { Home } from './Home'
import { Shop } from './Shop'
import { ProductDetail } from './ProductDetail'
import { NotFound } from './NotFound'
import { Policies } from './Policies'

function renderAt(ui: React.ReactElement, path = '/') {
  return render(
    <CatalogProvider>
      <EnquiryProvider>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </EnquiryProvider>
    </CatalogProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('public shop with the committed, honestly empty catalogue', () => {
  it('shows no invented products or prices and offers a real WhatsApp route', () => {
    renderAt(<Home />)
    expect(screen.getByRole('heading', { name: /skincare, made with intention/i })).toBeInTheDocument()
    expect(screen.getByText(/the live collection is being prepared/i)).toBeInTheDocument()
    expect(screen.queryByText(/UGX\s?[\d,]+/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ask us on whatsapp/i }))
      .toHaveAttribute('href', expect.stringContaining('https://wa.me/256757377624'))
  })

  it('keeps the shop page truthful instead of inventing a catalogue', () => {
    renderAt(<Shop />, '/shop')
    expect(screen.getByRole('heading', { name: /no products are listed online right now/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /search/i })).not.toBeInTheDocument()
  })

  it('explains policies without promising anything the shop cannot honour', () => {
    renderAt(<Policies />, '/policies')
    expect(screen.getByRole('heading', { name: /how this shop actually works/i })).toBeInTheDocument()
    expect(screen.getByText(/we do not make medical claims/i)).toBeInTheDocument()
    expect(screen.getByText(/delivery areas, timing and fees are agreed/i)).toBeInTheDocument()
  })

  it('returns a helpful 404 instead of a blank screen', () => {
    renderAt(<NotFound />, '/nope')
    expect(screen.getByRole('heading', { name: /that page does not exist/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to the shop/i })).toHaveAttribute('href', '/shop')
  })
})

describe('product detail for an unpublished product', () => {
  it('refuses to show a product that is not published', () => {
    renderAt(<ProductDetail />, '/shop/does-not-exist')
    expect(screen.getByRole('heading', { name: /this product is not listed/i })).toBeInTheDocument()
    expect(screen.queryByText(/UGX/)).not.toBeInTheDocument()
  })
})

describe('published catalogue from browser storage', () => {
  it('renders published products with a confirmed price once a draft exists', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      note: '',
      settings: { business_name: 'PURITY SKIN', whatsapp_number: '256757377624', location: 'Kampala, Uganda', delivery_summary: '' },
      products: [{
        id: 'p1', slug: 'barrier-serum', name: 'Barrier Serum', category: 'Serum', size_label: '30 ml',
        summary: 'Lightweight daily serum.', description: 'A lightweight daily serum used after cleansing and before moisturiser, two or three drops.',
        price_ugx: 45000, image_path: null, photo_state: 'pending', status: 'published',
        owner_confirmed: true, claims_checked: true,
        created_at: '2026-10-28T00:00:00.000Z', updated_at: '2026-10-28T00:00:00.000Z',
      }],
    }))

    renderAt(<Shop />, '/shop')
    expect(screen.getByRole('heading', { name: /everything currently listed/i })).toBeInTheDocument()
    const productLinks = screen.getAllByRole('link', { name: /barrier serum/i })
    expect(productLinks.length).toBeGreaterThan(0)
    expect(productLinks[0]).toHaveAttribute('href', '/shop/barrier-serum')
    expect(screen.getByText('UGX 45,000')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /photo slot for barrier serum/i })).toBeInTheDocument()
  })
})
