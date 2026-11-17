import {beforeEach,describe,expect,it} from 'vitest';
import {defaultLoad,defaultSpec,type VerdictRequest} from './model';
import {DEMO_SESSION_KEY} from './demo';
import {
  rememberLastSimulationSettings,lastSimulationSettings,validSimulationForAlignment,
} from './simulation-session';

const request=():VerdictRequest=>({
  engine:'simpy',
  spec:structuredClone(defaultSpec),
  load:{...defaultLoad,rps:73,avg_cpu_ms_per_req:14},
});
const timestamp='2026-11-17T15:00:00.000Z';

beforeEach(()=>{window.sessionStorage.clear();});

describe('Last successful SimPy inputs: tab & demo-role isolation',()=>{
  it('does not offer shared database history to an anonymous tab',()=>{
    expect(rememberLastSimulationSettings(request(),timestamp)).toBe(false);
    expect(lastSimulationSettings()).toBeNull();
  });
  it('stores complete server and workload inputs for the current role',()=>{
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'qa');
    expect(rememberLastSimulationSettings(request(),timestamp)).toBe(true);
    expect(lastSimulationSettings()).toEqual({request:request(),completedAt:timestamp});
  });
  it('keeps each demo persona separate, even when roles switch in the same tab',()=>{
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'qa');
    expect(rememberLastSimulationSettings(request(),timestamp)).toBe(true);
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'lead');
    expect(lastSimulationSettings()).toBeNull();
    expect(rememberLastSimulationSettings({...request(),load:{...defaultLoad,rps:110}},timestamp)).toBe(true);
    expect(lastSimulationSettings()?.request.load.rps).toBe(110);
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'qa');
    expect(lastSimulationSettings()?.request.load.rps).toBe(73);
  });
  it('uses the latest completed simulation for one role, not the first record',()=>{
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'qa');
    rememberLastSimulationSettings(request(),timestamp);
    rememberLastSimulationSettings({...request(),load:{...defaultLoad,rps:80}},'2026-11-17T15:10:00.000Z');
    expect(lastSimulationSettings()?.request.load.rps).toBe(80);
  });
  it('rejects corrupt, missing, or incompatible alignment parameters',()=>{
    const bad={request:request(),completedAt:timestamp};
    expect(validSimulationForAlignment({...bad,request:{...request(),engine:'rules'}})).toBe(false);
    expect(validSimulationForAlignment({...bad,request:{...request(),load:{...defaultLoad,rps:0}}})).toBe(false);
    expect(validSimulationForAlignment({...bad,request:{...request(),spec:{...defaultSpec,cpu:{cores:4,clock_ghz:0}}}})).toBe(false);
    expect(validSimulationForAlignment({...bad,completedAt:'not a date'})).toBe(false);
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'qa');
    window.sessionStorage.setItem('twinpeak:last-completed-simpy-settings:v1:qa','{corrupt');
    expect(lastSimulationSettings()).toBeNull();
  });
  it('does not mistake a failed/invalid run for a reusable simulation',()=>{
    window.sessionStorage.setItem(DEMO_SESSION_KEY,'qa');
    expect(rememberLastSimulationSettings({...request(),load:{...defaultLoad,rps:0}},timestamp)).toBe(false);
    expect(lastSimulationSettings()).toBeNull();
  });
});
