import { test, expect } from '@playwright/test';

test('UI-12 Technical Lead runs the release alignment analysis', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/demo');

  // Pilih role Technical Lead
  await page.getByRole('button', { name: /Technical Lead/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Buka Release alignment dari dashboard
  await page.getByRole('link', { name: 'Review release alignment' }).click();
  await expect(page).toHaveURL(/\/alignment/);
  await expect(page.getByRole('heading', { name: /Release alignment/ }).first()).toBeVisible();
  await expect(page.getByText('Review & decide')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Evaluate production capacity/ })).toBeVisible();

  // Jalankan analisis
  await page.getByRole('button', { name: 'Run simulated analysis' }).click();

  // Hasil simulasi muncul
  await expect(page.getByText(/Elapsed time includes draining queued requests/)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Baseline performance scenario for the release alignment demo/)).toBeVisible();

  // Bagian keputusan cycle siap dipakai
  await expect(page.getByRole('heading', { name: /Choose the next step/ })).toBeVisible();
  await expect(page.getByText('Return to Dev')).toBeVisible();
  await expect(page.getByText('Forward for sign-off')).toBeVisible();
  await expect(page.getByPlaceholder('Record the reasoning and required next steps')).toBeVisible();
  await expect(page.getByRole('button', { name: /Review decision/ })).toBeEnabled();

  // Review decision TIDAK diklik, supaya antrean sign-off PM tidak berubah
});