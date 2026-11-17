import {expect,test} from '@playwright/test';

test('QA submission notes remain attributed and visible to Technical Lead before decision',async({page})=>{
  const qaNote='Development Notes\nCPU and memory were verified after the change. Check the 2x scenario.';
  const run={
    id:'qa-note-evidence-01',label:'QA verified SimPy evidence',created_at:'2026-11-17T09:00:00.000Z',
    request:{
      engine:'simpy',spec:{cpu:{cores:4,clock_ghz:2.5},ram:{total_mb:16384},
        network:{bandwidth_mbps:1000,max_connections:10000}},
      load:{rps:45,avg_cpu_ms_per_req:15,avg_mem_mb_per_req:5,concurrent_connections:100,payload_kb:10},
    },
    result:{
      verdict:'will_survive',engine:'simpy',confidence:1,bottleneck:null,
      resources:{cpu:{utilization:.25,status:'ok'},ram:{utilization:.1,status:'ok'},
        network:{utilization:.03,status:'ok'}},reasons:['SimPy measured capacity'],
    },
  };
  await page.addInitScript(record=>{
    localStorage.setItem('serveragent-copdash-runs',JSON.stringify([record]));
  },run);
  await page.goto('/demo',{waitUntil:'domcontentloaded'});
  await page.locator('.tp-persona-card').first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/alignment',{waitUntil:'domcontentloaded'});
  await expect(page.getByLabel('Select saved simulation')).toHaveValue('qa-note-evidence-01');
  await page.getByRole('textbox',{name:'QA testing notes'}).fill(qaNote);
  await page.getByRole('button',{name:/Submit for Technical Lead review/}).click();
  await expect(page.getByRole('status')).toContainText('Alignment evidence submitted');

  await page.goto('/access',{waitUntil:'domcontentloaded'});
  const leadChoice=page.locator('.tp-access-role-grid .tp-access-role').nth(1);
  await expect(leadChoice).toContainText('Technical Lead');
  await leadChoice.click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/alignment',{waitUntil:'domcontentloaded'});
  const note=page.getByRole('region',{name:'QA submission notes'}).filter({hasText:'Development Notes'});
  await expect(note).toBeVisible();
  await expect(note).toContainText('QA testing notes');
  await expect(note).toContainText('Submitted by QA Tester');
  await expect(note).toContainText('CPU and memory were verified after the change.');
  await expect(note).toContainText('Check the 2x scenario.');
  await expect(page.locator('.tp-case-body > p').filter({hasText:'Development Notes'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Review decision'})).toBeVisible();
});
