import {describe,expect,it} from 'vitest';
import {resolveQualityBranch,githubRunsUrl,qualityLatestPath,executedTestTotal} from './quality-branch';

describe('branch-specific verified engineering quality',()=>{
  it('uses the staging report on Vercel staging deployments',()=>{
    expect(resolveQualityBranch('staging')).toBe('staging');
    expect(qualityLatestPath('staging')).toBe('staging-latest.json');
    expect(githubRunsUrl('staging')).toContain('branch=staging&event=push');
  });
  it('uses production evidence in main and local builds',()=>{
    expect(resolveQualityBranch('main')).toBe('main');
    expect(resolveQualityBranch(undefined)).toBe('main');
    expect(qualityLatestPath('main')).toBe('latest.json');
    expect(githubRunsUrl('main')).toContain('branch=main&event=push');
  });
  it('counts only truly executed cases and excludes skips',()=>{
    expect(executedTestTotal({passed:269,failed:0,errors:0})).toBe(269);
    expect(executedTestTotal({passed:248,failed:1,errors:2})).toBe(251);
  });
});
