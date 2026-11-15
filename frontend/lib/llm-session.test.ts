import { describe, expect, it, vi } from 'vitest';
import {
  LLM_SESSION_KEY, clearLLMSession, llmProviders, readLLMSession,
  requestReasoning, saveLLMSession, validLLMConfig,
} from './llm-session';

const config=()=>({
  provider:'openai' as const,
  endpoint:'https://api.openai.com/v1/chat/completions',
  model:'gpt-4.1-mini',apiKey:'temporary_test_only',
});
describe('LLM session security',()=>{
  it('accepts a supported provider and exact host',()=>{
    expect(validLLMConfig(config())).toBe(true);
    expect(llmProviders.length).toBeGreaterThanOrEqual(4);
  });
  it('rejects arbitrary, local and private-network endpoints',()=>{
    for(const endpoint of [
      'http://127.0.0.1:8000/admin','http://169.254.169.254/latest/meta-data',
      'https://api.openai.com.evil.example/v1/chat/completions',
      'https://api.openai.com/v1/chat/completions?redirect=localhost',
    ])expect(validLLMConfig({...config(),endpoint})).toBe(false);
  });
  it('rejects empty keys, empty models, and overlong credentials',()=>{
    expect(validLLMConfig({...config(),apiKey:''})).toBe(false);
    expect(validLLMConfig({...config(),model:''})).toBe(false);
    expect(validLLMConfig({...config(),apiKey:'a'.repeat(501)})).toBe(false);
  });
  it('stores credentials only in sessionStorage, never in localStorage',()=>{
    saveLLMSession(config());
    expect(readLLMSession()).toEqual(config());
    expect(window.localStorage.getItem(LLM_SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(LLM_SESSION_KEY)).toContain('temporary_test_only');
  });
  it('allows explicit credential cleanup',()=>{
    saveLLMSession(config());
    clearLLMSession();
    expect(readLLMSession()).toBeNull();
    expect(window.sessionStorage.getItem(LLM_SESSION_KEY)).toBeNull();
  });
  it('rejects corrupted browser session JSON',()=>{
    window.sessionStorage.setItem(LLM_SESSION_KEY,'{broken');
    expect(readLLMSession()).toBeNull();
  });
  it('does not send credentials without a configured session',async()=>{
    const fetcher=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({text:'Model evidence',generated:false,source:'model'}),
    });
    vi.stubGlobal('fetch',fetcher);
    const result=await requestReasoning({kind:'report',service:'QRIS',rps:45,summary:'No overload'});
    expect(result.generated).toBe(false);
    const init=fetcher.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body)).session).toBeUndefined();
    expect(init.cache).toBe('no-store');
  });
  it('forwards a configured session only when requesting reasoning',async()=>{
    saveLLMSession(config());
    const fetcher=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({text:'Explained',generated:true,source:'llm'}),
    });
    vi.stubGlobal('fetch',fetcher);
    await requestReasoning({kind:'indeterminate',service:'QRIS',rps:800,summary:'No verdict'});
    const body=JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(body.session.apiKey).toBe('temporary_test_only');
  });
  it('propagates failed reasoning responses without echoing provider credentials',async()=>{
    saveLLMSession(config());
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({error:'secret'})}));
    await expect(requestReasoning({kind:'report',service:'QRIS',rps:45,summary:'a'}))
      .rejects.toThrow('Explanation service is temporarily unavailable');
  });
});
