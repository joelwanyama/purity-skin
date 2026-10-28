import { expect, test } from '@playwright/test'

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
