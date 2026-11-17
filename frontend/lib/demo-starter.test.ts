import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demoRecords, ensureDemoStarter, saveAlignment, type DemoAlignment } from './demo';
import {
  defaultLoad, defaultSpec, history, inspectSimPy, saveRun,
  type SimPyInspection, type HistoryItem, type VerdictResult,
} from './model';
import type { TraceSample } from './trace';
import {storageStatus} from './workspace-sync';
vi.mock('./workspace-sync',async imported=>{
  const actual=await imported<typeof import('./workspace-sync')>();
  return {...actual,storageStatus:vi.fn(()=> 'local')};
});

vi.mock('./model',async imported=>{
  const actual=await imported<typeof import('./model')>();
  return {...actual,inspectSimPy:vi.fn()};
});
const trace=(second:number):TraceSample=>({
  second,cpu_percent:15,ram_percent:12,network_percent:9,
  queue_avg:0,arrivals:45,completed:45,
  duration_seconds:1,in_flight:3,connection_percent:5,network_mbps:3,cpu_queue_avg:0,
});
const verdict=(status:VerdictResult['verdict']='will_survive'):VerdictResult=>({
  verdict:status,engine:'simpy',confidence:1,bottleneck:null,
  resources:{
    cpu:{utilization:.2,status:'ok'},ram:{utilization:.1,status:'ok'},
    network:{utilization:.03,status:'ok'},
  },reasons:['Engine output'],
});
const inspection=(rps:number,status:VerdictResult['verdict']='will_survive'):SimPyInspection=>({
  engine:'simpy',result:verdict(status),execution_ms:5,
  simulation:{timeline:[trace(0),trace(1)],timeline_truncated:false,
    timeline_limit_seconds:2,simulated_elapsed_seconds:2},
});
const starter:DemoAlignment={
  id:'starter-qris-cycle03',type:'alignment',createdAt:'2026-11-15',
  updatedAt:'2026-11-15',release:'QRIS-RC03',cycle:3,
  service:'QRIS Payment',qaNotes:'Existing important notes',
  createdBy:'qa',status:'approved',runId:'starter-qris-cycle03-simpy',
  result:verdict(),rps:45,reviewerNote:'Keep this signoff',signoffNote:'Approved',
};
const saved:HistoryItem={
  id:'starter-qris-cycle03-simpy',label:'QRIS Payment',
  created_at:'2026-11-15',request:{
    engine:'simpy',spec:defaultSpec,load:{...defaultLoad,rps:45},
  },result:verdict(),
};
const model=vi.mocked(inspectSimPy);
beforeEach(()=>{
  window.localStorage.clear();window.sessionStorage.clear();
  model.mockReset();
  vi.mocked(storageStatus).mockReturnValue('local');
});
describe('Guided QRIS case generation using real SimPy evidence',()=>{
  it('never generates synthetic starter records when a shared cloud history is active',async()=>{
    vi.mocked(storageStatus).mockReturnValue('cloud');
    expect(await ensureDemoStarter()).toBe(true);
    expect(model).not.toHaveBeenCalled();
    expect(demoRecords()).toEqual({alignments:[],incidents:[]});
  });
  it('seeds the baseline and both stress levels using evaluated model results',async()=>{
    model.mockImplementation(async request=>inspection(request.load.rps));
    expect(await ensureDemoStarter()).toBe(true);
    const records=demoRecords();
    expect(records.alignments).toHaveLength(1);
    expect(records.incidents).toHaveLength(1);
    expect(records.alignments[0].whatIf?.map(x=>x.rps)).toEqual([45,90,135]);
    expect(records.alignments[0].whatIf?.every(x=>x.timeline?.length===2)).toBe(true);
    expect(history()[0].timeline).toHaveLength(2);
    expect(model).toHaveBeenCalledTimes(3);
  });
  it('uses the actual SimPy verdict and never fabricates passing results',async()=>{
    model.mockImplementation(async request=>inspection(request.load.rps,
      request.load.rps>45?'will_crash':'at_risk'));
    await ensureDemoStarter();
    expect(demoRecords().alignments[0].result.verdict).toBe('at_risk');
    expect(demoRecords().alignments[0].whatIf?.map(x=>x.verdict))
      .toEqual(['at_risk','will_crash','will_crash']);
  });
  it('marks failed follow-up scenarios indeterminate without changing the baseline',async()=>{
    model.mockImplementation(async request=>{
      if(request.load.rps>45)throw Error('Cannot connect to backend');
      return inspection(45);
    });
    expect(await ensureDemoStarter()).toBe(true);
    expect(demoRecords().alignments[0].whatIf?.map(x=>x.verdict))
      .toEqual(['will_survive','not_assessable','not_assessable']);
    expect(demoRecords().alignments[0].whatIf?.[1].result).toBeUndefined();
  });
  it('does not create a fake case when the initial SimPy evaluation fails',async()=>{
    model.mockRejectedValue(Error('Engine offline'));
    expect(await ensureDemoStarter()).toBe(false);
    expect(demoRecords().alignments).toEqual([]);
    expect(history()).toEqual([]);
  });
  it('does not repeat model calls for a fully completed seed',async()=>{
    model.mockImplementation(async request=>inspection(request.load.rps));
    await ensureDemoStarter();
    model.mockClear();
    expect(await ensureDemoStarter()).toBe(true);
    expect(model).not.toHaveBeenCalled();
  });
  it('shares one starter-generation promise across overlapping browser loads',async()=>{
    let resolveFirst!:(value:SimPyInspection)=>void;
    const pending=new Promise<SimPyInspection>(resolve=>{resolveFirst=resolve;});
    model.mockImplementationOnce(()=>pending).mockImplementation(async r=>inspection(r.load.rps));
    const first=ensureDemoStarter();
    const second=ensureDemoStarter();
    expect(second).toBe(first);
    resolveFirst(inspection(45));
    expect(await second).toBe(true);
    expect(model).toHaveBeenCalledTimes(3);
  });
  it('keeps an older approved case if its original run is no longer available',async()=>{
    saveAlignment(starter);
    expect(await ensureDemoStarter()).toBe(true);
    expect(demoRecords().alignments[0].reviewerNote).toBe('Keep this signoff');
    expect(model).not.toHaveBeenCalled();
  });
  it('does not replay an old non-SimPy run as a SimPy result',async()=>{
    saveAlignment(starter);
    saveRun({...saved,request:{...saved.request,engine:'rules'}});
    expect(await ensureDemoStarter()).toBe(true);
    expect(model).not.toHaveBeenCalled();
  });
  it('backfills missing 1x/2x/3x traces without changing signed approvals',async()=>{
    saveAlignment(starter);
    saveRun(saved);
    model.mockImplementation(async request=>inspection(request.load.rps));
    expect(await ensureDemoStarter()).toBe(true);
    const updated=demoRecords().alignments[0];
    expect(updated.whatIf?.map(x=>x.factor)).toEqual([1,2,3]);
    expect(updated.whatIf?.every(x=>x.timeline?.length===2)).toBe(true);
    expect(updated.status).toBe('approved');
    expect(updated.signoffNote).toBe('Approved');
    expect(updated.reviewerNote).toBe('Keep this signoff');
    expect(model).toHaveBeenCalledTimes(3);
  });
  it('preserves old evidence when replaying a model changes the saved verdict',async()=>{
    saveAlignment({...starter,whatIf:[
      {factor:2,rps:90,verdict:'at_risk',timeline:[trace(0)]},
    ]});
    saveRun(saved);
    model.mockImplementation(async request=>inspection(request.load.rps,
      request.load.rps===45?'will_crash':request.load.rps===90?'will_survive':'at_risk'));
    await ensureDemoStarter();
    const outcomes=demoRecords().alignments[0].whatIf!;
    expect(outcomes.find(x=>x.factor===1)?.verdict).toBe('will_survive');
    expect(outcomes.find(x=>x.factor===2)?.verdict).toBe('at_risk');
    expect(outcomes.find(x=>x.factor===3)?.verdict).toBe('at_risk');
  });
  it('preserves existing partial cases on replay errors and flags missing ones',async()=>{
    saveAlignment({...starter,whatIf:[
      {factor:2,rps:90,verdict:'will_survive',timeline:[trace(0)]},
    ]});
    saveRun(saved);
    model.mockRejectedValue(Error('No SimPy trace'));
    await ensureDemoStarter();
    const outcomes=demoRecords().alignments[0].whatIf!;
    expect(outcomes.find(x=>x.factor===2)?.verdict).toBe('will_survive');
    expect(outcomes.find(x=>x.factor===3)?.verdict).toBe('not_assessable');
  });
  it('considers complete 1x/2x/3x proof ready and avoids replay',async()=>{
    saveAlignment({...starter,whatIf:[1,2,3].map(factor=>({
      factor,rps:45*factor,verdict:'will_survive' as const,timeline:[trace(0),trace(1)],
    }))});
    expect(await ensureDemoStarter()).toBe(true);
    expect(model).not.toHaveBeenCalled();
  });
  it('does not re-run a previously unassessable legacy stress scenario',async()=>{
    saveAlignment({...starter,whatIf:[
      {factor:2,rps:90,verdict:'not_assessable'},
    ]});
    saveRun(saved);
    model.mockImplementation(async request=>inspection(request.load.rps));
    await ensureDemoStarter();
    expect(model.mock.calls.map(x=>x[0].load.rps)).toEqual([45,135]);
    expect(demoRecords().alignments[0].whatIf?.find(x=>x.factor===2)?.verdict)
      .toBe('not_assessable');
  });
  it('reuses an in-progress upgrade promise for an older case',async()=>{
    saveAlignment(starter);saveRun(saved);
    let resolveFirst!:(value:SimPyInspection)=>void;
    const pending=new Promise<SimPyInspection>(resolve=>{resolveFirst=resolve;});
    model.mockImplementationOnce(()=>pending).mockImplementation(async req=>inspection(req.load.rps));
    const a=ensureDemoStarter();
    const b=ensureDemoStarter();
    expect(a).toBe(b);
    resolveFirst(inspection(45));
    await expect(a).resolves.toBe(true);
    expect(demoRecords().alignments[0].whatIf).toHaveLength(3);
  });
});

describe('Completed starter scenarios with an honest unassessable case',()=>{
  it('treats preserved not-assessable scenarios as completed evidence, not a reason to retry',async()=>{
    saveAlignment({...starter,whatIf:[
      {factor:1,rps:45,verdict:'will_survive',timeline:[trace(0),trace(1)]},
      {factor:2,rps:90,verdict:'not_assessable',explanation:'Model unavailable'},
      {factor:3,rps:135,verdict:'will_survive',timeline:[trace(0),trace(1)]},
    ]});
    expect(await ensureDemoStarter()).toBe(true);
    expect(model).not.toHaveBeenCalled();
    expect(demoRecords().alignments[0].whatIf?.[1].verdict).toBe('not_assessable');
  });
});
