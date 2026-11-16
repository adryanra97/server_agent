import { test, expect } from '@playwright/test';

test('UI-03 example evaluation with Rules engine', async ({ page }) => {
  await page.goto('/');

  const placeholder = page.getByText('Run the example to see the estimated resource pressure');
  await expect(placeholder).toBeVisible();

  // Pilih Rules lalu klik Evaluate
  await page.getByText('Rules', { exact: true }).first().click();
  await page.getByText('Evaluate this example').click();

  // Hasil muncul
  await expect(placeholder).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('Capacity result')).toBeVisible();
  await expect(page.getByText('Lolos Bersyarat')).toBeVisible();

  // Angka CPU harus tepat 90.0% dan bottleneck-nya cpu
  await expect(page.getByText('90.0%')).toBeVisible();
  await expect(page.locator('body')).toContainText(/Bottleneck:\s*cpu/i);
});