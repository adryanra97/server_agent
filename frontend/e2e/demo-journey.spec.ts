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
    {index:1,role:'lead',allowed:'/signoff',denied:null},
    {index:2,role:'engineer',allowed:'/incident',denied:'/alignment'},
    {index:3,role:'manager',allowed:'/signoff',denied:'/incident'},
    {index:4,role:'support',allowed:'/incident',denied:'/signoff'},
  ] as const;

  for (const scenario of cases) {
    test(scenario.role+' sees the shared showcase and retains workflow boundaries',async({page})=>{
      await page.goto('/demo',{waitUntil:'domcontentloaded'});
      await page.locator('.tp-persona-card').nth(scenario.index).click();
      await expect(page).toHaveURL(/\/dashboard/);
      expect(await page.evaluate(()=>sessionStorage.getItem('serveragent-demo-identity-v1'))).toBe(scenario.role);

      await page.goto(scenario.allowed,{waitUntil:'domcontentloaded'});
      await expect(page.locator('.sa-page-header')).toBeVisible();
      await expect(page.locator('.sa-access-denied')).toHaveCount(0);

      const primary=page.getByRole('navigation',{name:'Role-based primary navigation'});
      await expect(primary.getByRole('link',{name:'Showcase'})).toBeVisible();
      await primary.getByRole('link',{name:'Showcase'}).click();
      await expect(page).toHaveURL(/\/showcase/);
      await expect(page.getByRole('heading',{name:/From simulation\s+to evidence/i})).toBeVisible();
      await expect(page.getByRole('link',{name:/View engineering evidence/})).toBeVisible();
      for(const shared of ['/simulation','/developer','/quality']){
        await page.goto(shared,{waitUntil:'domcontentloaded'});
        // Some full-screen workbench views intentionally hide the generic page header.
        await expect(page.locator('.sa-page-header')).toHaveCount(1);
        await expect(page.locator('.sa-access-denied')).toHaveCount(0);
      }
      if(scenario.denied){
        await page.goto(scenario.denied,{waitUntil:'domcontentloaded'});
        await expect(page.locator('.sa-access-denied')).toBeVisible();
        await expect(page.getByText('This page is not part of your demo role.')).toBeVisible();
        await expect(page.locator('.sa-page-header')).toHaveCount(0);
      }
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
    await expect(page.locator('.sa-page-header')).toHaveCount(1);
    await expect(page.locator('.sa-access-denied')).toHaveCount(0);
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
    await expect(mobileNav.getByRole('link',{name:/Platform Showcase/})).toBeVisible();
    // Never allow a session-scoped provider key to remain after sign out.
    await page.evaluate(()=>sessionStorage.setItem('twinpeak-llm-session-v1','temporary-test-secret'));
    await mobileNav.getByRole('button',{name:/Sign out/}).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(()=>sessionStorage.getItem('serveragent-demo-identity-v1'))).toBeNull();
    expect(await page.evaluate(()=>sessionStorage.getItem('twinpeak-llm-session-v1'))).toBeNull();
  });
});

test('Showcase links expose original CI configuration and API reference',async({page})=>{
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').nth(4).click();
  await page.goto('/showcase',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.tp-showcase-card')).toHaveCount(6);
  await expect(page.locator('.tp-showcase-evidence-grid').getByRole('link',{name:/GitHub Actions/})).toHaveAttribute('href',/actions\/workflows\/quality.yml/);
  await expect(page.locator('.tp-showcase-raw-links').getByRole('link',{name:/CI\/CD configuration/})).toHaveAttribute('href',/blob\/main\/\.github\/workflows\/quality.yml/);
  await expect(page.locator('.tp-showcase-evidence-grid').getByRole('link',{name:/Verified results JSON/})).toHaveAttribute('href',/quality-reports\/latest.json/);
  await expect(page.locator('.tp-showcase-evidence-grid').getByRole('link',{name:/OpenAPI JSON/})).toHaveAttribute('href','/openapi.json');
  await expect(page.getByRole('link',{name:/Swagger API documentation/})).toHaveAttribute('href','/docs');
  await expect(page.getByRole('link',{name:/Backend quality JSON/})).toHaveAttribute('href','/api/v1/quality');
});

test('Quality checks show their purpose and reveal the real CI command on demand',async({page})=>{
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await page.goto('/quality',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:/Eleven quality checks\. One verifiable pipeline\./})).toBeVisible();
  const checks=page.locator('.eq-check-list .eq-check');
  await expect(checks).toHaveCount(11);
  const hypothesis=checks.first();
  await expect(hypothesis.locator('summary')).toContainText('Hypothesis');
  await expect(hypothesis.locator('summary')).toContainText('Generated-input property tests');
  await expect(hypothesis.locator('.eq-check-detail')).toBeHidden();
  await hypothesis.locator('summary').click();
  await expect(hypothesis).toHaveAttribute('open','');
  await expect(hypothesis.locator('.eq-check-detail')).toBeVisible();
  await expect(hypothesis.locator('.eq-check-detail code')).toContainText('pytest backend/tests/test_');
  await expect(checks.filter({hasText:'Python security scanning'}).locator('summary')).toContainText('Bandit');
  await hypothesis.locator('summary').click();
  await expect(hypothesis.locator('.eq-check-detail')).toBeHidden();
});

test('Homepage keeps readable copy and uses green only as a small accent',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:/What if your infrastructure had a Digital Twin/i})).toBeVisible();
  const copy=page.locator('.truth-copy>p');
  await expect(copy).toBeVisible();
  expect(await copy.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(51, 65, 85)');
  const accent=await page.locator('.truth-facts span').first()
    .evaluate(el=>getComputedStyle(el,'::before').backgroundColor);
  expect(accent).toBe('rgb(120, 190, 67)');
});


test('Green navigation accent is consistent without changing blue actions',async({page})=>{
  const green='rgb(120, 190, 67)';
  for(const [url,selector] of [
    ['/','.home-header'],
    ['/login','.demo-login-header'],
    ['/demo','.demo-login-header'],
  ] as const){
    await page.goto(url,{waitUntil:'domcontentloaded'});
    const header=page.locator(selector);
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('border-top-color',green);
    await expect(header).toHaveCSS('border-top-width','3px');
  }
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  const appHeader=page.locator('.sa-header');
  await expect(appHeader).toHaveCSS('border-top-color',green);
  const active=page.locator('.sa-main-nav>a.current').first();
  await expect(active).toBeVisible();
  expect(await active.evaluate(el=>getComputedStyle(el,'::after').backgroundColor)).toBe(green);
  expect(await active.evaluate(el=>getComputedStyle(el,'::after').height)).toBe('2px');
  await page.setViewportSize({width:390,height:844});
  await expect(appHeader).toHaveCSS('border-top-color',green);
  await expect(appHeader).toHaveCSS('border-top-width','3px');
});
