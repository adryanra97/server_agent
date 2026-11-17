import { test, expect } from '@playwright/test';

test('UI-11 Project Manager opens the sign-off queue', async ({ page }) => {
  await page.goto('/demo');

  // Pilih role Project Manager
  await page.getByRole('button', { name: /Project Manager/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Buka halaman sign-off
  await page.goto('/signoff');
  await expect(page.getByRole('heading', { name: /A documented decision before deployment/ })).toBeVisible();

  // Panel tanggung jawab PM
  await expect(page.getByText('Approve or reject').first()).toBeVisible();

  // Antrean dokumen sign-off dan penghitung pending
  await expect(page.getByRole('heading', { name: 'Release sign-off documents' })).toBeVisible();
  const pending = page.getByText(/\d+ pending/);
  await expect(pending).toBeVisible();

  // Kalau 0 pending, pesan kosong harus muncul
  if ((await pending.innerText()).trim().startsWith('0')) {
    await expect(page.getByText('No matching records yet.')).toBeVisible();
    await expect(page.getByText(/QA must submit a real simulation/)).toBeVisible();
  }
});

