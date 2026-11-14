'use client';
import { useEffect, useState } from 'react';
import {
  Activity, ArrowUpRight, BookOpenText, Braces, Check, Copy, FileJson,
  Info, LoaderCircle, Play, Server, ShieldCheck, Waves,
} from 'lucide-react';
import { defaultLoad, defaultSpec } from '../lib/model';

type Endpoint={
  name:string;
  method:'GET'|'POST';
  path:string;
  group:'Core evaluation'|'Operational intelligence'|'Reference';
  description:string;
  body?:unknown;
  reference?:boolean;
};
const endpoints:Endpoint[]=[
  {name:'Evaluate capacity',method:'POST',path:'/verdict',group:'Core evaluation',
    description:'Execute Rules or SimPy for a server and workload. Returns utilization, model outcome, limiting resource and explanation.',
    body:{engine:'simpy',spec:defaultSpec,load:defaultLoad}},
  {name:'Inspect SimPy execution',method:'POST',path:'/api/v1/simpy/inspect',group:'Core evaluation',
    description:'Execute the same SimPy model with diagnostic aggregates and per-second simulation records. Does not alter the original capacity verdict.',
    body:{engine:'simpy',spec:defaultSpec,load:defaultLoad}},
  {name:'Engine availability',method:'GET',path:'/engines',group:'Operational intelligence',
    description:'Returns the engine IDs enabled for model execution.'},
  {name:'Service health',method:'GET',path:'/health',group:'Operational intelligence',
    description:'Returns the current operational status of the evaluation service.'},
  {name:'Engineering quality',method:'GET',path:'/api/v1/quality',group:'Operational intelligence',
    description:'Displays the most recent reported engineering quality workflow status when available.'},
  {name:'API specification',method:'GET',path:'/openapi.json',group:'Reference',
    description:'Machine-readable specification for every registered application endpoint, including schemas and validation.'},
  {name:'Interactive API reference',method:'GET',path:'/docs',group:'Reference',
    description:'Opens the complete interactive endpoint documentation in a new tab.',reference:true},
];
const groups:Endpoint['group'][]=['Core evaluation','Operational intelligence','Reference'];
const info='Run an operation to inspect its genuine response. Nothing shown here is a fabricated microservice.';

