import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { CatalogProvider } from '../catalog/CatalogProvider'
import { STORAGE_KEY } from '../catalog/storage'
import { Studio } from './Studio'

function renderStudio() {
  return render(
    <CatalogProvider>
      <MemoryRouter><Studio /></MemoryRouter>
    </CatalogProvider>,
  )
}

/** Fields are addressed by their unique placeholders to avoid label ambiguity. */
function fill(placeholder: string | RegExp, value: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })
}

function gateBlock(): HTMLElement {
  const block = document.querySelector('.gate-block')
  if (!block) throw new Error('publish gate not rendered')
  return block as HTMLElement
}

beforeEach(() => {
  localStorage.clear()
})

describe('catalogue studio', () => {
  it('starts from an honestly empty catalogue', () => {
    renderStudio()
    expect(screen.getByRole('heading', { name: /build the line-up before the database exists/i })).toBeInTheDocument()
    expect(screen.getByText(/the catalogue is honestly empty/i)).toBeInTheDocument()
  })

  it('keeps publish disabled until the honesty checks are met', () => {
    renderStudio()
    fireEvent.click(screen.getByRole('button', { name: /add the first product/i }))

    const publish = screen.getByRole('button', { name: /publish to shop/i })
    expect(publish).toBeDisabled()

    fill('Exactly as printed on the pack', 'Barrier Serum')
    fill('Serum', 'Serum')
    fill('30 ml', '30 ml')
    fill('Leave empty until confirmed', '45000')
    fill(/used after cleansing|What it is/i, 'A lightweight daily serum used after cleansing and before moisturiser. Two or three drops is enough.')

    // Still blocked: the two confirmations are what stop unverified data going live.
    expect(publish).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/the name, pack size and price are real/i))
    expect(publish).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/the wording and claims have been checked/i))
    expect(publish).toBeEnabled()

    fireEvent.click(publish)
    expect(screen.getByRole('button', { name: /unpublish/i })).toBeInTheDocument()
  })

  it('warns about medical claims as they are typed', () => {
    renderStudio()
    fireEvent.click(screen.getByRole('button', { name: /add the first product/i }))
    fill(/used after cleansing|What it is/i, 'This serum cures acne and gives permanent results for everyone who uses it daily.')

    const gate = within(gateBlock())
    expect(gate.getByText(/cure" claims need documented evidence/i)).toBeInTheDocument()
    expect(gate.getByText(/"permanent" is an unprovable claim/i)).toBeInTheDocument()
  })

  it('writes drafts to this browser automatically, so nothing is lost on navigation', () => {
    renderStudio()
    fireEvent.click(screen.getByRole('button', { name: /add the first product/i }))
    fill('Exactly as printed on the pack', 'Gentle Cleanser')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.products).toHaveLength(1)
    expect(stored.products[0].name).toBe('Gentle Cleanser')
    expect(stored.products[0].status).toBe('draft')
  })

  it('publishes a product into the shop data without sending it anywhere', () => {
    renderStudio()
    fireEvent.click(screen.getByRole('button', { name: /add the first product/i }))
    fill('Exactly as printed on the pack', 'Barrier Serum')
    fill('Serum', 'Serum')
    fill('30 ml', '30 ml')
    fill('Leave empty until confirmed', '45000')
    fill(/used after cleansing|What it is/i, 'A lightweight daily serum used after cleansing and before moisturiser. Two or three drops is enough.')
    fireEvent.click(screen.getByLabelText(/the name, pack size and price are real/i))
    fireEvent.click(screen.getByLabelText(/the wording and claims have been checked/i))
    fireEvent.click(screen.getByRole('button', { name: /publish to shop/i }))

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.products[0].status).toBe('published')
    expect(stored.products[0].price_ugx).toBe(45000)
  })

  it('demotes a hand-edited published product that has no price on import', async () => {
    renderStudio()
    const payload = {
      version: 1,
      note: '',
      settings: { business_name: 'PURITY SKIN', whatsapp_number: '256757377624', location: 'Kampala, Uganda' },
      products: [{
        id: 'x', slug: 'mystery-serum', name: 'Mystery Serum', category: 'Serum', size_label: '30 ml',
        summary: '', description: 'Imported product without a published price, which must not appear in the shop.',
        price_ugx: null, image_path: null, photo_state: 'pending', status: 'published',
        owner_confirmed: true, claims_checked: true,
      }],
    }
    const file = new File([JSON.stringify(payload)], 'catalog.data.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    expect(await screen.findByText(/unpublished on import/i)).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.products[0].status).toBe('draft')
  })
})
