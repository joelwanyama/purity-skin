import { expect, test } from '@playwright/test'
import type { CatalogFile } from '../src/catalog/types'
import { fixtureCatalogue, fixtureProducts, seedCatalogue } from './fixtures'

// Test-only pack record. The committed catalogue keeps none of this.
const withPackRecord: CatalogFile = {
  ...fixtureCatalogue,
  products: fixtureProducts.map((product, index) =>
    index === 0
      ? {
          ...product,
          compliance: {
            qmark_status: { value: 'verified', confirmed_on: '2026-10-20T00:00:00.000Z' },
            manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: '2026-10-20T00:00:00.000Z' },
            // Recorded but never confirmed: it must stay hidden from customers.
            batch_lot: { value: 'B-2291', confirmed_on: null },
            expiry: { value: '2027-04', confirmed_on: '2026-10-20T00:00:00.000Z' },
            show_to_customers: true,
          },
        }
      : product,
  ),
}

test('a customer sees only the pack details the owner confirmed and published', async ({ page }) => {
  await seedCatalogue(page, withPackRecord)
  await page.goto('/shop/test-serum')

  const checks = page.locator('.detail-checks')
  await expect(checks).toBeVisible()
  await expect(checks.getByRole('heading', { name: /what we checked on the pack/i })).toBeVisible()

  const rows = checks.locator('dl > div')
  await expect(rows).toHaveCount(3)
  await expect(checks).toContainText('Seen on the pack')
  await expect(checks).toContainText('Kampala Cosmetics Ltd')
  await expect(checks).toContainText('Apr 2027')
  // The unconfirmed batch code is not shown, and no "not found" wording appears.
  await expect(checks).not.toContainText('B-2291')
  await expect(checks).not.toContainText(/not certified|not found/i)

  // The claim is bounded: a record, not a certification.
  await expect(checks).toContainText(/confirmed by us on 20 Oct 2026/i)
  await expect(checks).toContainText(/not a certification by this website/i)
  await expect(checks.getByRole('link', { name: /what this means/i })).toHaveAttribute('href', '/policies#pack-record')

  // A product with no record renders exactly as before: no empty block.
  await page.goto('/shop/test-bar')
  await expect(page.locator('.detail-checks')).toHaveCount(0)
})

test('the shop shows nothing when the owner has not switched customer display on', async ({ page }) => {
  const hidden: CatalogFile = {
    ...withPackRecord,
    products: fixtureProducts.map((product) => ({
      ...product,
      compliance: {
        qmark_status: { value: 'verified', confirmed_on: '2026-10-20T00:00:00.000Z' },
        manufacturer: { value: 'Kampala Cosmetics Ltd', confirmed_on: '2026-10-20T00:00:00.000Z' },
        batch_lot: { value: '', confirmed_on: null },
        expiry: { value: '', confirmed_on: null },
        show_to_customers: false,
      },
    })),
  }
  await seedCatalogue(page, hidden)
  await page.goto('/shop/test-serum')
  await expect(page.locator('.detail-checks')).toHaveCount(0)
})

test('the owner dashboard puts the pack-record gaps first', async ({ page }) => {
  await seedCatalogue(page, withPackRecord)
  await page.goto('/studio/catalogue')

  const panel = page.locator('.compliance-panel')
  await expect(panel.getByRole('heading', { name: /important notes/i })).toBeVisible()
  // It sits above the product list, not buried at the bottom of the page.
  const panelBox = await panel.boundingBox()
  const listBox = await page.locator('#draft-list').boundingBox()
  expect(panelBox!.y).toBeLessThan(listBox!.y)

  // The first product in the panel is the one with the unconfirmed batch code;
  // its confirmed fields must not be listed as gaps.
  const firstProduct = panel.locator('.compliance-list > li').first()
  await expect(firstProduct).toContainText(/sample serum/i)
  await expect(firstProduct).toContainText(/batch \/ lot is recorded but not confirmed/i)
  await expect(firstProduct).not.toContainText(/manufacturer/i)
  await expect(firstProduct).not.toContainText(/unbs q-mark not recorded/i)

  // A product with no record at all is reported, one line per field.
  const secondProduct = panel.locator('.compliance-list > li').nth(1)
  await expect(secondProduct).toContainText(/unbs q-mark not recorded/i)

  // The editor explains that nothing is shown until display is on.
  await expect(page.locator('#pack-record-title')).toBeVisible()
  await expect(page.getByText(/owner only/i).first()).toBeVisible()
})

test('the policies page explains the pack record in plain words', async ({ page }) => {
  await page.goto('/policies#pack-record')
  const section = page.locator('#pack-record')
  await expect(section.getByRole('heading', { level: 2 })).toContainText(/what "what we checked on the pack" means/i)
  await expect(section).toContainText(/read off the physical pack/i)
  await expect(section).toContainText(/not a certification/i)
  await expect(section).toContainText(/look for the q-mark/i)
})
