import { test, expect } from '@playwright/test';

test('UI-04 example evaluation with SimPy engine', async ({ page }) => {
  await page.goto('/');

  const placeholder = page.getByText('Run the example to see the estimated resource pressure');
  await expect(placeholder).toBeVisible();

  // Pilih SimPy lalu klik Evaluate
  await page.getByText('SimPy', { exact: true }).first().click();
  await page.getByText('Evaluate this example').click();

  // Confirm a measured SimPy response without requiring an exact sampled value.
  const result = page.locator('.truth-result');
  await expect(result).toBeVisible({ timeout: 20000 });
  await expect(placeholder).toBeHidden();
  await expect(result.getByText('Lolos Bersyarat')).toBeVisible();
  await expect(result).toContainText(/CPU utilization\s*\d+(?:\.\d+)?%/i);
  await expect(result).toContainText(/Bottleneck:\s*cpu/i);
});