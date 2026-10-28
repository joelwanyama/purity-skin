import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { CatalogFile } from '../src/catalog/types'
import { fixtureCatalogue, seedCatalogue } from './fixtures'

const WHATSAPP = /wa\.me\/256757377624/

function decodedMessage(href: string | null): string {
  expect(href, 'the send link should exist').toBeTruthy()
  const url = new URL(href as string)
  return url.searchParams.get('text') ?? ''
}

test('two products become one honest WhatsApp message', async ({ page }) => {
  await seedCatalogue(page)
  await page.goto('/shop')

  await page.getByRole('button', { name: /add sample serum \(test only\) to your enquiry/i }).click()
  await page.getByRole('button', { name: /add sample bar \(test only\) to your enquiry/i }).click()

  const bar = page.getByRole('region', { name: /your enquiry list/i })
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('2 items')
  await expect(bar).toContainText('UGX 60,000')

  await bar.getByRole('link', { name: /review enquiry/i }).click()
  await expect(page).toHaveURL(/\/enquiry$/)
  await expect(page.getByRole('heading', { level: 1, name: /your enquiry/i })).toBeVisible()
  await expect(page.locator('.enquiry-line')).toHaveCount(2)

  const send = page.getByRole('link', { name: /send this list on whatsapp/i })
  await expect(send).toHaveAttribute('href', WHATSAPP)
  const message = decodedMessage(await send.getAttribute('href'))
  expect(message).toContain('Sample Serum (test only) — 30 ml — 1 × UGX 48,000')
  expect(message).toContain('Sample Bar (test only) — 100 g — 1 × UGX 12,000')
  expect(message).toContain('Total of listed prices: UGX 60,000 — delivery is not included.')
  expect(message).toContain('This is an enquiry, not a paid order.')

  // The page must never imply a checkout, a reservation or an online payment.
  await expect(page.getByText(/nothing is paid on this site/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /pay|checkout|place order/i })).toHaveCount(0)
})

test('quantities change the total and removal is immediate', async ({ page }) => {
  await seedCatalogue(page)
  await page.goto('/shop')
  await page.getByRole('button', { name: /add sample bar \(test only\) to your enquiry/i }).click()
  await page.goto('/enquiry')

  await page.getByRole('button', { name: /one more sample bar/i }).click()
  await expect(page.locator('.enquiry-line')).toHaveCount(1)
  await expect(page.locator('.enquiry-unit')).toContainText('UGX 24,000 for 2')
  await expect(page.locator('.enquiry-totals')).toContainText('UGX 24,000')

  await page.getByRole('button', { name: /one fewer sample bar/i }).click()
  await expect(page.locator('.enquiry-unit')).toContainText('UGX 12,000 each')
  await expect(page.getByRole('button', { name: /one fewer sample bar/i })).toBeDisabled()

  await page.getByRole('button', { name: /remove/i }).click()
  await expect(page.getByRole('heading', { name: /nothing on your list yet/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /go to the shop/i })).toBeVisible()
})

test('a saved list survives a reload and carries no stale price', async ({ page }) => {
  await seedCatalogue(page)
  await page.goto('/shop')
  await page.getByRole('button', { name: /add sample serum \(test only\) to your enquiry/i }).click()
  await page.reload()
  await page.goto('/enquiry')
  await expect(page.locator('.enquiry-line')).toHaveCount(1)

  // The owner raises the price; the saved list must pick it up, not keep the old one.
  const raised: CatalogFile = {
    ...fixtureCatalogue,
    products: fixtureCatalogue.products.map((item) => (item.id === 'test-serum' ? { ...item, price_ugx: 52500 } : item)),
  }
  await page.evaluate((catalogue) => {
    window.localStorage.setItem('purity.catalog.v1', JSON.stringify(catalogue))
  }, raised)
  await page.reload()
  await expect(page.locator('.enquiry-line')).toContainText('UGX 52,500')
  const message = decodedMessage(await page.getByRole('link', { name: /send this list on whatsapp/i }).getAttribute('href'))
  expect(message).toContain('UGX 52,500')
  expect(message).not.toContain('48,000')
})

test('a product that is no longer listed leaves the list with a visible notice', async ({ page }) => {
  await seedCatalogue(page)
  await page.goto('/shop')
  await page.getByRole('button', { name: /add sample serum \(test only\) to your enquiry/i }).click()
  await page.getByRole('button', { name: /add sample bar \(test only\) to your enquiry/i }).click()

  const onlySerum: CatalogFile = { ...fixtureCatalogue, products: fixtureCatalogue.products.filter((item) => item.id === 'test-serum') }
  await page.evaluate((catalogue) => {
    window.localStorage.setItem('purity.catalog.v1', JSON.stringify(catalogue))
  }, onlySerum)

  await page.goto('/enquiry')
  await expect(page.locator('.enquiry-line')).toHaveCount(1)
  await expect(page.getByText(/no longer listed, so it was removed from this list/i)).toBeVisible()
  await page.getByRole('button', { name: /dismiss/i }).click()
  await expect(page.getByText(/no longer listed/i)).toHaveCount(0)
})

test('an empty shop never produces an enquiry, and the page says why', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.getByRole('button', { name: /to your enquiry/i })).toHaveCount(0)
  await expect(page.getByRole('region', { name: /your enquiry list/i })).toHaveCount(0)
  await page.goto('/enquiry')
  await expect(page.getByRole('heading', { level: 1, name: /nothing on your list yet/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /send this list on whatsapp/i })).toHaveCount(0)
})

test('the enquiry page is accessible and fits a phone', async ({ page }) => {
  await seedCatalogue(page)
  await page.goto('/shop')
  await page.getByRole('button', { name: /add sample serum \(test only\) to your enquiry/i }).click()
  await page.getByRole('button', { name: /add sample bar \(test only\) to your enquiry/i }).click()
  await page.goto('/enquiry')

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])

  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1)
})
