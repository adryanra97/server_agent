import { test, expect } from '@playwright/test';

test('UI-01 landing page loads', async ({ page }) => {
  // Buka halaman utama
  await page.goto('/');

  // Judul tab browser mengandung "TwinPeak"
  await expect(page).toHaveTitle(/TwinPeak/);

  // Judul besar di halaman terlihat
  await expect(page.getByRole('heading', { name: /What if your infrastructure had a Digital Twin/i })).toBeVisible();

  // Dua tombol utama terlihat
  await expect(page.getByRole('link', { name: 'Explore the Digital Twin' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inspect the API' })).toBeVisible();
});