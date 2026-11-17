import {describe,it,expect} from 'vitest';
import {canStore} from './persistence-rules';
const base={id:'a',type:'alignment',createdAt:'2026-11-17',updatedAt:'2026-11-17',release:'R1',cycle:1,service:'S',qaNotes:'tested',createdBy:'qa',status:'review',runId:'run-1',result:{verdict:'will_survive'},rps:45};
const incident={id:'i',type:'incident',createdAt:'2026-11-17',updatedAt:'2026-11-17',service:'S',symptom:'Latency',incidentType:'Spike',peakRps:10,detectedAt:'2026-11-17',createdBy:'support',status:'open',spec:{cpu:4},load:{rps:10}};
describe('server-enforced demo workflow transitions',()=>{
  it('allows QA creation but not manager forging QA evidence',()=>{
    expect(canStore('alignment','qa',base,null)).toBe(true);
    expect(canStore('alignment','manager',base,null)).toBe(false);
  });
  it('keeps evidence immutable when Technical Lead reviews it',()=>{
    expect(canStore('alignment','lead',{...base,status:'pending-signoff',reviewerNote:'Approve'},base)).toBe(true);
    expect(canStore('alignment','lead',{...base,status:'pending-signoff',rps:300},base)).toBe(false);
  });
  it('allows sign-off only after review',()=>{
    const reviewed={...base,status:'pending-signoff',reviewerNote:'Good'};
    expect(canStore('alignment','manager',{...reviewed,status:'approved',signoffNote:'Approved'},reviewed)).toBe(true);
    expect(canStore('alignment','manager',{...base,status:'approved'},base)).toBe(false);
  });
  it('permits incident creation by support and analysis by engineer',()=>{
    expect(canStore('incident','support',incident,null)).toBe(true);
    expect(canStore('incident','engineer',{...incident,status:'analyzed',engineerNotes:'Mitigated'},incident)).toBe(true);
    expect(canStore('incident','qa',incident,null)).toBe(false);
  });
  it('stores simulations immutably and reports as snapshots',()=>{
    const run={id:'r',created_at:'2026-11-17',request:{load:1},result:{verdict:'will_survive'}};
    expect(canStore('run','qa',run,null)).toBe(true);
    expect(canStore('run','qa',{...run,result:{verdict:'will_crash'}},run)).toBe(false);
    expect(canStore('report','manager',{id:'p',createdAt:'2026-11-17',createdBy:'manager',title:'Report',runIds:[],alignmentIds:[],incidentIds:[]},null)).toBe(true);
  });
});
