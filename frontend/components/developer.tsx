'use client';
import { useState } from 'react';
import { ArrowUpRight, Braces, Check, Copy, ExternalLink, Info, LoaderCircle, Play, ShieldCheck, Terminal } from 'lucide-react';
import { defaultLoad, defaultSpec } from '../lib/model';
import { SectionHead } from './ui';
type Endpoint={name:string;method:'GET'|'POST';path:string;description:string;body?:unknown};
const endpoints:Endpoint[]=[
  {name:'Health check',method:'GET',path:'/health',description:'Liveness check for the original FastAPI service.'},
  {name:'Available engines',method:'GET',path:'/engines',description:'Return the available engine IDs: rules and simpy.'},
  {name:'Capacity verdict',method:'POST',path:'/verdict',description:'Run one engine with a server specification and workload. Returns the verdict, confidence, resource utilization, bottleneck and reasons.',body:{engine:'rules',spec:defaultSpec,load:defaultLoad}},
  {name:'OpenAPI document',method:'GET',path:'/openapi.json',description:'Machine-readable OpenAPI contract generated from the source Pydantic schemas.'},
  {name:'SimPy run inspection',method:'POST',path:'/api/v1/simpy/inspect',description:'ServerAgent extension: run the original SimPy model and return its exact verdict plus structured execution evidence. The original /verdict endpoint remains unchanged.',body:{engine:'simpy',spec:defaultSpec,load:defaultLoad}}
];
export default function Developer(){
  const [selected,setSelected]=useState(4);
  const [edits,setEdits]=useState<Record<string,string>>({});
  const [response,setResponse]=useState('Send a request to view the actual response from FastAPI.');
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const endpoint=endpoints[selected];
  const input=edits[endpoint.path]??JSON.stringify(endpoint.body??{},null,2);
  async function send(){
    setBusy(true);setStatus('');
    try{
      const request:RequestInit={method:endpoint.method};
      if(endpoint.method==='POST'){request.headers={'Content-Type':'application/json'};request.body=JSON.stringify(JSON.parse(input));}
      const res=await fetch(endpoint.path,request);
      const json=await res.json();
      setStatus(`${res.status} ${res.ok?'OK':'ERROR'}`);
      setResponse(JSON.stringify(json,null,2));
    }catch(e){setStatus('FAILED');setResponse(e instanceof Error?e.message:'Request could not be completed.');}
    finally{setBusy(false)}
  }
  function choose(i:number){setSelected(i);setStatus('');setResponse('Send a request to view the actual response from FastAPI.');}
  async function copy(){try{await navigator.clipboard.writeText(response);setCopied(true);setTimeout(()=>setCopied(false),1300)}catch{}}
  return <div className="page-stack">
    <div className="notice notice-technical"><span className="notice-icon"><Braces size={18}/></span><div><strong>Original copdash interface, preserved.</strong><span>GET /health, GET /engines, POST /verdict, GET /docs and GET /openapi.json. The playground sends real requests to the same FastAPI application.</span></div><a href="/docs" className="notice-link" target="_blank" rel="noopener noreferrer">Swagger UI <ArrowUpRight size={16}/></a></div>
    <div className="api-summary"><div><span className="kicker">ENGINE COUNT</span><strong>02</strong></div><div><span className="kicker">CORE + INSPECTION</span><strong>06</strong></div><div><span className="kicker">PAYLOAD FORMAT</span><strong>JSON</strong></div><div><span className="kicker">API FRAMEWORK</span><strong>FastAPI</strong></div></div>
    <section className="panel api-console"><div className="api-console-top"><div><span className="kicker">LIVE API PLAYGROUND</span><h3>Inspect a request</h3></div><div className="api-console-links"><a href="/docs" target="_blank" rel="noopener noreferrer">Swagger <ExternalLink size={15}/></a><a href="/openapi.json" target="_blank" rel="noopener noreferrer">OpenAPI JSON <ExternalLink size={15}/></a></div></div>
      <div className="api-layout"><div className="api-list"><span className="api-list-label">COPDASH + SIMPY INSPECTION</span>{endpoints.map((item,i)=><button key={item.path} onClick={()=>choose(i)} className={`endpoint-item ${selected===i?'endpoint-selected':''}`}><span className={`method ${item.method==='GET'?'method-get':'method-post'}`}>{item.method}</span><span className="endpoint-meta"><strong>{item.name}</strong><small>{item.path}</small></span></button>)}</div>
      <div className="api-detail"><div className="api-detail-heading"><span className={`method ${endpoint.method==='GET'?'method-get':'method-post'}`}>{endpoint.method}</span><code>{endpoint.path}</code></div><p className="api-description">{endpoint.description}</p>
        {endpoint.method==='POST'&&<><div className="code-heading"><span>REQUEST BODY</span><span>Editable JSON</span></div><textarea className="json-editor" spellCheck={false} value={input} onChange={e=>setEdits(old=>({...old,[endpoint.path]:e.target.value}))} aria-label="JSON request body"/></>}
        <div className="api-actions"><button disabled={busy} onClick={send} className="btn btn-primary">{busy?<><LoaderCircle className="spin" size={16}/>Sending…</>:<><Play size={16} fill="currentColor"/>Send request</>}</button><span className="api-status">{status||'No request yet'}</span></div>
        <div className="code-heading"><span>LIVE RESPONSE</span><button onClick={copy} className="copy-button">{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy'}</button></div><pre className="response-view"><code>{response}</code></pre>
      </div></div>
    </section><div className="insight-bar"><span className="insight-symbol"><ShieldCheck size={19}/></span><div><strong>No invented microservices.</strong><span>The user interface and Python engine live in one Vercel project. The API contracts and engine outputs remain directly inspectable as JSON.</span></div></div>
  </div>;
}
