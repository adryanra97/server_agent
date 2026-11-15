'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound, LockKeyhole, PlugZap, ShieldCheck, Trash2 } from 'lucide-react';
import {
  clearLLMSession, llmProviders, readLLMSession, saveLLMSession, validLLMConfig,
  type LLMSession, type LLMProvider,
} from '../lib/llm-session';

const defaults=llmProviders[0];
export default function LLMSettings(){
  const [provider,setProvider]=useState<LLMProvider>(defaults.id);
  const [endpoint,setEndpoint]=useState(defaults.endpoint);
  const [model,setModel]=useState(defaults.model);
  const [apiKey,setApiKey]=useState('');
  const [visible,setVisible]=useState(false);
  const [saved,setSaved]=useState(false);
  const [testing,setTesting]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    const existing=readLLMSession();
    if(existing){
      setProvider(existing.provider);
      setEndpoint(existing.endpoint);
      setModel(existing.model);
      setApiKey(existing.apiKey);
      setSaved(true);
    }
  },[]);
  const current:LLMSession={provider,endpoint:endpoint.trim(),model:model.trim(),apiKey:apiKey.trim()};
  function selectProvider(value:LLMProvider){
    const preset=llmProviders.find(item=>item.id===value)!;
    setProvider(preset.id);setEndpoint(preset.endpoint);setModel(preset.model);
    setSaved(false);setNotice('');setError('');
  }
  function save(){
    setError('');setNotice('');
    if(!validLLMConfig(current)){
      setError('Choose a supported endpoint and enter a model plus API key. Only the listed provider endpoints are accepted.');
      return;
    }
    try{
      saveLLMSession(current);setSaved(true);setNotice('LLM configuration saved for this browser tab only.');
    }catch{setError('Could not save to the browser session. Check your browser privacy settings.');}
  }
  async function test(){
    setError('');setNotice('');
    if(!validLLMConfig(current)){
      setError('Enter a supported endpoint, model, and API key before testing.');return;
    }
    setTesting(true);
    try{
      const response=await fetch('/api/reasoning',{
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
        body:JSON.stringify({kind:'test',session:current}),
      });
      if(!response.ok)throw Error('The provider rejected the request or did not respond.');
      const data=await response.json();
      if(!data?.generated)throw Error('The provider did not return a model response.');
      setNotice('Connection verified. The model answered a test request; save the configuration to use it across TwinPeak.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to test LLM connection.');}
    finally{setTesting(false);}
  }
  function clear(){
    clearLLMSession();
    setApiKey('');setVisible(false);setSaved(false);setNotice('Session credentials have been cleared.');setError('');
  }
  return <div className="tp-llm-settings">
    <section className="tp-llm-intro"><span className="tp-kicker"><KeyRound size={16}/> EXPLORE / TEMPORARY INTEGRATION</span>
      <h2>Connect your LLM for this session.</h2>
      <p>Use your own API provider to add explanations when a capacity evaluation cannot be completed, or to enrich a report. The SimPy engine still makes the capacity decisions.</p>
    </section>
    <section className="tp-llm-card">
      <div className="tp-llm-card-header"><div><span>MODEL CONNECTION</span><h3>API configuration</h3><p>Credentials are only needed for AI-assisted explanations.</p></div><PlugZap size={25}/></div>
      <div className="tp-llm-form">
        <label>Provider<select value={provider} onChange={e=>selectProvider(e.target.value as LLMProvider)}>{llmProviders.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Model identifier<input value={model} spellCheck={false} autoComplete="off" onChange={e=>{setModel(e.target.value);setSaved(false);}} placeholder="Enter the provider model ID"/></label>
        <label className="tp-llm-wide">Chat Completions endpoint<input type="url" value={endpoint} spellCheck={false} autoComplete="off" onChange={e=>{setEndpoint(e.target.value);setSaved(false);}}/></label>
        <label className="tp-llm-wide">API key
          <span className="tp-llm-key-field"><input type={visible?'text':'password'} value={apiKey} autoComplete="off" spellCheck={false} placeholder="Paste your temporary API key" onChange={e=>{setApiKey(e.target.value);setSaved(false);}}/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Hide API key':'Show API key'}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></span>
        </label>
      </div>
      <div className="tp-llm-actions"><button type="button" className="tp-llm-save" onClick={save}><ShieldCheck size={17}/> {saved?'Update session':'Save for this session'}</button><button type="button" disabled={testing} onClick={()=>void test()} className="tp-llm-test"><PlugZap size={17}/>{testing?'Testing provider…':'Test connection'}</button><button type="button" className="tp-llm-clear" onClick={clear}><Trash2 size={17}/> Clear session</button></div>
      {error&&<p className="tp-llm-error" role="alert"><CircleAlert size={17}/>{error}</p>}
      {notice&&<p className="tp-llm-notice" role="status"><CheckCircle2 size={17}/>{notice}</p>}
      <div className="tp-llm-persist"><LockKeyhole size={20}/><div><strong>Session-only storage</strong><p>The key is kept in this tab's browser session storage, not in a TwinPeak database or report. It is sent through TwinPeak to your selected provider only when needed. Closing this tab or signing out clears it. Browser session storage is accessible to scripts running on this site, so use a limited-scope, low-budget key rather than a production credential.</p></div></div>
    </section>
    <section className="tp-llm-card tp-llm-guide"><div className="tp-llm-card-header"><div><span>HOW IT WORKS</span><h3>Simulation first. Explanation second.</h3></div></div>
      <div className="tp-llm-steps"><div><strong>01</strong><p>SimPy receives the complete workload, regardless of RPS.</p></div><div><strong>02</strong><p>If the engine cannot evaluate a scenario, TwinPeak reports <b>Tidak Dapat Dinilai</b> and can request a model explanation.</p></div><div><strong>03</strong><p>AI assistance explains missing evidence and next steps. It does not invent measurements or turn an unassessable case into a passing verdict.</p></div></div>
    </section>
  </div>;
}
