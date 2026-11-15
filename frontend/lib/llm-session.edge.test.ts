import { describe, expect, it, vi } from 'vitest';
import {
  LLM_SESSION_KEY, clearLLMSession, readLLMSession,
  requestReasoning, saveLLMSession, validLLMConfig,
} from './llm-session';

const valid=()=>({
  provider:'openai' as const,endpoint:'https://api.openai.com/v1/chat/completions',
  model:'gpt-4.1-mini',apiKey:'sample-session-only',
});
describe('LLM credential boundaries and malformed data',()=>{
  it('rejects valid JSON that is not an approved session configuration',()=>{
    window.sessionStorage.setItem(LLM_SESSION_KEY,JSON.stringify({
      ...valid(),endpoint:'https://attacker.example.com',
    }));
    expect(readLLMSession()).toBeNull();
  });
  it('rejects client-side session save with an unsupported provider',()=>{
    expect(()=>saveLLMSession({...valid(),model:''})).toThrow('Complete a supported provider');
    expect(window.sessionStorage.getItem(LLM_SESSION_KEY)).toBeNull();
  });
  it('does not expose browser credentials while rendering on the server',()=>{
    vi.stubGlobal('window',undefined);
    try{
      expect(readLLMSession()).toBeNull();
      expect(()=>clearLLMSession()).not.toThrow();
      expect(()=>saveLLMSession(valid())).toThrow('Complete a supported provider');
    }finally{vi.unstubAllGlobals();}
  });
  it('checks maximum model identifier length and whitespace-only tokens',()=>{
    expect(validLLMConfig({...valid(),model:' '.repeat(3)})).toBe(false);
    expect(validLLMConfig({...valid(),model:'g'.repeat(161)})).toBe(false);
    expect(validLLMConfig({...valid(),apiKey:' '.repeat(4)})).toBe(false);
  });
  it('fails safely when API response is not JSON',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({
      ok:true,json:vi.fn().mockRejectedValue(Error('unparseable')),
    }));
    await expect(requestReasoning({kind:'report',service:'QRIS',rps:45,summary:'CPU'}))
      .rejects.toThrow('Explanation service is temporarily unavailable');
  });
  it('rejects a successful HTTP status with no valid explanatory text',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({
      ok:true,json:async()=>({generated:true,source:'llm',text:null}),
    }));
    await expect(requestReasoning({kind:'report',service:'QRIS',rps:45,summary:'CPU'}))
      .rejects.toThrow('Explanation service is temporarily unavailable');
  });
});
