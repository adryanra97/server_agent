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


test.describe('role boundary journeys across the five personas',()=>{
  const cases=[
    {index:0,role:'qa',allowed:'/alignment',denied:'/signoff'},
    {index:1,role:'lead',allowed:'/signoff',denied:'/compare'},
    {index:2,role:'engineer',allowed:'/incident',denied:'/alignment'},
    {index:3,role:'manager',allowed:'/signoff',denied:'/simulation'},
    {index:4,role:'support',allowed:'/incident',denied:'/signoff'},
  ] as const;

  for (const scenario of cases) {
    test(scenario.role+' can open its own page but cannot view a forbidden role page',async({page})=>{
      await page.goto('/demo',{waitUntil:'domcontentloaded'});
      await page.locator('.tp-persona-card').nth(scenario.index).click();
      await expect(page).toHaveURL(/\/dashboard/);
      expect(await page.evaluate(()=>sessionStorage.getItem('serveragent-demo-identity-v1'))).toBe(scenario.role);

      await page.goto(scenario.allowed,{waitUntil:'domcontentloaded'});
      await expect(page.locator('.sa-page-header')).toBeVisible();
      await expect(page.locator('.sa-access-denied')).toHaveCount(0);

      await page.goto(scenario.denied,{waitUntil:'domcontentloaded'});
      await expect(page.locator('.sa-access-denied')).toBeVisible();
      await expect(page.getByText('This page is not part of your demo role.')).toBeVisible();
      await expect(page.locator('.sa-page-header')).toHaveCount(0);
    });
  }

  test('Access & Roles can switch persona while retaining per-role permissions',async({page})=>{
    await page.goto('/demo',{waitUntil:'domcontentloaded'});
    await page.locator('.tp-persona-card').first().click();
    await page.goto('/access',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(7);
    await page.getByRole('button',{name:/Project Manager/}).click();
    await expect(page).toHaveURL(/\/dashboard/);
    expect(await page.evaluate(()=>sessionStorage.getItem('serveragent-demo-identity-v1'))).toBe('manager');
    await page.goto('/simulation',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.sa-access-denied')).toBeVisible();
  });

  test('mobile users can open the navigation and sign out of the guided session',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/demo',{waitUntil:'domcontentloaded'});
    await page.locator('.tp-persona-card').first().click();
    await expect(page).toHaveURL(/\/dashboard/);
    const menu=page.getByRole('button',{name:'Open menu'});
    await expect(menu).toBeVisible();
    await menu.click();
    const mobileNav=page.getByRole('navigation',{name:'Mobile role navigation'});
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link',{name:/Release Alignment/})).toBeVisible();
    await mobileNav.getByRole('button',{name:/Sign out/}).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(()=>sessionStorage.getItem('serveragent-demo-identity-v1'))).toBeNull();
  });
});
