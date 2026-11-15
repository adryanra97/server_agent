import { describe, expect, it, vi } from 'vitest';
import {
  csvHistory, defaultLoad, defaultSpec, history, inspectSimPy,
  requestVerdict, saveRun, verdictLabels, verdictNotes,
  type HistoryItem, type VerdictRequest, type VerdictResult,
} from './model';

const result:VerdictResult={
  verdict:'will_survive',confidence:0.93,engine:'simpy',bottleneck:null,
  resources:{
    cpu:{utilization:0.25,status:'ok'},
    ram:{utilization:0.1,status:'ok'},
    network:{utilization:0.05,status:'ok'},
  },reasons:['Within capacity'],
};
const request:VerdictRequest={engine:'simpy',spec:defaultSpec,load:defaultLoad};
const row=(n:number):HistoryItem=>({
  id:'run-'+n,label:'API "checkout" '+n,created_at:'2026-11-15T00:00:00Z',
  request,result,
});
const response=(ok:boolean,body:unknown,status=200)=>({
  ok,status,json:vi.fn().mockResolvedValue(body),
});
describe('Capacity model storage and API contracts',()=>{
  it('has a label and help text for every supported verdict',()=>{
    for(const verdict of ['will_survive','at_risk','will_crash','not_assessable'] as const){
      expect(verdictLabels[verdict]).toBeTruthy();
      expect(verdictNotes[verdict]).toBeTruthy();
    }
  });
  it('starts with empty local evaluation history',()=>{
    expect(history()).toEqual([]);
  });
  it('rejects corrupted local history rather than crashing',()=>{
    window.localStorage.setItem('serveragent-copdash-runs','{bad-json');
    expect(history()).toEqual([]);
  });
  it('saves actual runs, newest first, and broadcasts history changes',()=>{
    const listener=vi.fn();
    window.addEventListener('serveragent-history',listener);
    saveRun(row(1));saveRun(row(2));
    expect(history().map(x=>x.id)).toEqual(['run-2','run-1']);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener('serveragent-history',listener);
  });
  it('limits local history to 50 runs to protect browser storage',()=>{
    for(let n=1;n<=55;n++)saveRun(row(n));
    expect(history()).toHaveLength(50);
    expect(history()[0].id).toBe('run-55');
    expect(history().at(-1)?.id).toBe('run-6');
  });
  it('does not access browser storage when rendering on the server',()=>{
    vi.stubGlobal('window',undefined);
    try{
      expect(history()).toEqual([]);
      expect(()=>saveRun(row(1))).not.toThrow();
    }finally{vi.unstubAllGlobals();}
  });
  it('posts the typed model workload and returns the original verdict',async()=>{
    const fetcher=vi.fn().mockResolvedValue(response(true,result));
    vi.stubGlobal('fetch',fetcher);
    expect(await requestVerdict(request)).toEqual(result);
    const [url,init]=fetcher.mock.calls[0] as [string,RequestInit];
    expect(url).toBe('/verdict');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(request);
  });
  it('preserves a validated API rejection message',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(false,{detail:'Invalid connections'},422)));
    await expect(requestVerdict(request)).rejects.toThrow('Invalid connections');
  });
  it('handles failed JSON parsing without exposing a misleading provider result',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({
      ok:false,status:503,json:vi.fn().mockRejectedValue(Error('not JSON')),
    }));
    await expect(requestVerdict(request)).rejects.toThrow('Evaluation failed (HTTP 503)');
  });
  it('handles object-valued API errors with an HTTP status',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(false,{detail:{error:'unsafe'}},500)));
    await expect(requestVerdict(request)).rejects.toThrow('Evaluation failed (HTTP 500)');
  });
  it('uses the production SimPy inspect endpoint with no caching',async()=>{
    const inspected={
      engine:'simpy',result,execution_ms:12,
      simulation:{timeline:[{second:0}],timeline_truncated:false,timeline_limit_seconds:12,simulated_elapsed_seconds:1},
    };
    const fetcher=vi.fn().mockResolvedValue(response(true,inspected));
    vi.stubGlobal('fetch',fetcher);
    expect(await inspectSimPy({...request,engine:'rules'})).toEqual(inspected);
    const [url,init]=fetcher.mock.calls[0] as [string,RequestInit];
    expect(url).toBe('/api/v1/simpy/inspect');
    expect(init.cache).toBe('no-store');
    expect(JSON.parse(String(init.body)).engine).toBe('simpy');
  });
  it('rejects a successful HTTP response without a real SimPy timeline',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(true,{result,simulation:{timeline:null}})));
    await expect(inspectSimPy(request)).rejects.toThrow('could not provide a recorded timeline');
  });
  it('surfaces a typed backend inspect error',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(false,{detail:'Invalid scenario'},422)));
    await expect(inspectSimPy(request)).rejects.toThrow('Invalid scenario');
  });
  it('handles unparsable inspect responses safely',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({
      ok:false,status:502,json:vi.fn().mockRejectedValue(Error('not JSON')),
    }));
    await expect(inspectSimPy(request)).rejects.toThrow('could not provide a recorded timeline');
  });
  it('exports a real CSV with escaped quote characters and revokes its object URL',()=>{
    const create=vi.fn().mockReturnValue('blob:test');
    const revoke=vi.fn();
    vi.stubGlobal('URL',{...URL,createObjectURL:create,revokeObjectURL:revoke});
    const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    csvHistory([row(1)]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
  });
  it('exports an empty CSV header when no evaluations match',()=>{
    const create=vi.fn().mockReturnValue('blob:empty');
    vi.stubGlobal('URL',{...URL,createObjectURL:create,revokeObjectURL:vi.fn()});
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    expect(()=>csvHistory([])).not.toThrow();
    expect(create).toHaveBeenCalledOnce();
  });
});
