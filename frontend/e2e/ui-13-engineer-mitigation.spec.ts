import { test, expect } from '@playwright/test';

test('UI-13 Integration Engineer tests a mitigation', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/demo');
  await expect(page.getByText('Scenario evidence is ready')).toBeVisible({ timeout: 45000 });

  // Pilih role Integration Engineer
  await page.getByRole('button', { name: /Integration Engineer/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Buka antrean insiden dari dashboard
  await page.getByRole('link', { name: 'Open incident queue' }).click();
  await expect(page).toHaveURL(/\/incident/);
  await expect(page.getByRole('heading', { name: /Incident response/ }).first()).toBeVisible();
  await expect(page.getByText('Reproduce & test').first()).toBeVisible();

  // The QRIS starter incident must exist before running the mitigation.
  const incident = page.locator('.role-list-panel .tp-case-record').first();
  await expect(incident).toBeVisible();
  await incident.locator('.tp-case-summary').click();
  await page.getByRole('button', { name: 'Test mitigation' }).click();
  await page.getByRole('button', { name: 'Run before / after SimPy' }).click();

  // Hasil before/after muncul
  await expect(
    page.getByText(/Original SimPy engine executed both scenarios/)
  ).toBeVisible({ timeout: 30000 });
  await expect(incident.locator('.role-before-after')).toBeVisible();

  // Tombol PDF ada, tapi TIDAK diklik
  await expect(page.getByRole('button', { name: 'Download incident PDF' })).toBeVisible();
});

