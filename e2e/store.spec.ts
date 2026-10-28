import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('customer storefront is honest, readable, and fits a phone viewport', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /skincare, made/i })).toBeVisible()
  await expect(page.getByText(/the live collection is being prepared/i)).toBeVisible()
  await expect(page.getByText(/no products are listed online/i)).toHaveCount(0)
  await expect(page.getByRole('link', { name: /ask us on whatsapp/i })).toHaveAttribute('href', /wa\.me\/256757377624/)
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport)
  expect(errors).toEqual([])
})

test('owner route does not reveal a customer-facing admin unlock', async ({ page }) => {
  await page.goto('/owner')
  await expect(page.getByText(/owner access is not connected yet/i)).toBeVisible()
  await expect(page.getByText(/customers can browse the shop without signing in/i)).toBeVisible()
})

test('owner recovery route stays truthful when backend access is not configured', async ({ page }) => {
  await page.goto('/owner/reset-password')
  await expect(page.getByRole('heading', { name: /choose a new password/i })).toBeVisible()
  await expect(page.getByText(/password recovery is unavailable until/i)).toBeVisible()
})

test('public page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  const serious = results.violations.filter((violation) => ['serious','critical'].includes(violation.impact ?? ''))
  expect(serious).toEqual([])
})
