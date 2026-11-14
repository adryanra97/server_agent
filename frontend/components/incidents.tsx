'use client';
import { useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, ChevronDown, CircleAlert, CircleCheck, Clock3, Cpu, GitCompareArrows, Info, LoaderCircle, Play, RotateCcw, Server, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import { apiPost, baseLoad, baseSpec, type Load, type Spec, type VerdictResult } from '../lib/model';
import { ProgressBar, ResourceRows, ResultStatus } from './ui';
type Kind='cpu'|'memory'|'network';
const cases:{id:Kind;name:string;description:string;signal:string}[]=[
  {id:'cpu',name:'CPU spike',description:'Sustained request surge exhausting compute capacity',signal:'Compute pressure'},
  {id:'memory',name:'Memory saturation',description:'Concurrent in-flight requests exhausting available RAM',signal:'Memory pressure'},
  {id:'network',name:'Network bottleneck',description:'Large payloads exceeding available bandwidth',signal:'Bandwidth pressure'}
];
function configuration(kind:Kind):{spec:Spec;load:Load;fixedSpec:Spec}{
  const spec:Spec=JSON.parse(JSON.stringify(baseSpec));const load:Load={...baseLoad};
  const fixedSpec:Spec=JSON.parse(JSON.stringify(baseSpec));
  if(kind==='cpu'){load.rps=800;load.avg_cpu_ms_per_req=10;fixedSpec.cpu.cores=12;}
  if(kind==='memory'){load.rps=130;load.concurrent_connections=1200;load.avg_mem_mb_per_req=10;fixedSpec.ram.total_mb=32768;}
  if(kind==='network'){load.rps=1200;load.avg_cpu_ms_per_req=1;load.payload_kb=150;spec.network.bandwidth_mbps=100;fixedSpec.network.bandwidth_mbps=3000;}
  return {spec,load,fixedSpec};
}
export default function Incidents(){
  const [kind,setKind]=useState<Kind>('cpu');const [before,setBefore]=useState<VerdictResult|null>(null);const [after,setAfter]=useState<VerdictResult|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const selection=cases.find(c=>c.id===kind)!;const cfg=configuration(kind);
  async function diagnose(){
    setLoading(true);setError('');setBefore(null);setAfter(null);
    try{
      const [a,b]=await Promise.all([
        apiPost<VerdictResult>('/api/v1/verdict',{engine:'rules',spec:cfg.spec,load:cfg.load}),
        apiPost<VerdictResult>('/api/v1/verdict',{engine:'rules',spec:cfg.fixedSpec,load:cfg.load})
      ]);setBefore(a);setAfter(b);
    }catch(e){setError(e instanceof Error?e.message:'Unable to evaluate the incident.');}finally{setLoading(false)}
  }
  return <div className="page-stack">
    <div className="notice notice-technical"><div className="notice-icon"><ShieldAlert size={19}/></div><div><strong>Incident reproduction — controlled environment</strong><span>Select a sample incident, evaluate the initial configuration and compare it with a modeled mitigation. No production infrastructure is affected.</span></div></div>
    <div className="incident-grid"><section className="panel"><div className="panel-heading"><div><span className="kicker">01 / SELECT A FAILURE MODE</span><h3>Incident workbench</h3></div><span className="icon-frame"><Activity size={18}/></span></div>
      <div className="incident-cases">{cases.map(c=><button key={c.id} className={`incident-case ${kind===c.id?'case-selected':''}`} onClick={()=>{setKind(c.id);setBefore(null);setAfter(null)}}><span className="case-icon">{c.id==='cpu'?<Cpu size={21}/>:c.id==='memory'?<Server size={21}/>:<Zap size={21}/>}</span><span className="case-text"><strong>{c.name}</strong><small>{c.description}</small></span><span className="case-radio"/></button>)}</div>
      <div className="incident-detail"><span className="control-label">INCIDENT PROFILE</span><div className="incident-detail-row"><span>Failure pattern</span><strong>{selection.signal}</strong></div><div className="incident-detail-row"><span>Request volume</span><strong>{cfg.load.rps} RPS</strong></div><div className="incident-detail-row"><span>Mitigation proposal</span><strong>{kind==='cpu'?'Scale to 12 vCPU':kind==='memory'?'Scale memory to 32 GB':'Increase link to 3 Gbps'}</strong></div></div>
      <button onClick={diagnose} disabled={loading} className="btn btn-primary run-button">{loading?<><LoaderCircle size={17} className="spin"/>Evaluating…</>:<><Play size={17} fill="currentColor"/>Run incident analysis <ArrowRight size={17}/></>}</button>
    </section><section className="panel"><div className="panel-heading"><div><span className="kicker">02 / COMPARE THE OUTCOMES</span><h3>Mitigation assessment</h3></div><span className="demo-tag">{before?'BACKEND RESULTS':'AWAITING ANALYSIS'}</span></div>
      <div className="before-after"><div className="comparison-card"><span className="kicker">BEFORE / INCIDENT</span>{before?<><ResultStatus result={before}/><strong>{Math.round((before.resources[before.bottleneck as 'cpu'|'ram'|'network']?.utilization??0)*100)}% <small>peak resource demand</small></strong><ProgressBar value={Math.max(...Object.values(before.resources).map(r=>r.utilization))}/></>:<div className="pending-analysis">Run the model to calculate the incident impact</div>}</div>
      <div className="comparison-arrow"><ArrowRight size={18}/></div><div className="comparison-card optimized"><span className="kicker">AFTER / MITIGATION</span>{after?<><ResultStatus result={after}/><strong>{Math.round(Math.max(...Object.values(after.resources).map(r=>r.utilization))*100)}% <small>peak resource demand</small></strong><ProgressBar value={Math.max(...Object.values(after.resources).map(r=>r.utilization))}/></>:<div className="pending-analysis">Mitigation outcome will appear here</div>}</div></div>
      {before&&after?<div className="mitigation-conclusion"><CircleCheck size={20}/><div><strong>{after.verdict==='will_survive'?'Modeled mitigation restores capacity headroom.':'Mitigation may need further adjustment.'}</strong><p>Initial bottleneck: {before.bottleneck??'none'}. Updated verdict: {after.verdict.replaceAll('_',' ')}. Validate all assumptions before implementing an operational change.</p></div></div>:<div className="incident-workflow"><span className="control-label">ANALYSIS WORKFLOW</span>{['Identify pressure source','Reproduce modeled overload','Test alternate capacity','Compare verdict and evidence'].map((v,i)=><div className="workflow-line" key={i}><span>{String(i+1).padStart(2,'0')}</span>{v}</div>)}</div>}
    </section></div>
    {error&&<p className="error-box" role="alert"><CircleAlert size={16}/>{error}</p>}
    <div className="insight-bar"><span className="insight-symbol"><Info size={19}/></span><div><strong>Sample use case, not an observed incident.</strong><span>The incident cases use synthetic input parameters. MTTR, incident replication accuracy and actual production changes are outside the scope of this demo.</span></div></div>
  </div>;
}
