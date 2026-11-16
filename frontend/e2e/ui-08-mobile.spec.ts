import { test, expect, Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

// Cek halaman tidak lebih lebar dari layar HP
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test('UI-08 mobile layout on landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /What if your infrastructure had/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the Digital Twin' }).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('UI-08 homepage mobile navigation opens and closes accessibly', async ({ page }) => {
  await page.goto('/');
  const toggle=page.getByRole('button',{name:'Open navigation'});
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await toggle.click();
  const nav=page.getByRole('navigation',{name:'Primary'});
  await expect(nav.getByRole('link',{name:'Engines'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Close navigation'})).toHaveAttribute('aria-expanded','true');
  await nav.getByRole('link',{name:'Engines'}).click();
  await expect(page.getByRole('button',{name:'Open navigation'})).toHaveAttribute('aria-expanded','false');
  await expectNoHorizontalScroll(page);
});

test('UI-08 mobile layout on demo page', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('.tp-persona-card')).toHaveCount(5);
  await page.locator('.tp-persona-card').nth(4).scrollIntoViewIfNeeded();
  await expect(page.locator('.tp-persona-card').nth(4)).toBeVisible();
  await expectNoHorizontalScroll(page);
});