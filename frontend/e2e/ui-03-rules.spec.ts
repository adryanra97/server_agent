import { test, expect } from '@playwright/test';

test('UI-03 example evaluation with Rules engine', async ({ page }) => {
  await page.goto('/');

  const placeholder = page.getByText('Run the example to see the estimated resource pressure');
  await expect(placeholder).toBeVisible();

  // Pilih Rules lalu klik Evaluate
  await page.getByText('Rules', { exact: true }).first().click();
  await page.getByText('Evaluate this example').click();

  // The result must come from the real Rules API, not the placeholder.
  const result = page.locator('.truth-result');
  await expect(result).toBeVisible({ timeout: 20000 });
  await expect(placeholder).toBeHidden();
  await expect(result.getByText('Lolos Bersyarat')).toBeVisible();
  await expect(result.getByText('90.0%')).toBeVisible();
  await expect(result).toContainText(/Bottleneck:\s*cpu/i);
});