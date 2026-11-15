import { expect, test } from '@playwright/test';

test.describe('TwinPeak role-based demo',()=>{
  test('shows all five role choices on the entry screen',async({page})=>{
    await page.goto('/demo',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.tp-persona-card')).toHaveCount(5);
    await expect(page.getByText('QRIS Payment',{exact:false}).first()).toBeVisible();
  });
  test('QA can enter and navigate to the release alignment workspace',async({page})=>{
    await page.goto('/demo',{waitUntil:'domcontentloaded'});
    await page.locator('.tp-persona-card').first().click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/alignment',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.tp-analysis')).toBeVisible({timeout:20000});
  });
  test('Technical Lead can open the alignment evidence from its role perspective',async({page})=>{
    await page.goto('/demo',{waitUntil:'domcontentloaded'});
    await page.locator('.tp-persona-card').nth(1).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/alignment',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.role-list-panel')).toBeVisible({timeout:20000});
  });
  test('security response headers are present on public pages',async({request})=>{
    const response=await request.get('/demo');
    expect(response.ok()).toBe(true);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
  });
});
