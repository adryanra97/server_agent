import { test, expect } from '@playwright/test';

test('UI-13 Integration Engineer tests a mitigation', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/demo');

  // Pilih role Integration Engineer
  await page.getByRole('button', { name: /Integration Engineer/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Buka antrean insiden dari dashboard
  await page.getByRole('link', { name: 'Open incident queue' }).click();
  await expect(page).toHaveURL(/\/incident/);
  await expect(page.getByRole('heading', { name: /Incident response/ }).first()).toBeVisible();
  await expect(page.getByText('Reproduce & test').first()).toBeVisible();

  // Buka insiden, lalu jalankan tes mitigasi
  await page.locator('summary').first().click();
  await page.getByRole('button', { name: 'Test mitigation' }).click();
  await page.getByRole('button', { name: 'Run before / after SimPy' }).click();

  // Hasil before/after muncul
  await expect(
    page.getByText(/Original SimPy engine executed both scenarios/)
  ).toBeVisible({ timeout: 30000 });

  // Tombol PDF ada, tapi TIDAK diklik
  await expect(page.getByRole('button', { name: 'Download incident PDF' })).toBeVisible();
});

// Pending: diaktifkan setelah download PDF sudah jalan
test.fixme('UI-13b Download incident PDF', async ({ page }) => {
  // Nanti: klik Download incident PDF, lalu cek file terunduh
});