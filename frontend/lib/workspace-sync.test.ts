import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
beforeEach(()=>{vi.resetModules();window.localStorage.clear();});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function ok(data:unknown){return {ok:true,json:async()=>data};}
describe('Shared workspace cloud sync',()=>{
  it('preserves local records when the cloud is not configured',async()=>{
    window.localStorage.setItem('serveragent-demo-records-v1','{"alignments":[{"id":"local"}],"incidents":[]}');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
    const sync=await import('./workspace-sync');
    expect(await sync.startWorkspaceSession('qa')).toBe(false);
    expect(sync.storageStatus()).toBe('local');
    expect(JSON.parse(window.localStorage.getItem('serveragent-demo-records-v1')||'{}').alignments[0].id).toBe('local');
  });
  it('hydrates all saved record kinds from the server and tracks report history',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(ok({connected:true,role:'qa'})).mockResolvedValueOnce(ok({
      items:[
        {kind:'run',id:'run-1',data:{id:'run-1',created_at:'2026-11-17',result:{verdict:'will_survive'}}},
        {kind:'alignment',id:'a',data:JSON.stringify({id:'a',createdAt:'2026-11-17',updatedAt:'2026-11-17',status:'review'})},
        {kind:'incident',id:'i',data:{id:'i',createdAt:'2026-11-17',updatedAt:'2026-11-17',status:'open'}},
        {kind:'report',id:'r',data:{id:'r',createdAt:'2026-11-17',title:'Snapshot'}},
      ],
    }));
    vi.stubGlobal('fetch',fetcher);
    const sync=await import('./workspace-sync');
    expect(await sync.startWorkspaceSession('qa')).toBe(true);
    expect(sync.storageStatus()).toBe('cloud');
    expect(JSON.parse(window.localStorage.getItem('serveragent-copdash-runs')||'[]')).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem('serveragent-demo-records-v1')||'{}').alignments).toHaveLength(1);
    expect(sync.getSavedReports()[0].title).toBe('Snapshot');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('repairs legacy browser cache before React mounts and retains a backup of invalid entries',async()=>{
    const run={id:'r1',label:'Cached SimPy',created_at:'2026-11-17',request:{engine:'simpy'},result:{verdict:'will_survive'}};
    const alignment={id:'a1',updatedAt:'2026-11-17',status:'review'};
    window.localStorage.setItem('serveragent-copdash-runs',JSON.stringify([JSON.stringify(run),'broken json']));
    window.localStorage.setItem('serveragent-demo-records-v1',JSON.stringify({alignments:[JSON.stringify(alignment)],incidents:[]}));
    const sync=await import('./workspace-sync');
    sync.repairLocalWorkspaceCache();
    const recovered=JSON.parse(window.localStorage.getItem('serveragent-copdash-runs')||'[]');
    expect(recovered).toEqual([run]);
    expect(JSON.parse(window.localStorage.getItem('serveragent-demo-records-v1')||'{}').alignments).toEqual([alignment]);
    expect(window.localStorage.getItem('serveragent-copdash-runs-unreadable-backup-v1')).not.toBeNull();
  });
  it('serializes writes and reports remote conflicts without claiming cloud success',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(ok({connected:true,role:'qa'})).mockResolvedValueOnce(ok({items:[]})).mockResolvedValueOnce(ok({saved:true}))
      .mockResolvedValueOnce({ok:false,status:409});
    vi.stubGlobal('fetch',fetcher);
    const sync=await import('./workspace-sync');
    expect(await sync.startWorkspaceSession('qa')).toBe(true);
    const first=sync.persistWorkspaceRecord('run',{id:'1'});
    const second=sync.persistWorkspaceRecord('run',{id:'2'});
    expect(await first).toBe(true);
    expect(await second).toBe(false);
    expect(sync.storageStatus()).toBe('error');
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
