'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, Cpu, Database, Gauge, Info, LoaderCircle, Network, Play, RotateCcw, Server, Waves } from 'lucide-react';
import { defaultLoad, defaultSpec, requestVerdict, saveRun, type Engine, type VerdictRequest, type VerdictResult } from '../lib/model';
import { Empty, Outcome, ResourceBars, SectionHead, VerdictCard } from './ui';

function NumberInput({label,unit,value,onChange,min=0,step='any',tip}:{label:string;unit:string;value:number;onChange:(v:number)=>void;min?:number;step?:string|number;tip?:string}){
  return <label className="verdict-field"><span><strong>{label}</strong>{tip&&<small>{tip}</small>}</span><div className="verdict-field-input"><input type="number" min={min} step={step} required value={value} onChange={e=>onChange(+e.target.value)} aria-label={label}/><span>{unit}</span></div></label>;
}
export default function Simulation(){
  const [body,setBody]=useState<VerdictRequest>({engine:'rules',spec:defaultSpec,load:defaultLoad});
  const [result,setResult]=useState<VerdictResult|null>(null);
  const [runEngine,setRunEngine]=useState<Engine|null>(null);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  function updateSpec(section:'cpu'|'ram'|'network',field:string,value:number){
    setBody(b=>({...b,spec:{...b.spec,[section]:{...b.spec[section],[field]:value}}}));
    setResult(null);
  }
  function updateLoad(field:string,value:number){
    setBody(b=>({...b,load:{...b.load,[field]:value}}));setResult(null);
  }
  function preset(rps:number){setBody(b=>({...b,load:{...b.load,rps}}));setResult(null);}
  function reset(){setBody({engine:'rules',spec:defaultSpec,load:defaultLoad});setResult(null);setError('');}
  async function run(){
    setLoading(true);setError('');setResult(null);
    try{
      const res=await requestVerdict(body);
      setResult(res);setRunEngine(body.engine);
      saveRun({id:crypto.randomUUID(),created_at:new Date().toISOString(),label:`${body.load.rps} RPS · ${body.spec.cpu.cores} cores`,request:JSON.parse(JSON.stringify(body)),result:res});
    }catch(e){setError(e instanceof Error?e.message:'The model could not be evaluated.');}
    finally{setLoading(false);}
  }
  return <div className="page-stack">
    <div className="notice notice-technical"><span className="notice-icon"><Gauge size={19}/></span><div><strong>This is the actual copdash verdict workflow.</strong><span>Values are sent to POST /verdict using the original schema. The backend returns utilization, bottleneck, confidence and reasons.</span></div><a href="/docs" className="notice-link" target="_blank" rel="noopener noreferrer">OpenAPI docs <ArrowUpRight size={16}/></a></div>
    <div className="evaluation-grid"><section className="panel evaluation-form-panel">
      <SectionHead eyebrow="01 / MODEL INPUT" title="Configure the evaluation" description="The following fields map 1:1 to the original request schema."/>
      <div className="engine-switch"><span className="control-label">EVALUATION ENGINE</span><div className="segmented">{(['rules','simpy'] as const).map(engine=><button key={engine} className={body.engine===engine?'selected':''} onClick={()=>{setBody(b=>({...b,engine}));setResult(null)}}><span className="segment-title">{engine==='rules'?'Rules engine':'SimPy engine'}</span><small>{engine==='rules'?'Deterministic formulas':'Discrete-event simulation'}</small></button>)}</div></div>
      <div className="evaluator-subtitle"><Server size={17}/><strong>Server specification</strong><small>Capacity</small></div>
      <div className="evaluator-field-grid">
        <NumberInput label="CPU cores" unit="cores" value={body.spec.cpu.cores} min={0.01} onChange={v=>updateSpec('cpu','cores',v)}/>
        <NumberInput label="Clock speed" unit="GHz" value={body.spec.cpu.clock_ghz} min={0.01} onChange={v=>updateSpec('cpu','clock_ghz',v)} tip="Validated, currently unused by engines"/>
        <NumberInput label="Total memory" unit="MB" value={body.spec.ram.total_mb} min={0.01} onChange={v=>updateSpec('ram','total_mb',v)}/>
        <NumberInput label="Bandwidth" unit="Mbps" value={body.spec.network.bandwidth_mbps} min={0.01} onChange={v=>updateSpec('network','bandwidth_mbps',v)}/>
        <NumberInput label="Max connections" unit="conn." value={body.spec.network.max_connections} min={1} step={1} onChange={v=>updateSpec('network','max_connections',Math.round(v))}/>
      </div>
      <div className="evaluator-subtitle"><Activity size={17}/><strong>Traffic load</strong><small>Demand</small></div>
      <div className="evaluator-presets"><span>Quick presets</span>{[{rps:100,label:'100 RPS'},{rps:360,label:'360 RPS'},{rps:800,label:'800 RPS'}].map(p=><button key={p.rps} className={body.load.rps===p.rps?'active':''} onClick={()=>preset(p.rps)}>{p.label}</button>)}</div>
      <div className="evaluator-field-grid">
        <NumberInput label="Request rate" unit="RPS" value={body.load.rps} onChange={v=>updateLoad('rps',v)}/>
        <NumberInput label="CPU time / request" unit="ms" value={body.load.avg_cpu_ms_per_req} onChange={v=>updateLoad('avg_cpu_ms_per_req',v)}/>
        <NumberInput label="Memory / request" unit="MB" value={body.load.avg_mem_mb_per_req} onChange={v=>updateLoad('avg_mem_mb_per_req',v)}/>
        <NumberInput label="Concurrent requests" unit="conn." value={body.load.concurrent_connections} step={1} onChange={v=>updateLoad('concurrent_connections',Math.round(v))}/>
        <NumberInput label="Payload size" unit="KB" value={body.load.payload_kb} onChange={v=>updateLoad('payload_kb',v)}/>
      </div>
      <div className="evaluator-actions"><button className="btn btn-primary" disabled={loading} onClick={run}>{loading?<><LoaderCircle className="spin" size={17}/>Evaluating…</>:<><Play size={16} fill="currentColor"/>Evaluate server <ArrowRight size={17}/></>}</button><button className="reset-button" onClick={reset}><RotateCcw size={15}/>Reset inputs</button></div>
      <div className="tiny-explainer"><Info size={15}/>For SimPy, memory requested by one transaction must not exceed available memory. Engines perform calculations only; they do not send actual load to a server.</div>
    </section>
    <div className="evaluation-right"><section className="panel evaluation-result-panel">
      <SectionHead eyebrow="02 / ENGINE RESPONSE" title="Capacity verdict" action={<span className="demo-tag">{result?'EXECUTED':'AWAITING REQUEST'}</span>}/>
      {result?<VerdictCard result={result}/>:<div className="evaluation-placeholder"><div className="placeholder-orbit"><Cpu size={29}/><span/><span/></div><strong>Your result will appear here.</strong><p>Configure a workload, select Rules or SimPy and run the evaluation to see the true API response.</p><div><span>VERDICT</span><span>BOTTLENECK</span><span>RESOURCES</span></div></div>}
      {error&&<p className="error-box" role="alert"><CircleAlert size={16}/>{error}</p>}
    </section>
    <section className="panel model-explainer"><div className="panel-heading"><div><span className="kicker">MODEL INTERPRETATION</span><h3>What do the results mean?</h3></div><Waves size={21}/></div>
      <div className="threshold-chart"><div><span className="threshold-color" style={{background:'#148f70'}}/>Less than 80%<strong>Will survive</strong></div><div><span className="threshold-color" style={{background:'#d3912b'}}/>80–100%<strong>At risk</strong></div><div><span className="threshold-color" style={{background:'#cf5469'}}/>Above 100%<strong>Will crash</strong></div></div>
      <p>These labels describe modeled capacity thresholds, not observed outages. The confidence score is a deterministic distance-from-threshold heuristic, not a calibrated probability.</p>
      <Link href="/methodology" className="inline-link">Read model assumptions <ArrowUpRight size={15}/></Link>
    </section></div></div>
  </div>;
}
