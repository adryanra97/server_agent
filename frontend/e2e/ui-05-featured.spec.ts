import { test, expect } from '@playwright/test';

test('UI-05 featured scenario details', async ({ page }) => {
  await page.goto('/demo');

  // Skenario unggulan tampil
  await expect(page.getByText('QRIS Payment').first()).toBeVisible();
  await expect(page.getByText('Release candidate').first()).toBeVisible();

  // Data baseline sesuai: 45 RPS, 4 vCPU, 16 GB RAM
  await expect(page.locator('body')).toContainText(/45 RPS/);
  await expect(page.locator('body')).toContainText(/4 vCPU/);
  await expect(page.locator('body')).toContainText(/16 GB RAM/);

  // Pesan loading hilang setelah evaluasi selesai
  await expect(page.getByText(/Running initial model evaluation/)).toBeHidden({ timeout: 20000 });

  // Langkah journey tampil dan evaluasi selesai
  await expect(page.getByText('QA evidence').first()).toBeVisible();
  await expect(page.getByText('Technical review').first()).toBeVisible();
  await expect(page.getByText('Scenario evidence is ready')).toBeVisible({ timeout: 45000 });
});