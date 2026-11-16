import { test, expect } from '@playwright/test';

test('UI-07 API documentation loads', async ({ page }) => {
  await page.goto('/docs');

  // The local E2E proxy serves FastAPI's real Swagger page.
  await expect(page).toHaveTitle(/Swagger UI/);

  // Tampilan Swagger muncul
  await expect(page.locator('.swagger-ui')).toBeVisible({ timeout: 15000 });

  // Minimal ada 1 endpoint API yang terdaftar
  await expect(page.locator('.opblock').first()).toBeVisible({ timeout: 15000 });
});