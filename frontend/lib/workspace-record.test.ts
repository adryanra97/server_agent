import {describe,expect,it} from 'vitest';
import {decodeWorkspaceRecord,normalizeWorkspaceRecord} from './workspace-record';

const run={id:'run-1',created_at:'2026-11-17T00:00:00Z',label:'QRIS',request:{engine:'simpy',spec:{cpu:{}},load:{rps:45}},result:{engine:'simpy',verdict:'will_survive'}};
describe('Workspace JSONB and legacy browser payloads',()=>{
  it('decodes the JSONB scalar string created by older Postgres bindings',()=>{
    expect(decodeWorkspaceRecord(JSON.stringify(run))).toEqual(run);
    expect(normalizeWorkspaceRecord('run',JSON.stringify(run))).toEqual(run);
  });
  it('keeps new JSONB objects unchanged',()=>{
    expect(decodeWorkspaceRecord(run)).toBe(run);
    expect(normalizeWorkspaceRecord('run',run)).toBe(run);
  });
  it('normalizes alignment, incident and report history',()=>{
    expect(normalizeWorkspaceRecord('alignment',JSON.stringify({id:'a',updatedAt:'2026-11-17',status:'review'}))?.id).toBe('a');
    expect(normalizeWorkspaceRecord('incident',{id:'i',updatedAt:'2026-11-17',status:'escalated'})?.id).toBe('i');
    expect(normalizeWorkspaceRecord('report',{id:'r',createdAt:'2026-11-17'})?.id).toBe('r');
  });
  it('rejects unreadable values without throwing in a dashboard',()=>{
    for(const invalid of ['not json',null,42,[],JSON.stringify('still a string'),'{broken']){
      expect(decodeWorkspaceRecord(invalid)).toBeNull();
      expect(normalizeWorkspaceRecord('run',invalid)).toBeNull();
    }
    expect(normalizeWorkspaceRecord('run',{id:'run-2',created_at:'2026-11-17'})).toBeNull();
    expect(normalizeWorkspaceRecord('run',{...run,result:{verdict:'will_survive'}})).toBeNull();
    expect(normalizeWorkspaceRecord('run',{...run,request:{load:{}}})).toBeNull();
    expect(normalizeWorkspaceRecord('alignment',{id:'a',status:'review'})).toBeNull();
    expect(normalizeWorkspaceRecord('report',{id:'r'})).toBeNull();
  });
});
