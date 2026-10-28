import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Storefront } from './Storefront'

describe('public storefront with no project configured', () => {
  it('does not invent products or prices and provides a real WhatsApp route', async () => {
    render(<MemoryRouter><Storefront /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /skincare, made with intention/i })).toBeInTheDocument()
    expect(await screen.findByText(/the live collection is being prepared/i)).toBeInTheDocument()
    expect(screen.queryByText(/UGX 15,000/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ask us on whatsapp/i })).toHaveAttribute('href', expect.stringContaining('https://wa.me/256757377624'))
  })
})
