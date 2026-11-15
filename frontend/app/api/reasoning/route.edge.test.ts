// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const credentials={
  provider:'openai',endpoint:'https://api.openai.com/v1/chat/completions',
  model:'gpt-4.1-mini',apiKey:'test-only-secret',
};
const request=(value:unknown)=>POST(new NextRequest('http://localhost/api/reasoning',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),
}));
describe('LLM route defensive paths and interpretation safety',()=>{
  it('rejects unparseable request bodies and does not contact providers',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    const reply=await POST(new NextRequest('http://localhost/api/reasoning',{
      method:'POST',body:'{not-valid-json',
    }));
    expect(reply.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects null, nonobject and missing request kinds',async()=>{
    for(const item of [null,123,'hello',{},[],{kind:null}]){
      expect((await request(item)).status).toBe(400);
    }
  });
  it('fails validation for a partial model provider session',async()=>{
    const variants=[
      {...credentials,provider:'unknown'},
      {...credentials,endpoint:'https://api.openai.com/unsafe'},
      {...credentials,model:''},
      {...credentials,apiKey:''},
      {...credentials,model:'a'.repeat(161)},
      {...credentials,apiKey:'a'.repeat(501)},
      {...credentials,provider:123},
      {...credentials,endpoint:null},
      {...credentials,model:null},
      {...credentials,apiKey:null},
    ];
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    for(const session of variants)expect((await request({kind:'test',session})).status).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('describes a genuinely indeterminate SimPy result without inventing a verdict',async()=>{
    const response=await request({kind:'indeterminate',service:'QRIS',rps:1000,summary:'SimPy unavailable'});
    expect(response.status).toBe(200);
    const json=await response.json();
    expect(json).toMatchObject({source:'model',generated:false});
    expect(json.text).toContain('Tidak Dapat Dinilai');
    expect(json.text).toContain('1000 RPS');
    expect(json.text).toContain('SimPy unavailable');
    expect(json.text).not.toContain('Lolos Bersyarat');
  });
  it('defaults an incomplete report context to a non-LLM explanation',async()=>{
    const response=await request({kind:'report'});
    expect(response.status).toBe(200);
    const json=await response.json();
    expect(json.text).toContain('Aplikasi');
    expect(json.text).toContain('verdict belum tersedia');
    expect(json.text).toContain('Model tidak menghasilkan bukti yang cukup');
  });
  it('rejects a missing or nonfinite workload before attempting model reasoning',async()=>{
    for(const rps of [undefined,'NaN',null,-1]){
      const response=await request({kind:'indeterminate',rps});
      expect(response.status).toBe(422);
    }
  });
  it('fails closed when the provider sends an empty or incompatible response',async()=>{
    const fetcher=vi.fn();
    vi.stubGlobal('fetch',fetcher);
    for(const response of [{},{choices:[]},{choices:[{}]},{choices:[{message:{content:null}}]}]){
      fetcher.mockResolvedValueOnce({ok:true,json:async()=>response});
      const result=await request({kind:'test',session:credentials});
      expect(result.status).toBe(502);
      expect(await result.text()).not.toContain(credentials.apiKey);
    }
  });
  it('truncates long generated narrative rather than emitting unlimited tokens',async()=>{
    const fetcher=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({choices:[{message:{content:'M'.repeat(5000)}}]}),
    });
    vi.stubGlobal('fetch',fetcher);
    const response=await request({
      kind:'report',session:credentials,service:'QRIS',verdict:'will_crash',
      summary:'CPU overloaded',notes:'Review server profile',
    });
    const payload=await response.json();
    expect(payload.generated).toBe(true);
    expect(payload.text).toHaveLength(2000);
    const options=JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(options.max_tokens).toBe(300);
    expect(options.messages[1].content).toContain('CPU overloaded');
    expect(options.messages[1].content).toContain('Review server profile');
  });
  it('does not replace an indeterminate verdict when returning LLM explanation',async()=>{
    const fetcher=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({choices:[{message:{content:'Periksa data workload'}}]}),
    });vi.stubGlobal('fetch',fetcher);
    const response=await request({
      kind:'indeterminate',service:'QRIS',rps:450,summary:'Engine offline',session:credentials,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text:'Periksa data workload',generated:true,source:'llm',
    });
    const prompt=JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(prompt.messages[1].content).toContain('Tidak Dapat Dinilai');
  });
  it('returns a sanitized error when the provider supplies invalid JSON',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({
      ok:true,json:async()=>{throw Error('provider echoed test-only-secret');},
    }));
    const result=await request({kind:'test',session:credentials});
    expect(result.status).toBe(502);
    expect(await result.text()).not.toContain(credentials.apiKey);
  });
});
