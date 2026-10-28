import { expect, test } from '@playwright/test'

const ENQUIRY = `Hello PURITY SKIN, I would like to check these items:
1. Sample Serum (test only) — 30 ml — 2 × UGX 96,000 (UGX 48,000 each)
2. Sample Bar (test only) — 100 g — 1 × UGX 12,000
Total of listed prices: UGX 108,000 — delivery is not included.
My note: Please deliver on Saturday
This is an enquiry, not a paid order.`

test.beforeEach(async ({ page }) => {
  await page.goto('/studio/ledger')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('an enquiry pasted from WhatsApp becomes one checked entry', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/what did i promise/i)
  await expect(page.locator('.empty-panel')).toContainText(/the ledger is empty/i)

  await page.locator('textarea').fill(ENQUIRY)
  await page.getByRole('button', { name: /read the message/i }).click()

  const preview = page.getByRole('region', { name: /check before saving/i })
  await expect(preview).toContainText('2 × Sample Serum (test only)')
  await expect(preview).toContainText('1 × Sample Bar (test only)')
  await expect(preview).toContainText('UGX 108,000')
  await expect(preview).toContainText('Please deliver on Saturday')

  await page.getByPlaceholder('Amina — Ntinda').first().fill('Amina — Ntinda')
  await page.getByRole('button', { name: /save to ledger/i }).click()

  const entry = page.locator('.ledger-entry').first()
  await expect(entry).toContainText('Amina — Ntinda')
  await expect(entry).toContainText('UGX 108,000')
  await expect(entry).toContainText('New')
  await expect(page.locator('.ledger-stats').first()).toContainText('1')
})

test('status changes survive a reload and the CSV exports what is on screen', async ({ page }) => {
  await page.locator('textarea').fill(ENQUIRY)
  await page.getByRole('button', { name: /read the message/i }).click()
  await page.getByRole('button', { name: /save to ledger/i }).click()

  await page.locator('.ledger-controls select').selectOption('delivered')
  await page.reload()
  await expect(page.locator('.ledger-controls select')).toHaveValue('delivered')
  await expect(page.locator('.ledger-stats')).toContainText('UGX 108,000')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export csv/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^purity-skin-orders-\d{4}-\d{2}-\d{2}\.csv$/)
})

test('text it cannot read is refused instead of guessed', async ({ page }) => {
  await page.locator('textarea').fill('hey are you open tomorrow?')
  await page.getByRole('button', { name: /read the message/i }).click()
  await expect(page.getByRole('status')).toContainText(/nothing in that text looked like an enquiry/i)
  await expect(page.locator('.ledger-entry')).toHaveCount(0)
})

test('the page says plainly that this is not a backup', async ({ page }) => {
  await expect(page.locator('.ledger-warning')).toContainText(/this is not a backup/i)
  await expect(page.locator('.ledger-warning')).toContainText(/export the csv/i)
})
