'use client';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpenText, Braces, Check, ChevronDown, CircleAlert, Code2, Copy, ExternalLink, Info, LoaderCircle, Play, ShieldCheck, Terminal } from 'lucide-react';
import { baseLoad, baseSpec } from '../lib/model';
import { Eyebrow } from './ui';
type Method='GET'|'POST';
type Endpoint={name:string;method:Method;path:string;desc:string;body?:unknown};
const examples:Endpoint[]=[
  {name:'Health',method:'GET',path:'/api/v1/health',desc:'Runtime status and whether cloud database credentials are configured.'},
  {name:'Engine registry',method:'GET',path:'/api/v1/engines',desc:'Discover the available deterministic and discrete-event models.'},
  {name:'Capacity verdict',method:'POST',path:'/api/v1/verdict',desc:'Evaluate one load profile against a server specification.',body:{engine:'rules',spec:baseSpec,load:baseLoad}},
  {name:'Scenario comparison',method:'POST',path:'/api/v1/scenarios/compare',desc:'Compare baseline against 2× and 3× traffic using the same backend engine.',body:{engine:'rules',spec:baseSpec,load:baseLoad,scenarios:[{name:'Baseline',multiplier:1},{name:'2× traffic',multiplier:2},{name:'3× traffic',multiplier:3}]}},
  {name:'Multi-node topology',method:'POST',path:'/api/v1/topology/evaluate',desc:'Evaluate a simplified traffic distribution across active nodes.',body:{engine:'rules',spec:baseSpec,load:baseLoad,nodes:[{id:'a',name:'Node A',online:true,weight:1},{id:'b',name:'Node B',online:true,weight:1}]}},
  {name:'Engineering quality',method:'GET',path:'/api/v1/quality',desc:'Read the latest CI workflow run from GitHub Actions without manufacturing metrics.'}
];
export default function Developer(){
  const [selected,setSelected]=useState(2);
  const endpoint=examples[selected];
  const [edits,setEdits]=useState<Record<string,string>>({});
  const body=edits[endpoint.path]??JSON.stringify(endpoint.body??{},null,2);
  const [output,setOutput]=useState('Select “Send request” to inspect a live JSON response from the backend.');
  const [status,setStatus]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [copied,setCopied]=useState(false);
  async function send(){
    setLoading(true);setStatus(null);
    try{
      const options:RequestInit={method:endpoint.method};
      if(endpoint.method==='POST'){options.headers={'Content-Type':'application/json'};options.body=JSON.stringify(JSON.parse(body));}
      const response=await fetch(endpoint.path,options);
      const json=await response.json();
      setStatus(`${response.status} ${response.ok?'SUCCESS':'ERROR'}`);
      setOutput(JSON.stringify(json,null,2));
    }catch(e){setStatus('REQUEST FAILED');setOutput(e instanceof Error?e.message:'Network request failed');}
    finally{setLoading(false)}
  }
  function select(i:number){setSelected(i);setStatus(null);setOutput('Select “Send request” to inspect a live JSON response from the backend.');}
  async function copy(){await navigator.clipboard.writeText(output);setCopied(true);setTimeout(()=>setCopied(false),1400)}
  return <div className="page-stack"><div className="notice notice-technical"><span className="notice-icon"><Braces size={19}/></span><div><strong>One platform, real JSON endpoints.</strong><span>These routes call the same Python FastAPI engines as the dashboard—served through the same Vercel deployment.</span></div><a href="/api/docs" target="_blank" rel="noopener noreferrer" className="notice-link">Full Swagger docs <ArrowUpRight size={16}/></a></div>
    <div className="api-summary"><div><span className="kicker">API VERSION</span><strong>v1</strong></div><div><span className="kicker">FORMAT</span><strong>JSON</strong></div><div><span className="kicker">SPECIFICATION</span><strong>OpenAPI 3.x</strong></div><div><span className="kicker">ENGINE</span><strong>FastAPI</strong></div></div>
    <section className="panel api-console"><div className="api-console-top"><div><span className="kicker">INTERACTIVE DOCUMENTATION</span><h3>API playground</h3></div><div className="api-console-links"><a href="/api/docs" target="_blank" rel="noopener noreferrer">Swagger UI <ExternalLink size={15}/></a><a href="/api/openapi.json" target="_blank" rel="noopener noreferrer">OpenAPI JSON <ExternalLink size={15}/></a></div></div>
      <div className="api-layout"><div className="api-list"><span className="api-list-label">AVAILABLE ENDPOINTS</span>{examples.map((v,i)=><button className={`endpoint-item ${selected===i?'endpoint-selected':''}`} key={v.path} onClick={()=>select(i)}><span className={`method ${v.method==='GET'?'method-get':'method-post'}`}>{v.method}</span><span className="endpoint-meta"><strong>{v.name}</strong><small>{v.path}</small></span></button>)}</div>
      <div className="api-detail"><div className="api-detail-heading"><span className={`method ${endpoint.method==='GET'?'method-get':'method-post'}`}>{endpoint.method}</span><code>{endpoint.path}</code></div><p className="api-description">{endpoint.desc}</p>
        {endpoint.method==='POST'&&<div className="code-heading"><span>REQUEST BODY</span><span>Editable JSON</span></div>}
        {endpoint.method==='POST'&&<textarea spellCheck={false} className="json-editor" value={body} onChange={e=>setEdits(v=>({...v,[endpoint.path]:e.target.value}))} aria-label="JSON request body"/>}
        <div className="api-actions"><button className="btn btn-primary" onClick={send} disabled={loading}>{loading?<><LoaderCircle size={16} className="spin"/> Sending…</>:<><Play size={16} fill="currentColor"/> Send request</>}</button><span className="api-status">{status??'No request executed'}</span></div>
        <div className="code-heading"><span>RESPONSE</span><button className="copy-button" onClick={copy}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy JSON'}</button></div>
        <pre className="response-view"><code>{output}</code></pre>
      </div></div>
    </section><div className="insight-bar"><span className="insight-symbol"><ShieldCheck size={19}/></span><div><strong>Designed for transparent use.</strong><span>Public demo modeling uses synthetic scenarios. Database history and future privileged operations require separate access credentials and authorization.</span></div></div>
  </div>;
}
