import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultLoad, defaultSpec } from './model';
import { compactTimeline } from './trace';
import {
  allowedPages, canVisit, demoLogin, demoLogout, demoPersonas,
  demoRecords, getDemoRole, getPersona, saveAlignment, saveDemoRecords,
  selectDemoPersona, ensureDemoStarter,
} from './demo';
import { LLM_SESSION_KEY, saveLLMSession } from './llm-session';

const outcome={
  verdict:'will_survive' as const, confidence:1,engine:'simpy' as const,bottleneck:null,
  resources:{
    cpu:{utilization:.3,status:'ok' as const},
    ram:{utilization:.2,status:'ok' as const},
    network:{utilization:.1,status:'ok' as const},
  },reasons:['Within modeled capacity'],
};
const alignment={
  id:'case-1',type:'alignment' as const,createdAt:'2026-11-15T00:00:00Z',
  updatedAt:'2026-11-15T00:00:00Z',release:'QRIS-RC03',cycle:3,service:'QRIS',
  qaNotes:'load testing',createdBy:'qa' as const,status:'review' as const,
  runId:'test-run',result:outcome,rps:45,
};
beforeEach(()=>{window.localStorage.clear();window.sessionStorage.clear();});
describe('role-aware TwinPeak demo workflows',()=>{
  it('exposes five distinct demo personas',()=>{
    expect(demoPersonas).toHaveLength(5);
    expect(new Set(demoPersonas.map(person=>person.id)).size).toBe(5);
  });
  it('restricts menus by role in the presentation layer',()=>{
    expect(canVisit('qa','/alignment')).toBe(true);
    expect(canVisit('support','/signoff')).toBe(false);
    expect(canVisit('lead','/settings')).toBe(true);
    expect(allowedPages('manager').some(page=>page.href==='/access')).toBe(true);
  });
  it('returns a known persona for a selected role',()=>{
    expect(getPersona('lead').shortRole).toBe('Technical Lead');
  });
  it('rejects incorrect demo passwords',()=>{
    expect(demoLogin('qa','wrong')).toBe(false);
    expect(getDemoRole()).toBeNull();
  });
  it('supports switching role without overwriting existing case records',()=>{
    saveAlignment(alignment);
    selectDemoPersona('qa');
    expect(getDemoRole()).toBe('qa');
    selectDemoPersona('lead');
    expect(getDemoRole()).toBe('lead');
    expect(demoRecords().alignments[0].id).toBe('case-1');
  });
  it('upserts a case while keeping unrelated records',()=>{
    saveAlignment(alignment);
    saveAlignment({...alignment,status:'returned',reviewerNote:'Review CPU'});
    expect(demoRecords().alignments).toHaveLength(1);
    expect(demoRecords().alignments[0].status).toBe('returned');
  });
  it('does not treat corrupted localStorage as valid case records',()=>{
    window.localStorage.setItem('serveragent-demo-records-v1','{} garbage');
    expect(demoRecords()).toEqual({alignments:[],incidents:[]});
  });
  it('logs out and clears temporary LLM credentials',()=>{
    demoLogin('lead','demo123');
    saveLLMSession({
      provider:'openai',endpoint:'https://api.openai.com/v1/chat/completions',
      model:'gpt-4.1-mini',apiKey:'demo-key',
    });
    demoLogout();
    expect(getDemoRole()).toBeNull();
    expect(window.sessionStorage.getItem(LLM_SESSION_KEY)).toBeNull();
  });
  it('keeps previously saved release evidence when switching user roles',()=>{
    saveDemoRecords({alignments:[alignment],incidents:[]});
    selectDemoPersona('manager');
    expect(demoRecords().alignments[0].runId).toBe('test-run');
  });
});
