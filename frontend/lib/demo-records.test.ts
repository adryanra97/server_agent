import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_SESSION_KEY, allDemoRoutes, demoRecords, demoCsv, saveAlignment, saveDemoRecords,
  saveIncident, getDemoRole, getPersona, selectDemoPersona, canVisit,
  allowedPages, ensureDemoStarter,
  type DemoAlignment, type DemoIncident,
} from './demo';
import { defaultLoad, defaultSpec, saveRun } from './model';

const result={
  verdict:'will_survive' as const,confidence:1,engine:'simpy' as const,
  bottleneck:null,resources:{
    cpu:{utilization:.2,status:'ok' as const},
    ram:{utilization:.1,status:'ok' as const},
    network:{utilization:.05,status:'ok' as const},
  },reasons:['Measured engine result'],
};
const alignment:DemoAlignment={
  id:'release-1',type:'alignment',createdAt:'2026-11-15',
  updatedAt:'2026-11-15',release:'QRIS-C3',cycle:3,service:'QRIS',
  qaNotes:'Check 1x and 2x scenarios',createdBy:'qa',status:'review',
  runId:'run-1',rps:45,result,
};
const incident:DemoIncident={
  id:'incident-1',type:'incident',createdAt:'2026-11-15',updatedAt:'2026-11-15',
  service:'QRIS',incidentType:'Timeout',symptom:'Spike',peakRps:135,
  detectedAt:'2026-11-15',createdBy:'support',status:'open',
  spec:defaultSpec,load:defaultLoad,
};
beforeEach(()=>{window.localStorage.clear();window.sessionStorage.clear();});
describe('Demo role and workflow data robustness',()=>{
  it('never returns another role for a forbidden menu',()=>{
    for(const page of allDemoRoutes)expect(canVisit('support',page.href)).toBe(
      allowedPages('support').some(allowed=>allowed.href===page.href)
    );
  });
  it('falls back to a valid persona for an unknown role',()=>{
    expect(getPersona('unrecognized' as 'qa').id).toBe('qa');
  });
  it('ignores unknown roles submitted to the role switcher',()=>{
    selectDemoPersona('hacker' as 'qa');
    expect(getDemoRole()).toBeNull();
  });
  it('ignores invalid identities placed directly in sessionStorage',()=>{
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'admin');
    expect(getDemoRole()).toBeNull();
  });
  it('returns empty data if stored records have incorrect array types',()=>{
    window.localStorage.setItem('serveragent-demo-records-v1',JSON.stringify({
      alignments:{broken:true},incidents:'not-an-array',
    }));
    expect(demoRecords()).toEqual({alignments:[],incidents:[]});
  });
  it('preserves valid alignments while ignoring a bad incident collection',()=>{
    window.localStorage.setItem('serveragent-demo-records-v1',JSON.stringify({
      alignments:[alignment],incidents:null,
    }));
    expect(demoRecords().alignments).toHaveLength(1);
    expect(demoRecords().incidents).toEqual([]);
  });
  it('writes records and dispatches a workspace update event',()=>{
    const updated=vi.fn();
    window.addEventListener('serveragent-demo-records',updated);
    saveDemoRecords({alignments:[alignment],incidents:[incident]});
    expect(demoRecords().incidents[0].symptom).toBe('Spike');
    expect(updated).toHaveBeenCalledOnce();
    window.removeEventListener('serveragent-demo-records',updated);
  });
  it('upserts incidents by identity without removing another incident',()=>{
    saveIncident(incident);
    saveIncident({...incident,id:'incident-2'});
    saveIncident({...incident,status:'analyzed'});
    expect(demoRecords().incidents.map(x=>x.id)).toEqual(['incident-1','incident-2']);
    expect(demoRecords().incidents[0].status).toBe('analyzed');
  });
  it('keeps incidents when updating alignment records',()=>{
    saveDemoRecords({alignments:[],incidents:[incident]});
    saveAlignment(alignment);
    expect(demoRecords().incidents).toEqual([incident]);
  });
  it('writes escaped CSV content and cleans up its temporary URL',()=>{
    const create=vi.fn().mockReturnValue('blob:workflow-test');
    const revoke=vi.fn();
    vi.stubGlobal('URL',{...URL,createObjectURL:create,revokeObjectURL:revoke});
    const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    demoCsv({
      alignments:[{...alignment,service:'QRIS "Payment"'}],
      incidents:[incident],
    });
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:workflow-test');
  });
  it('handles empty workflow CSV exports without throwing',()=>{
    vi.stubGlobal('URL',{...URL,createObjectURL:vi.fn().mockReturnValue('blob:empty'),revokeObjectURL:vi.fn()});
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    expect(()=>demoCsv({alignments:[],incidents:[]})).not.toThrow();
  });
  it('avoids localStorage and sessionStorage during SSR',async()=>{
    vi.stubGlobal('window',undefined);
    try{
      expect(getDemoRole()).toBeNull();
      expect(demoRecords()).toEqual({alignments:[],incidents:[]});
      expect(()=>saveDemoRecords({alignments:[],incidents:[]})).not.toThrow();
      expect(()=>selectDemoPersona('qa')).not.toThrow();
      expect(await ensureDemoStarter()).toBe(false);
    }finally{vi.unstubAllGlobals();}
  });
  it('shows that client-side role access is not production authentication',()=>{
    expect(getDemoRole()).toBeNull();
    selectDemoPersona('manager');
    expect(getDemoRole()).toBe('manager');
    expect(canVisit('manager','/signoff')).toBe(true);
    expect(canVisit('manager','/developer')).toBe(false);
  });
});

describe('Defensive paths in browser workflow storage',()=>{
  it('ignores browser APIs that throw during role inspection',()=>{
    const broken=vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('Storage disabled');});
    try{expect(getDemoRole()).toBeNull();}
    finally{broken.mockRestore();}
  });
  it('exports partially missing fields safely as empty CSV cells',()=>{
    vi.stubGlobal('URL',{...URL,createObjectURL:vi.fn().mockReturnValue('blob:partial'),revokeObjectURL:vi.fn()});
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    expect(()=>demoCsv({
      alignments:[{...alignment,service:null as unknown as string}],
      incidents:[],
    })).not.toThrow();
  });
});