export default function Developer(){
  const [selected,setSelected]=useState(0);
  const [edits,setEdits]=useState<Record<string,string>>({});
  const [response,setResponse]=useState('Choose an endpoint and execute a request to view its response.');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const [health,setHealth]=useState<'checking'|'online'|'unavailable'>('checking');
  const [engineNames,setEngineNames]=useState<string[]>([]);
  useEffect(()=>{
    fetch('/health').then(r=>r.json()).then(d=>setHealth(d.status==='ok'?'online':'unavailable')).catch(()=>setHealth('unavailable'));
    fetch('/engines').then(r=>r.json()).then(d=>setEngineNames(Array.isArray(d.engines)?d.engines:[])).catch(()=>setEngineNames([]));
  },[]);
  const endpoint=endpoints[selected];
  const input=edits[endpoint.path]??JSON.stringify(endpoint.body??{},null,2);
  function choose(i:number){setSelected(i);setStatus('');setResponse('Execute this endpoint to view its actual response.');}
  async function send(){
    if(endpoint.reference){window.open(endpoint.path,'_blank','noopener,noreferrer');return;}
    setBusy(true);setStatus('');
    try{
      const request:RequestInit={method:endpoint.method,cache:'no-store'};
      if(endpoint.method==='POST'){
        request.headers={'Content-Type':'application/json'};
        request.body=JSON.stringify(JSON.parse(input));
      }
      const res=await fetch(endpoint.path,request);
      const text=await res.text();
      let content=text;
      try{content=JSON.stringify(JSON.parse(text),null,2);}catch{}
      setStatus(res.status+' '+(res.ok?'SUCCESS':'ERROR'));
      setResponse(content);
    }catch(e){setStatus('REQUEST FAILED');setResponse(e instanceof Error?e.message:'The request could not be completed.');}
    finally{setBusy(false);}
  }
  async function copy(){try{await navigator.clipboard.writeText(response);setCopied(true);window.setTimeout(()=>setCopied(false),1400);}catch{}}
  return <div className="sa-api">
    <section className="sa-api-hero"><div><span className="role-eyebrow">ENGINEERING REFERENCE / VERIFIED ROUTES</span>
      <h2>Know what is connected.</h2><p>Explore every endpoint in the source service and the two ServerAgent extensions. Each request uses the actual deployed evaluation service.</p></div>
      <div className="sa-api-status"><span className={'sa-api-status-dot '+(health==='online'?'online':'')}/><strong>{health==='online'?'Engine Online':health==='checking'?'Checking connection':'Engine Unavailable'}</strong><small>Checked via service health</small></div>
    </section>
    <div className="sa-api-facts">
      <div><span>REGISTERED ROUTES</span><strong>07</strong><small>5 core/documentation + 2 extensions</small></div>
      <div><span>EVALUATION ENGINES</span><strong>{engineNames.length||'—'}</strong><small>{engineNames.length?engineNames.join(' · '):'Checking registry'}</small></div>
      <div><span>API INTERFACE</span><strong>REST</strong><small>JSON requests and responses</small></div>
      <div><span>DOCUMENTATION</span><strong>OpenAPI</strong><small>Interactive reference available</small></div>
    </div>
    <div className="sa-api-layout">
      <nav className="sa-api-sidebar" aria-label="API endpoints">
        <div className="sa-api-sidebar-head"><Braces size={19}/><strong>Endpoint directory</strong></div>
        {groups.map(group=><div className="sa-api-group" key={group}><h3>{group}</h3>
          {endpoints.map((item,i)=>item.group!==group?null:<button key={item.path} className={'sa-api-endpoint '+(selected===i?'selected':'')}
            type="button" onClick={()=>choose(i)} aria-current={selected===i?'true':undefined}>
            <span className={'sa-api-method '+(item.method==='GET'?'get':'post')}>{item.method}</span><span><strong>{item.name}</strong><small>{item.path}</small></span>
          </button>)}</div>)}
      </nav>
      <section className="sa-api-console">
        <div className="sa-api-console-head"><span className="role-eyebrow">ENDPOINT EXPLORER</span><div><span className={'sa-api-method '+(endpoint.method==='GET'?'get':'post')}>{endpoint.method}</span><code>{endpoint.path}</code></div><h3>{endpoint.name}</h3><p>{endpoint.description}</p></div>
        {endpoint.reference?<div className="sa-api-reference"><BookOpenText size={34}/><strong>Full API documentation</strong><p>Open the interactive reference to explore request schema, validation and example responses.</p><a href="/docs" target="_blank" rel="noopener noreferrer">Open API documentation <ArrowUpRight size={17}/></a></div>:<>
          {endpoint.method==='POST'&&<div className="sa-api-editor"><div><strong>Request payload</strong><span>Editable JSON</span></div><textarea spellCheck={false} aria-label="JSON request body" value={input} onChange={e=>setEdits(old=>({...old,[endpoint.path]:e.target.value}))}/></div>}
          <div className="sa-api-send"><button onClick={send} disabled={busy}>{busy?<><LoaderCircle className="spin" size={17}/> Executing…</>:<><Play size={17} fill="currentColor"/> Execute request</>}</button><span>{status||'Ready to send'}</span></div>
          <div className="sa-api-response"><div><strong>Response data</strong><button onClick={copy}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Copied':'Copy JSON'}</button></div><pre><code>{response}</code></pre></div>
        </>}
        <p className="sa-api-note"><Info size={16}/> {info}</p>
      </section>
    </div>
  </div>;
}
