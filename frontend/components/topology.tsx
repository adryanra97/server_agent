'use client';
import { useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, CircleAlert, Cloud, Cpu, Gauge, GitMerge, Info, LoaderCircle, Network, Play, Power, RotateCcw, Server, ShieldAlert, Zap } from 'lucide-react';
import { apiPost, baseLoad, baseSpec, localVerdict, type VerdictResult } from '../lib/model';
import { Eyebrow, ProgressBar, SectionHead } from './ui';
type NodeStatus={id:string;name:string;online:boolean;traffic_share:number;result:VerdictResult|null};
type TopologyResponse={verdict:string;nodes:NodeStatus[];warning:string};
const baseNodes=[{id:'node-a',name:'Integration node A',online:true,weight:1},{id:'node-b',name:'Integration node B',online:true,weight:1},{id:'node-c',name:'Integration node C',online:true,weight:1}];
export default function Topology(){
  const [nodes,setNodes]=useState(baseNodes);const [rps,setRps]=useState(900);
  const [result,setResult]=useState<TopologyResponse|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const active=nodes.filter(n=>n.online).length;
  const share=active?rps/active:0;
  const preview=active?localVerdict(baseSpec,{...baseLoad,rps:share,concurrent_connections:Math.round(100/active)}):null;
  function toggle(id:string){setNodes(a=>a.map(n=>n.id===id?{...n,online:!n.online}:n));setResult(null);}
  async function run(){
    setLoading(true);setError('');
    try {
      const data=await apiPost<TopologyResponse>('/api/v1/topology/evaluate',{spec:baseSpec,load:{...baseLoad,rps,concurrent_connections:300},nodes,engine:'rules'});
      setResult(data);
    } catch(e){setError(e instanceof Error?e.message:'Topology evaluation failed');}
    finally{setLoading(false);}
  }
  return <div className="page-stack">
    <div className="notice notice-technical"><span className="notice-icon"><Network size={19}/></span><div><strong>Model a multi-node system, without touching a real environment.</strong><span>Toggle individual nodes and run a capacity evaluation to see how load shifts across the active nodes.</span></div></div>
    <div className="topology-grid"><section className="panel topology-stage-panel"><div className="panel-heading"><div><span className="kicker">DISTRIBUTED INFRASTRUCTURE</span><h3>Traffic distribution model</h3></div><span className="demo-tag">{result?'API EVALUATED':'MODEL PREVIEW'}</span></div>
      <div className="topo-visual"><div className="topo-background"/>
        <div className="topo-source"><div className="topo-icon"><Cloud size={24}/></div><strong>Client traffic</strong><span>{rps.toLocaleString('en-US')} req/s</span></div>
        <div className="topo-line topo-line-first"><span className="flow-dot"/></div>
        <div className="topo-lb"><div className="topo-icon"><GitMerge size={23}/></div><strong>Load balancer</strong><span>Equal distribution</span></div>
        <div className="topo-line topo-line-second"><span className="flow-dot"/></div>
        <div className="topo-nodes">{nodes.map((node,i)=>{
          const actual=result?.nodes.find(n=>n.id===node.id);
          const percent=actual?.result?.resources.cpu.utilization ?? (node.online?preview?.resources.cpu.utilization??0:0);
          return <div className={`topo-node ${node.online?'online':'offline'} ${actual?.result?.verdict==='will_crash'?'overloaded':''}`} key={node.id}>
            <div className="topo-node-icon"><Server size={21}/></div><div className="topo-node-content"><strong>Node {String.fromCharCode(65+i)}</strong><small>{node.online?`${Math.round((actual?.traffic_share??(active?1/active:0))*100)}% traffic`:'OFFLINE'}</small></div><span className="topo-node-indicator"/><div className="topo-node-util">CPU {node.online?`${Math.round(percent*100)}%`:'—'}</div>
          </div>})}</div>
        <div className="topo-corner">VISUAL MODEL / NOT LIVE TELEMETRY</div>
      </div>
      <div className="topo-visual-foot"><div><span className="live-indicator"/> {active} OF {nodes.length} NODES ACTIVE</div><span>Simulated traffic distribution</span></div>
    </section>
    <section className="panel topology-controls"><div className="panel-heading"><div><span className="kicker">CONTROL THE MODEL</span><h3>Fault injection studio</h3></div><span className="icon-frame"><Power size={18}/></span></div>
      <div className="topo-rps"><div className="control-header"><strong>Incoming traffic</strong><span><b>{rps.toLocaleString('en-US')}</b> RPS</span></div><input type="range" min={100} max={1800} value={rps} step={50} onChange={e=>{setRps(+e.target.value);setResult(null)}} aria-label="Incoming traffic"/></div>
      <div className="control-subtitle"><span>NODE AVAILABILITY</span><span>Toggle to simulate failure</span></div>
      <div className="node-switches">{nodes.map((node,i)=><label className="node-switch" key={node.id}><span className={`node-switch-icon ${node.online?'':'disabled'}`}><Server size={17}/></span><span className="node-switch-text"><strong>Integration node {String.fromCharCode(65+i)}</strong><small>{node.online?'Available · 4 vCPU · 8 GB':'Simulated node failure'}</small></span><input type="checkbox" checked={node.online} onChange={()=>toggle(node.id)} aria-label={`Node ${String.fromCharCode(65+i)} available`}/><span className="switch-track"/></label>)}</div>
      <button className="btn btn-primary run-button" onClick={run} disabled={loading}>{loading?<><LoaderCircle size={17} className="spin"/>Calculating…</>:<><Play size={17} fill="currentColor"/>Evaluate topology <ArrowRight size={16}/></>}</button>
      <button className="reset-button" onClick={()=>{setNodes(baseNodes);setRps(900);setResult(null);setError('')}}><RotateCcw size={15}/> Reset scenario</button>
    </section></div>
    <div className="topo-summary-grid"><div className="panel summary-tile"><span className="kicker">ESTIMATED TRAFFIC / ACTIVE NODE</span><strong>{active?Math.round(share).toLocaleString('en-US'):'—'} <small>RPS</small></strong><p>Evenly distributed across available nodes</p></div><div className="panel summary-tile"><span className="kicker">MODEL RESULT</span><strong className={`verdict-color ${result?.verdict??preview?.verdict??''}`}>{result?result.verdict==='no_capacity'?'No capacity':result.verdict==='will_crash'?'Overload':result.verdict==='at_risk'?'At risk':'Within capacity':active===0?'No capacity':'Preview only'}</strong><p>{result?'Backend topology analysis':'Run the model for a verified output'}</p></div><div className="panel summary-tile"><span className="kicker">ACTIVE NODE CAPACITY</span><strong>{active*4} <small>vCPU</small></strong><p>Aggregate declared cores, assuming identical nodes</p></div></div>
    {error&&<p className="error-box" role="alert"><CircleAlert size={16}/>{error}</p>}
    <div className="insight-bar"><span className="insight-symbol"><Info size={19}/></span><div><strong>Scope of this simulation.</strong><span>Results model independent nodes and equal traffic distribution. Queue buildup, retry storms, sticky sessions and actual load-balancer algorithms require further calibration.</span></div></div>
  </div>;
}
