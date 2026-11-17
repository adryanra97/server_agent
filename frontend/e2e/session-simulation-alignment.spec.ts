import {expect,test} from '@playwright/test';

test('QA reuses a completed SimPy configuration in alignment without importing other peoples runs',async({page})=>{
  test.setTimeout(65000);
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/alignment',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'Use last simulation settings'})).toHaveCount(0);

  await page.goto('/simulation',{waitUntil:'domcontentloaded'});
  await page.getByLabel('CPU cores',{exact:true}).fill('6');
  await page.getByLabel('Total RAM',{exact:true}).fill('4096');
  await page.getByLabel('Arrival rate',{exact:true}).fill('63');
  await page.getByLabel('CPU time / request',{exact:true}).fill('18');
  await page.getByLabel('RAM / request',{exact:true}).fill('9');
  await page.getByLabel('Concurrent connections',{exact:true}).fill('80');
  await page.getByLabel('Response payload',{exact:true}).fill('25');
  await page.getByLabel('Network bandwidth',{exact:true}).fill('600');
  await page.getByLabel('Maximum connections',{exact:true}).fill('500');
  await page.getByRole('button',{name:'Run simulation & view replay'}).click();
  await expect(page.locator('.simpy-result-content')).toBeVisible({timeout:30000});

  await page.goto('/alignment',{waitUntil:'domcontentloaded'});
  const reuse=page.getByRole('button',{name:'Use last simulation settings'});
  await expect(reuse).toBeVisible();
  await expect(page.locator('.tp-reuse-settings')).toContainText('63 RPS');
  await expect(page.getByLabel('Normal demand (RPS)')).toHaveValue('45');
  await reuse.click();
  await expect(page.getByRole('status')).toContainText('Previous simulation results were not copied');
  await expect(page.getByLabel('Normal demand (RPS)')).toHaveValue('63');
  await expect(page.getByLabel('Production CPU cores')).toHaveValue('6');
  await expect(page.getByLabel('Production RAM (MB)')).toHaveValue('4096');
  await page.locator('.tp-calibration summary').click();
  await expect(page.getByLabel('CPU clock speed (GHz)')).toHaveValue('2.5');
  await expect(page.getByLabel('CPU time / request (ms)')).toHaveValue('18');
  await expect(page.getByLabel('Memory / request (MB)')).toHaveValue('9');
  await expect(page.getByLabel('Concurrent connections')).toHaveValue('80');
  await expect(page.getByLabel('Response payload (KB)')).toHaveValue('25');
  await expect(page.getByLabel('Network bandwidth (Mbps)')).toHaveValue('600');
  await expect(page.getByLabel('Maximum connections')).toHaveValue('500');
  await expect(page.locator('.tp-analysis-results')).toHaveCount(0);
  await page.getByLabel('Normal demand (RPS)').fill('64');
  await expect(page.getByRole('status')).toHaveCount(0);
});
