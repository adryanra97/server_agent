import { test, expect } from '@playwright/test';

test('UI-10 Support & Monitoring fills in the incident form', async ({ page }) => {
  await page.goto('/demo');

  // Pilih role Support & Monitoring
  await page.getByRole('button', { name: /Support & Monitoring/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Buka halaman incident
  await page.goto('/incident');
  await expect(page.getByRole('heading', { name: 'Record an incident' })).toBeVisible();

  // Isian bawaan tampil
  const service = page.getByLabel('Service');
  const type = page.getByLabel('Incident type');
  const peak = page.getByLabel('Peak request rate');
  const symptoms = page.getByLabel('Observed symptoms');
  await expect(service).toHaveValue('Integration Gateway');
  await expect(peak).toHaveValue('900');
  await expect(symptoms).toHaveValue('Increased response times during traffic peak');

  // Form bisa diisi
  await service.fill('QRIS Payment API');
  await peak.fill('1200');
  await symptoms.fill('Timeouts on payment confirmation during peak hours');
  await expect(service).toHaveValue('QRIS Payment API');
  await expect(peak).toHaveValue('1200');
  await expect(type).toBeVisible();

  // Tombol ada dan aktif, tapi TIDAK diklik
  await expect(page.getByRole('button', { name: /Record & escalate/ })).toBeEnabled();
});

// Pending: diaktifkan setelah fitur escalate siap
test.fixme('UI-10b Record & escalate creates an incident', async ({ page }) => {
  // Nanti: klik Record & escalate, lalu cek insiden baru muncul
});