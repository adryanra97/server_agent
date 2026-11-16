import { test, expect } from '@playwright/test';

test('UI-02 header navigation', async ({ page }) => {
  await page.goto('/');

  // Klik "Engines", halaman pindah ke bagian Engines
  await page.getByRole('link', { name: 'Engines', exact: true }).click();
  await expect(page).toHaveURL(/#engines/);
  await expect(page.locator('#engines')).toBeInViewport();

  // Klik "How it works", halaman pindah ke bagian How it works
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  await expect(page).toHaveURL(/#how-it-works/);
  await expect(page.locator('#how-it-works')).toBeInViewport();

  // Klik "API Docs", halaman Swagger terbuka di tab baru
  const tabBaruPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'API Docs', exact: true }).click();
  const tabBaru = await tabBaruPromise;
  await expect(tabBaru).toHaveURL(/\/docs/);
});