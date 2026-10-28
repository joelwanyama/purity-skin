import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  { path: '/', heading: /skincare, made with intention/i },
  { path: '/shop', heading: /everything currently listed|no products are listed online/i },
  { path: '/how-to-order', heading: /four steps, one conversation/i },
  { path: '/about', heading: /formulated to fix\. sold honestly/i },
  { path: '/policies', heading: /how this shop actually works/i },
  { path: '/enquiry', heading: /nothing on your list yet|your enquiry/i },
]

test('public pages are honest, readable and fit a phone viewport', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  for (const entry of pages) {
    await page.goto(entry.path)
    await expect(page.getByRole('heading', { level: 1, name: entry.heading })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    expect(dimensions.scroll, `horizontal overflow on ${entry.path}`).toBeLessThanOrEqual(dimensions.viewport + 1)
  }

  expect(errors).toEqual([])
})

test('the shop never invents a catalogue and always offers WhatsApp', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.getByRole('heading', { name: /no products are listed online right now/i })).toBeVisible()
  await expect(page.locator('text=/UGX\\s?[\\d,]+/')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /check availability/i })).toHaveAttribute('href', /wa\.me\/256757377624/)
})

test('navigation reaches every public page from the header', async ({ page }) => {
  await page.goto('/')
  const mainNav = page.getByRole('navigation', { name: /main navigation/i })
  const mobileToggle = page.getByRole('button', { name: /open menu/i })

  // Phones collapse the header into a menu button; desktop shows the links inline.
  const openNav = async () => {
    if (await mobileToggle.isVisible()) await mobileToggle.click()
    await expect(page.getByRole('navigation', { name: /(main|mobile) navigation/i }).first()).toBeVisible()
  }
  const clickLink = async (name: string) => {
    await page.getByRole('navigation', { name: /(main|mobile) navigation/i })
      .getByRole('link', { name }).first().click()
  }

  await openNav()
  await clickLink('Policies')
  await expect(page).toHaveURL(/\/policies$/)
  await expect(page.getByRole('heading', { level: 1, name: /how this shop actually works/i })).toBeVisible()

  await openNav()
  await clickLink('Shop')
  await expect(page).toHaveURL(/\/shop$/)
  await expect(mainNav.or(page.getByRole('button', { name: /open menu/i }))).toBeVisible()
})

test('an unknown product link explains itself instead of erroring', async ({ page }) => {
  await page.goto('/shop/not-a-real-product')
  await expect(page.getByRole('heading', { name: /this product is not listed/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /go to the shop/i })).toBeVisible()
})

test('an unknown page returns a real 404 experience', async ({ page }) => {
  await page.goto('/this/route/does-not-exist')
  await expect(page.getByRole('heading', { name: /that page does not exist/i })).toBeVisible()
})

test('the catalogue studio is usable and kept out of search results', async ({ page }) => {
  await page.goto('/studio/catalogue')
  await expect(page.getByRole('heading', { name: /build the line-up before the database exists/i })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  await page.getByRole('button', { name: /add the first product/i }).click()
  await page.getByPlaceholder('Exactly as printed on the pack').fill('Barrier Serum')
  await page.getByRole('combobox', { name: 'Product type' }).fill('Serum')
  await page.getByPlaceholder('30 ml').fill('30 ml')
  await page.getByPlaceholder('Leave empty until confirmed').fill('45000')
  await page.getByPlaceholder(/used after cleansing|What it is/i).fill(
    'A lightweight daily serum used after cleansing and before moisturiser. Two or three drops is enough.',
  )

  const publish = page.getByRole('button', { name: /publish to shop/i })
  await expect(publish).toBeDisabled()
  await page.getByLabel(/the name, pack size and price are real/i).check()
  await page.getByLabel(/the wording and claims have been checked/i).check()
  await expect(publish).toBeEnabled()
  await publish.click()
  await expect(page.getByRole('button', { name: /unpublish/i })).toBeVisible()

  // The draft lives in this browser only; the public shop picks it up immediately.
  await page.goto('/shop')
  await expect(page.getByRole('link', { name: /barrier serum/i }).first()).toBeVisible()
  await expect(page.getByText('UGX 45,000')).toBeVisible()
  await expect(page.getByRole('img', { name: /photo slot for barrier serum/i })).toBeVisible()
})

for (const path of ['/', '/shop', '/how-to-order', '/policies', '/studio/catalogue', '/studio/ledger']) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    expect(serious).toEqual([])
  })
}
