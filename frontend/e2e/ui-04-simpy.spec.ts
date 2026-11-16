import { test, expect } from '@playwright/test';

test('UI-04 example evaluation with SimPy engine', async ({ page }) => {
  await page.goto('/');

  const placeholder = page.getByText('Run the example to see the estimated resource pressure');
  await expect(placeholder).toBeVisible();

  // Pilih SimPy lalu klik Evaluate
  await page.getByText('SimPy', { exact: true }).first().click();
  await page.getByText('Evaluate this example').click();

  // Hasil muncul
  await expect(placeholder).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('Capacity result')).toBeVisible();
  await expect(page.getByText('Lolos Bersyarat')).toBeVisible();

  // Angka CPU sekitar 90% (hasil simulasi, jadi tidak dicek persis)
  await expect(page.locator('body')).toContainText(/CPU utilization\s*9\d\.\d%/i);
  await expect(page.locator('body')).toContainText(/Bottleneck:\s*cpu/i);
});