import { test, expect } from '@playwright/test';

test('UI-06 return to main website', async ({ page }) => {
  await page.goto('/demo');

  // Klik "Main website" di pojok kanan atas
  await page.getByRole('link', { name: /Main website/ }).click();

  // Halaman utama terbuka
  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', { name: /What if your infrastructure had/i })
  ).toBeVisible();
});