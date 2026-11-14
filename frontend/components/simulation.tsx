'use client';
import { useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, ChevronDown, CircleAlert, Cpu, Database, Download, Gauge, Info, LoaderCircle, Network, Play, RotateCcw, Save, Server, Sparkles, Timer, Wand2 } from 'lucide-react';
import { apiPost, baseLoad, baseSpec, localVerdict, saveHistory, type Engine, type Load, type Spec, type VerdictResult } from '../lib/model';
import { Eyebrow, ProgressBar, ResourceRows, ResultStatus, SectionHead } from './ui';

function Numeric({title,value,unit,min,max,step=1,onChange,help}:{title:string;value:number;unit:string;min:number;max:number;step?:number;onChange:(v:number)=>void;help?:string}) {
  return <label className="control-group"><span className="control-header"><strong>{title}</strong><span><b>{value.toLocaleString('en-US')}</b> {unit}</span></span><input aria-label={title} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}/>{help&&<small>{help}</small>}</label>;
}
type SimulationResponse={id:string;created_at:string;label:string;result:VerdictResult;saved:boolean};
type ComparisonResponse={scenarios:{name:string;multiplier:number;result:VerdictResult}[];engine:string};
export default function Simulation(){
  const [engine,setEngine]=useState<Engine>('rules');
  const [rps,setRps]=useState(360);
  const [cores,setCores]=useState(4);
  const [ram,setRam]=useState(8192);
  const [cpuMs,setCpuMs]=useState(10);
  const [connections,setConnections]=useState(100);
  const [result,setResult]=useState<VerdictResult|null>(null);
  const [comparison,setComparison]=useState<ComparisonResponse|null>(null);
  const [running,setRunning]=useState(false);
  const [error,setError]=useState('');
  const [executed,setExecuted]=useState(false);
  const spec:Spec={...baseSpec,cpu:{...baseSpec.cpu,cores},ram:{total_mb:ram}};
  const load:Load={...baseLoad,rps,avg_cpu_ms_per_req:cpuMs,concurrent_connections:connections};
  const preview=localVerdict(spec,load);
  async function run(){
    setRunning(true);setError('');setExecuted(false);setResult(null);setComparison(null);
    try {
      const [out, compared]=await Promise.all([
        apiPost<SimulationResponse>('/api/v1/simulations',{engine,spec,load,label:`${rps} RPS · ${cores} cores`}),
        apiPost<ComparisonResponse>('/api/v1/scenarios/compare',{engine,spec,load,scenarios:[{name:'Baseline',multiplier:1},{name:'2× traffic',multiplier:2},{name:'3× traffic',multiplier:3}]})
      ]);
      setResult(out.result);setComparison(compared);setExecuted(true);
      saveHistory({id:out.id,created_at:out.created_at,label:out.label,engine,load,spec,result:out.result});
    } catch(e) { setError(e instanceof Error?e.message:'The model service could not be reached.'); }
    finally { setRunning(false); }
  }
  const status=result??preview;
  return <div className="page-stack">
    <div className="simulation-grid"><div className="panel simulation-controls"><div className="panel-heading"><div><span className="kicker">01 / DEFINE YOUR SCENARIO</span><h3>Simulation parameters</h3></div><span className="icon-frame"><Cpu size={19}/></span></div>
      <div className="control-block"><label className="control-label">SIMULATION ENGINE</label><div className="segmented">{(['rules','simpy'] as const).map(v=><button key={v} className={engine===v?'selected':''} onClick={()=>{setEngine(v);setResult(null);setComparison(null)}}><span className="segment-title">{v==='rules'?'Rules engine':'SimPy engine'}</span><small>{v==='rules'?'Analytical':'Discrete-event'}</small></button>)}</div></div>
      <div className="preset-block"><span className="control-label">WORKLOAD PRESETS</span><div className="preset-buttons">{[{label:'Normal',r:100},{label:'Peak',r:360},{label:'Stress',r:900}].map(p=><button key={p.label} className={rps===p.r?'preset-selected':''} onClick={()=>{setRps(p.r);setResult(null)}}>{p.label}</button>)}</div></div>
      <div className="control-subtitle"><span>WORKLOAD</span><span>Editable inputs</span></div>
      <Numeric title="Incoming requests" value={rps} unit="RPS" min={0} max={1500} step={10} onChange={setRps} help="Modeled requests per second"/>
      <Numeric title="CPU demand per request" value={cpuMs} unit="ms" min={1} max={30} onChange={setCpuMs}/>
      <Numeric title="Concurrent connections" value={connections} unit="connections" min={0} max={1500} step={10} onChange={setConnections}/>
      <div className="control-subtitle"><span>SERVER CAPACITY</span><span>Per node</span></div>
      <Numeric title="Available CPU cores" value={cores} unit="cores" min={1} max={16} onChange={setCores}/>
      <Numeric title="Total memory" value={ram/1024} unit="GB" min={2} max={32} onChange={v=>setRam(v*1024)}/>
      <button className="btn btn-primary run-button" onClick={run} disabled={running}>{running?<><LoaderCircle className="spin" size={17}/>Running model…</>:<><Play size={17} fill="currentColor"/>Run simulation <ArrowRight size={17}/></>}</button>
      <div className="tiny-explainer"><Info size={15}/>This evaluates modeled capacity only. No traffic is sent to Production.</div>
    </div>
    <div className="simulation-results"><section className="panel result-panel"><div className="panel-heading"><div><span className="kicker">02 / INTERPRET THE RESULT</span><h3>Capacity assessment</h3></div><span className="demo-tag">{result?'API VERIFIED':'LOCAL PREVIEW'}</span></div>
      <div className="result-hero"><ResultStatus result={result??preview}/><strong className="result-verdict">{status.verdict==='will_survive'?'The model predicts sufficient capacity.':status.verdict==='at_risk'?'The workload approaches resource limits.':'The model predicts capacity overload.'}</strong><p>{result?'This verdict was calculated by the selected backend engine.':'This preview updates instantly as you change inputs. Run the simulation for an actual API result.'}</p></div>
      <div className="result-two"><div><span className="kicker">PRIMARY BOTTLENECK</span><strong>{status.bottleneck?.toUpperCase()??'NONE'}</strong></div><div><span className="kicker">MODEL SOURCE</span><strong>{result?result.engine.toUpperCase():'LOCAL RULE PREVIEW'}</strong></div></div>
      <ResourceRows result={status}/>
      {result?<div className="result-note"><CheckCircle2 size={16}/><div><strong>Backend analysis complete</strong><p>{result.reasons[result.reasons.length-1]}</p></div></div>:<div className="result-note result-note-muted"><Info size={16}/><div><strong>Awaiting backend run</strong><p>Only results from completed API calls are saved in history.</p></div></div>}
      {error&&<p className="error-box" role="alert"><CircleAlert size={16}/>{error}</p>}
    </section>
    <section className="panel scenario-panel"><div className="panel-heading"><div><span className="kicker">03 / STRESS THE ASSUMPTIONS</span><h3>Scenario comparison</h3></div><span className="icon-frame"><Activity size={18}/></span></div>
      <p className="panel-sub">How the modeled CPU demand changes when traffic scales.</p>
      {(comparison?.scenarios??[1,2,3].map((m,i)=>({name:['Baseline','2× traffic','3× traffic'][i],multiplier:m,result:localVerdict(spec,{...load,rps:load.rps*m,concurrent_connections:load.concurrent_connections*m})}))).map(item=><div className="comparison-item" key={item.name}><div className="comparison-item-head"><div><strong>{item.name}</strong><small>{Math.round(load.rps*item.multiplier).toLocaleString('en-US')} RPS</small></div><span className={`mini-verdict ${item.result.verdict}`}>{item.result.verdict==='will_survive'?'Stable':item.result.verdict==='at_risk'?'At risk':'Overload'}</span></div><ProgressBar value={item.result.resources.cpu.utilization}/><div className="comparison-bottom"><span>CPU demand</span><strong>{Math.round(item.result.resources.cpu.utilization*100)}%</strong></div></div>)}
      <div className="comparison-footer">{comparison?'Calculated with the selected backend engine.':'Preview calculated analytically. Run to compare with the actual backend engine.'}</div>
    </section></div></div>
    <div className="insight-bar"><span className="insight-symbol"><Sparkles size={19}/></span><div><strong>Model assumptions matter.</strong><span>These engines estimate resource saturation; they do not predict observed production failure with validated statistical probability. Inspect inputs and calibrate against permitted evidence.</span></div></div>
  </div>;
}
