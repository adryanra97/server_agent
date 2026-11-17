import {expect,test} from '@playwright/test';

test('QA blocks impossible memory input without sending a SimPy request',async({page})=>{
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await page.goto('/alignment',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.tp-analysis')).toBeVisible();
  await page.getByLabel('Production RAM (MB)').fill('512');
  await page.locator('.tp-calibration summary').click();
  await page.getByLabel('Memory / request (MB)').fill('2312312');
  await expect(page.locator('.tp-input-warning')).toContainText(/memory per request.*exceeds total server RAM/i);
  let called=0;
  await page.route('**/api/v1/simpy/inspect',async route=>{called++;await route.continue();});
  await page.getByRole('button',{name:'Run simulated analysis'}).click();
  expect(called).toBe(0);
  await page.getByRole('button',{name:/Submit for Technical Lead review/}).click();
  const dialog=page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('No alignment record was created');
  await dialog.getByRole('button',{name:'Review inputs'}).click();
  await expect(dialog).toBeHidden();
});
test('whole-number field stays empty, strips leading zeroes, and rejects decimals',async({page})=>{
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await page.goto('/alignment',{waitUntil:'domcontentloaded'});
  const rps=page.getByLabel('Normal demand (RPS)');
  await rps.fill('');
  await expect(rps).toHaveValue('');
  await expect(page.locator('.tp-input-warning')).toContainText(/Normal demand.*whole number/);
  await rps.fill('0123');
  await expect(rps).toHaveValue('123');
  await rps.fill('1.5');
  await expect(rps).toHaveValue('123');
});
test('Showcase returns to its source without duplicating module routes',async({page})=>{
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await page.goto('/showcase',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:/Try the simulation/}).click();
  await expect(page).toHaveURL(/\/simulation\?from=showcase$/);
  const back=page.getByRole('link',{name:'Back to Platform Showcase'});
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/showcase$/);
  await page.goto('/simulation',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('link',{name:'Back to Platform Showcase'})).toHaveCount(0);
  await expect(page.locator('.simpy-section-number').filter({hasText:'01 / CONFIGURE'})).toBeVisible();
});
