import { test, expect } from '@playwright/test';

test('UI-09 QA Tester runs a simulation', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/demo');

  // Pilih role QA Tester
  await page.getByRole('button', { name: /QA Tester/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Buka SimPy workbench
  await page.getByRole('link', { name: 'Run SimPy simulation' }).click();
  await expect(page).toHaveURL(/\/simulation/);
  await expect(page.getByRole('heading', { name: /Build your scenario/ })).toBeVisible();

  // Centang cross-check (klik kotak hiasnya, lalu pastikan tercentang)
  await page.locator('.simpy-compare-box').click();
  await expect(page.getByRole('checkbox', { name: 'Cross-check against Rules' })).toBeChecked();

  // Jalankan simulasi
  await page.getByRole('button', { name: 'Run simulation & view replay' }).click();

  // Hasil evaluasi muncul
  await expect(page.getByRole('heading', { name: /Capacity outcome/ })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Capacity remains within the defined envelope.')).toBeVisible();

  // Limiting resource CPU, semua request selesai diproses
  const body = page.locator('body');
  await expect(body).toContainText(/Limiting resource\s*CPU/i);
  await expect(body).toContainText(/Arrived\s*3,000/i);
  await expect(body).toContainText(/Completed\s*3,000/i);
});