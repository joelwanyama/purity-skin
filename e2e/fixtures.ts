import type { Page } from '@playwright/test'
import type { CatalogFile, CatalogProduct } from '../src/catalog/types'

/**
 * Test-only catalogue. These products exist inside tests and nowhere else: the
 * committed catalogue stays empty until the owner supplies real products.
 * Every name says "sample" so a fixture can never be mistaken for real stock.
 */
function product(overrides: Partial<CatalogProduct> & Pick<CatalogProduct, 'id' | 'slug' | 'name'>): CatalogProduct {
  return {
    category: 'Sample',
    size_label: '30 ml',
    summary: 'Sample product used only by the automated tests.',
    description: 'Sample product used only by the automated tests. It is not real stock and is never published to the shop.',
    price_ugx: 48000,
    image_path: null,
    photo_state: 'pending',
    status: 'published',
    owner_confirmed: true,
    claims_checked: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export const fixtureProducts: CatalogProduct[] = [
  product({ id: 'test-serum', slug: 'test-serum', name: 'Sample Serum (test only)', summary: 'Sample serum used only by tests.' }),
  product({
    id: 'test-bar',
    slug: 'test-bar',
    name: 'Sample Bar (test only)',
    category: 'Sample Soap',
    size_label: '100 g',
    price_ugx: 12000,
    summary: 'Sample bar used only by tests.',
  }),
]

export const fixtureCatalogue: CatalogFile = {
  version: 1,
  note: 'Test fixture. Never committed as shop data.',
  settings: {
    business_name: 'PURITY SKIN',
    whatsapp_number: '256757377624',
    location: 'Kampala, Uganda',
    delivery_summary: 'Delivery is arranged in the chat.',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  products: fixtureProducts,
}

/**
 * Puts the fixture catalogue in this browser as the active catalogue.
 *
 * Storage is written after the app has booted once and then reloaded, so a test
 * can change the catalogue later (a price rise, a product unpublished) without
 * an init script quietly restoring the original on the next navigation.
 */
export async function seedCatalogue(page: Page, catalogue: CatalogFile = fixtureCatalogue): Promise<void> {
  await page.goto('/shop')
  await page.evaluate((value) => {
    window.localStorage.setItem('purity.catalog.v1', JSON.stringify(value))
  }, catalogue)
  await page.reload()
}
