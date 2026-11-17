import {expect,test} from '@playwright/test';

test('dashboard recovers double-encoded local and remote JSONB history without a crash',async({page})=>{
  const legacy={id:'old-run',label:'Old SimPy',created_at:'2026-11-17T06:00:00Z',
    request:{engine:'simpy',spec:{cpu:{},ram:{},network:{}},load:{rps:45}},result:{engine:'simpy',verdict:'will_survive',bottleneck:null}};
  const cloud={...legacy,id:'cloud-run',label:'Cloud SimPy'};
  await page.addInitScript(value=>{
    sessionStorage.setItem('serveragent-demo-identity-v1','qa');
    localStorage.setItem('serveragent-copdash-runs',JSON.stringify([JSON.stringify(value)]));
  },legacy);
  await page.route('**/api/workspace/session',async route=>{
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({connected:true,role:'qa'})});
  });
  await page.route('**/api/workspace/data',async route=>{
    await route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({items:[{kind:'run',id:'cloud-run',data:JSON.stringify(cloud)}]})});
  });
  await page.goto('/dashboard',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.role-dashboard')).toBeVisible({timeout:15000});
  await expect(page.getByText('This page couldn’t load')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>{
    const data=JSON.parse(localStorage.getItem('serveragent-copdash-runs')||'[]');
    return data[0]?.id;
  })).toBe('cloud-run');
  await expect(page.locator('.role-dashboard')).toBeVisible();
});
