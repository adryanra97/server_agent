import {afterEach,describe,expect,it,vi} from 'vitest';
import type {NextRequest} from 'next/server';
import {getSessionRole,makeSession,sameOrigin,workspaceConfigured} from './workspace-auth';
afterEach(()=>vi.unstubAllEnvs());
function request(token:string,origin='https://twin.example.com'){
  return {url:'https://twin.example.com/api/workspace/data',cookies:{get:()=>({value:token})},headers:{get:(key:string)=>key==='origin'?origin:null}} as unknown as NextRequest;
}
describe('Signed demo session and request origin',()=>{
  it('refuses cloud access until both staging secrets are available',()=>{
    vi.stubEnv('DATABASE_URL','');
    vi.stubEnv('TWINPEAK_SESSION_SECRET','');
    expect(workspaceConfigured()).toBe(false);
    expect(getSessionRole(request(makeSession('qa')))).toBeNull();
  });
  it('authenticates only valid, untampered role cookies',()=>{
    vi.stubEnv('DATABASE_URL','postgresql://local.test/demo');
    vi.stubEnv('TWINPEAK_SESSION_SECRET','not-a-shared-demo-password-use-random');
    const signed=makeSession('lead');
    expect(getSessionRole(request(signed))).toBe('lead');
    expect(getSessionRole(request('qa'+signed.slice(4)))).toBeNull();
    expect(getSessionRole(request('garbage'))).toBeNull();
  });
  it('enforces a same-origin browser write',()=>{
    expect(sameOrigin(request('cookie'))).toBe(true);
    expect(sameOrigin(request('cookie','https://evil.example.com'))).toBe(false);
    expect(sameOrigin(request('cookie',''))).toBe(false);
  });
});
