// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const approved={
  provider:'openai',endpoint:'https://api.openai.com/v1/chat/completions',
  apiKey:'sensitive_test_credential',model:'gpt-4.1-mini',
};
const call=(body:unknown)=>POST(new NextRequest('http://localhost/api/reasoning',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
}));
describe('LLM proxy security and boundary enforcement',()=>{
  it('rejects unsupported request types without provider calls',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    const result=await call({kind:'dangerous',session:approved});
    expect(result.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects private-network endpoints (SSRF regression)',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    for(const endpoint of ['http://127.0.0.1:9000','http://169.254.169.254/latest/meta-data',
      'https://api.openai.com.evil.example/v1/chat/completions']){
      const response=await call({kind:'test',session:{...approved,endpoint}});
      expect(response.status).toBe(422);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects missing API key on connection test',async()=>{
    expect((await call({kind:'test'})).status).toBe(422);
  });
  it('prevents overlong bodies before parsing sensitive configuration',async()=>{
    const response=await call({kind:'report',summary:'a'.repeat(9000)});
    expect(response.status).toBe(413);
  });
  it('rejects invalid RPS for indeterminate explanations',async()=>{
    expect((await call({kind:'indeterminate',rps:-5})).status).toBe(422);
  });
  it('does not claim to run an LLM without session credentials',async()=>{
    const output=await call({kind:'report',service:'QRIS',verdict:'will_survive',summary:'Safe'});
    expect(output.status).toBe(200);
    const json=await output.json();
    expect(json).toMatchObject({generated:false,source:'model'});
    expect(output.headers.get('Cache-Control')).toMatch(/no-store/);
  });
  it('calls only the allowlisted provider, without redirects or caching',async()=>{
    const fetcher=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({choices:[{message:{content:'CONNECTED'}}]}),
    });vi.stubGlobal('fetch',fetcher);
    const response=await call({kind:'test',session:approved});
    expect(response.status).toBe(200);
    expect((await response.json()).generated).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url,init]=fetcher.mock.calls[0] as [string,RequestInit];
    expect(url).toBe(approved.endpoint);
    expect(init.redirect).toBe('error');
    expect(init.cache).toBe('no-store');
    expect((init.headers as Record<string,string>).Authorization).toBe('Bearer '+approved.apiKey);
  });
  it('does not leak secrets when the provider rejects the token',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({
      ok:false,json:async()=>({error:'provider echoed '+approved.apiKey}),
    }));
    const response=await call({kind:'test',session:approved});
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(approved.apiKey);
  });
  it('fails closed if the provider cannot be reached',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('credential='+approved.apiKey)));
    const response=await call({kind:'test',session:approved});
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(approved.apiKey);
  });
  it('does not override SimPy verdicts when enriching a report',async()=>{
    const fetcher=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({choices:[{message:{content:'Review the evidence'}}]}),
    });vi.stubGlobal('fetch',fetcher);
    const response=await call({kind:'report',verdict:'will_crash',summary:'CPU overload',session:approved});
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain('will_survive');
    const prompt=JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(prompt.messages[1].content).toContain('Never override');
  });
});
