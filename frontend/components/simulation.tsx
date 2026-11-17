'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Cpu,
  Database, GitCompareArrows, Info, LoaderCircle, Network, Play, RotateCcw,
  Server, ShieldCheck, Waves, CircleDot, ChevronsRight, Terminal, Cable, Send,
} from 'lucide-react';
import {
  defaultLoad, defaultSpec, requestVerdict, saveRun, type VerdictRequest,
  type VerdictResult, type ServerSpec, type Load,
} from '../lib/model';
import { Outcome, ResourceBars } from './ui';
import { compactTimeline } from '../lib/trace';
import SimulationTimeline, { type TimelinePoint } from './simpy-timeline';
import { WholeNumberInput } from './whole-number-input';
import { simulationFieldIssues } from '../lib/simulation-input-validation';
import EngineComparison from './engine-comparison';
import {rememberLastSimulationSettings} from '../lib/simulation-session';

type SimulationEvidence = {
  arrival_process: string;
  seed: number;
  arrival_window_seconds: number;
  arrival_cap: number;
  planned_arrivals: number;
  arrived: number;
  completed: number;
  simulated_elapsed_seconds: number;
  cpu_slots: number;
  timeline_resolution_seconds: number;
  timeline_limit_seconds: number;
  timeline_truncated: boolean;
  timeline: TimelinePoint[];
  measured_utilization: Record<string, number>;
  offered_utilization: Record<string, number>;
};
type SimPyInspection = {
  engine: 'simpy';
  result: VerdictResult;
  simulation: SimulationEvidence;
  execution_ms: number;
  note: string;
};

const flow = [
  {number:'01', label:'Arrival stream',detail:'Poisson arrivals',icon:Activity},
  {number:'02', label:'Connection slot',detail:'Network · Resource',icon:Network},
  {number:'03', label:'Memory allocation',detail:'RAM · Container',icon:Database},
  {number:'04', label:'CPU processing',detail:'CPU · Resource',icon:Cpu},
  {number:'05', label:'Payload transfer',detail:'Release & complete',icon:Send},
];

function NumberInput({label,unit,value,onChange,min=0,note,issue}:{
  label:string;unit:string;value:number;onChange:(value:number)=>void;
  min?:number;note?:string;issue?:string;
}){
  const issueId='simpy-input-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return <label className={'simpy-field '+(issue?'simpy-field-invalid':'')}>
    <span className="simpy-field-top"><strong>{label}</strong>{note&&<small>{note}</small>}</span>
    <span className="simpy-input"><WholeNumberInput value={value} min={min}
      onChange={onChange} aria-label={label} aria-invalid={!!issue}
      aria-describedby={issue?issueId:undefined}/><span>{unit}</span></span>
    {issue&&<small className="simpy-field-issue" id={issueId}>{issue}</small>}
  </label>;
}
const pct=(v:number)=>`${(v*100).toFixed(1)}%`;
const format=(v:number)=>v.toLocaleString('en-US',{maximumFractionDigits:2});
const labels:{key:keyof Pick<SimulationEvidence['measured_utilization'],'cpu'|'ram'|'bandwidth'|'connections'>;label:string}[]=[
  {key:'cpu',label:'CPU'},
  {key:'ram',label:'RAM'},
  {key:'bandwidth',label:'Network bandwidth'},
  {key:'connections',label:'Connection slots'},
];

export default function Simulation(){
  const [body,setBody]=useState<VerdictRequest>({
    engine:'simpy',spec:structuredClone(defaultSpec),load:structuredClone(defaultLoad),
  });
  const [report,setReport]=useState<SimPyInspection|null>(null);
  const [rules,setRules]=useState<VerdictResult|null>(null);
  const [compare,setCompare]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [comparisonError,setComparisonError]=useState('');
  const [rawOpen,setRawOpen]=useState(false);
  const errorRef=useRef<HTMLDivElement|null>(null);
  const fieldIssues=simulationFieldIssues(body);
  const revealError=()=>{
    const element=errorRef.current;
    if(!element)return;
    element.focus({preventScroll:true});
    element.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
      block:'center',
    });
  };
  useEffect(()=>{if(error)revealError();},[error]);

  function updateSpec(section:keyof ServerSpec,field:string,value:number){
    setBody(prev=>({
      ...prev,
      spec:{...prev.spec,[section]:{...prev.spec[section],[field]:value}},
    }));
    setReport(null);setRules(null);setError('');
  }
  function updateLoad(field:keyof Load,value:number){
    setBody(prev=>({...prev,load:{...prev.load,[field]:value}}));
    setReport(null);setRules(null);setError('');
  }
  function preset(value:number){
    updateLoad('rps',value);
  }
  function reset(){
    setBody({engine:'simpy',spec:structuredClone(defaultSpec),load:structuredClone(defaultLoad)});
    setReport(null);setRules(null);setError('');setComparisonError('');
  }
  function validate(){
    const {spec,load}=body;
    const values=[spec.cpu.cores,spec.cpu.clock_ghz,spec.ram.total_mb,
      spec.network.bandwidth_mbps,spec.network.max_connections,load.rps,
      load.avg_cpu_ms_per_req,load.avg_mem_mb_per_req,load.concurrent_connections,load.payload_kb];
    if(values.some(v=>!Number.isFinite(v)))return 'Input needs correction: complete every whole-number field before running the simulation.';
    if([spec.cpu.cores,spec.ram.total_mb,spec.network.bandwidth_mbps,spec.network.max_connections,
      load.rps,load.avg_cpu_ms_per_req,load.avg_mem_mb_per_req,load.concurrent_connections,load.payload_kb]
      .some(v=>!Number.isSafeInteger(v)))return 'Input needs correction: enter whole numbers only (no decimal points or commas).';
    if(values.slice(0,5).some(v=>v<=0)||values.slice(5).some(v=>v<0))
      return 'Server capacity must be greater than zero. Traffic and request costs cannot be negative.';
    if(!Number.isInteger(spec.network.max_connections)||!Number.isInteger(load.concurrent_connections))
      return 'Connection limits and concurrent connections must be whole numbers.';
    if(load.rps>0&&load.avg_mem_mb_per_req>spec.ram.total_mb)
      return 'Input needs correction: memory per request exceeds total server RAM. A request cannot reserve more than the server has. Reduce per-request memory or increase server RAM. No request was sent to SimPy.';
    return '';
  }
  async function run(){
    const validation=validate();
    if(validation){
      setError(validation);
      window.requestAnimationFrame(revealError);
      return;
    }
    setBusy(true);setError('');setComparisonError('');setReport(null);setRules(null);setRawOpen(false);
    // Move to the visual replay immediately after a valid Simulate click.
    // The timeline first shows COMPUTING MODEL, then auto-plays the recorded
    // trace on completion. Preserve reduced-motion preferences.
    window.requestAnimationFrame(()=>{
      document.getElementById('simpy-timeline')?.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
        block:'start',
      });
    });
    try{
      const response=await fetch('/api/v1/simpy/inspect',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...body,engine:'simpy'}),
      });
      const payload=await response.json().catch(()=>null);
      if(!response.ok){
        throw new Error(typeof payload?.detail==='string'?payload.detail:
          `The SimPy service returned HTTP ${response.status}. Check your inputs.`);
      }
      const data=payload as SimPyInspection;
      setReport(data);
      const completedAt=new Date().toISOString();
      const request:VerdictRequest={...body,engine:'simpy'};
      // Personal to this tab and demo role. Never choose a "latest" run from shared cloud history.
      rememberLastSimulationSettings(request,completedAt);
      saveRun({
        id:crypto.randomUUID(),created_at:completedAt,
        label:`SimPy · ${body.load.rps} RPS · ${body.spec.cpu.cores} cores`,
        request,result:data.result,
        timeline:compactTimeline(data.simulation.timeline),
      });
      if(compare){
        try{
          setRules(await requestVerdict({...body,engine:'rules'}));
        }catch(e){
          setComparisonError(e instanceof Error?e.message:'Rules comparison is unavailable.');
        }
      }
    }catch(e){setError(e instanceof Error?e.message:'Unable to execute the SimPy model.');}
    finally{setBusy(false);}
  }
  const details=report?.simulation;
  const verdict=report?.result;
  const affected=verdict?.bottleneck??null;

  return <div className="simpy-page">
    <section className="simpy-intro" aria-labelledby="simpy-intro-title">
      <div className="simpy-intro-copy"><span className="simpy-overline"><span/> MODEL / 02 — DISCRETE-EVENT</span>
        <h2 id="simpy-intro-title">Understand how your server responds <em>to demand.</em></h2>
        <p>Configure your server and request traffic. Then watch network activity, CPU processing, memory occupancy, and response delivery — backed by recorded simulation events.</p>
        <div className="simpy-intro-facts"><span>DISCRETE EVENT MODEL</span><span>REPRODUCIBLE SCENARIOS</span><span>NO PRODUCTION TRAFFIC</span></div>
      </div>
    </section>

    <nav className="simpy-inpage-nav" aria-label="Simulation sections">
      <a href="#simpy-scenario">01 / Configure</a>
      <a href="#simpy-timeline">02 / Replay</a>
      <a href="#simpy-analytics">03 / Charts</a>
      <a href="#simpy-results">04 / Verdict</a>
      <a href="#simpy-deepdive">05 / Evidence</a>
    </nav>


    <div className="simpy-columns qa-simpy-main">
      <section id="simpy-scenario" className="simpy-config" aria-label="Simulation configuration">
        <div className="simpy-config-head"><div><span className="simpy-section-number">01 / CONFIGURE</span><h3>Build your scenario.</h3><p>Adjust capacity and traffic before you run. All active inputs affect the evaluation.</p></div><Server size={23}/></div>
        <div className="simpy-form-section"><div className="simpy-form-heading"><span>SERVER CAPACITY</span><span>WHAT IS AVAILABLE</span></div>
          <div className="simpy-fields simpy-fields-capacity">
            <NumberInput issue={fieldIssues['CPU cores']} label="CPU cores" unit="cores" min={1} value={body.spec.cpu.cores} onChange={v=>updateSpec('cpu','cores',v)}/>
            <NumberInput issue={fieldIssues['Total RAM']} label="Total RAM" unit="MB" min={1} value={body.spec.ram.total_mb} onChange={v=>updateSpec('ram','total_mb',v)}/>
            <NumberInput issue={fieldIssues['Network bandwidth']} label="Network bandwidth" unit="Mbps" min={1} value={body.spec.network.bandwidth_mbps} onChange={v=>updateSpec('network','bandwidth_mbps',v)}/>
            <NumberInput issue={fieldIssues['Maximum connections']} label="Maximum connections" unit="connections" min={1} value={body.spec.network.max_connections} onChange={v=>updateSpec('network','max_connections',v)}/>
          </div>
        </div>
        <div className="simpy-form-section"><div className="simpy-form-heading"><span>REQUEST WORKLOAD</span><span>WHAT IS DEMANDED</span></div>
          <div className="simpy-preset-row"><span>Request-rate examples</span>{[{rps:100,label:'Normal'},{rps:360,label:'Peak'},{rps:900,label:'Stress'}].map(p=><button type="button" key={p.rps} className={body.load.rps===p.rps?'active':''} onClick={()=>preset(p.rps)}>{p.label} <small>{p.rps} RPS</small></button>)}</div>
          <div className="simpy-fields simpy-fields-workload">
            <NumberInput issue={fieldIssues['Arrival rate']} label="Arrival rate" unit="RPS" value={body.load.rps} onChange={v=>updateLoad('rps',v)}/>
            <NumberInput issue={fieldIssues['CPU time / request']} label="CPU time / request" unit="ms" value={body.load.avg_cpu_ms_per_req} onChange={v=>updateLoad('avg_cpu_ms_per_req',v)}/>
            <NumberInput issue={fieldIssues['RAM / request']} label="RAM / request" unit="MB" value={body.load.avg_mem_mb_per_req} onChange={v=>updateLoad('avg_mem_mb_per_req',v)}/>
            <NumberInput issue={fieldIssues['Concurrent connections']} label="Concurrent connections" unit="connections" value={body.load.concurrent_connections} onChange={v=>updateLoad('concurrent_connections',v)}/>
            <NumberInput issue={fieldIssues['Response payload']} label="Response payload" unit="KB" value={body.load.payload_kb} onChange={v=>updateLoad('payload_kb',v)}/>
          </div>
          <p className="simpy-preset-note">Presets adjust arrival rate only. Other workload assumptions stay as you entered them.</p>
        </div>
        <div className="simpy-run-options">
          <label className="simpy-compare-toggle"><input type="checkbox" checked={compare} onChange={e=>{setCompare(e.target.checked);setRules(null)}}/><span className="simpy-compare-box"/><span><strong>Cross-check against Rules Engine</strong><small>Optional secondary model evaluation for engineering review.</small></span></label>
        </div>
        <button className="simpy-run-button" disabled={busy} onClick={run}>
          {busy?<><LoaderCircle className="spin" size={18}/>Executing SimPy…</>:<><Play size={17} fill="currentColor"/>Run simulation & view replay</>}
          <ArrowRight size={18}/>
        </button>
        <div className="simpy-reset-row"><span><ShieldCheck size={15}/> Model-based evaluation · No production traffic</span><button onClick={reset}><RotateCcw size={14}/> Reset</button></div>
        {error&&<div ref={errorRef} tabIndex={-1} role="alert" className={error.startsWith('Input needs correction')?'simpy-error simpy-input-warning':'simpy-error'}><CircleAlert size={18}/><span>{error}</span></div>}
      </section>

      <div className="simpy-main-column">
        <SimulationTimeline
          trace={details?.timeline ?? []}
          running={busy}
          truncated={details?.timeline_truncated ?? false}
          limit={details?.timeline_limit_seconds ?? 240}
        />
        <section id="simpy-results" className="simpy-result-card" aria-labelledby="result-title" aria-live="polite">
          <div className="simpy-card-header"><div><span className="simpy-section-number">04 / EVALUATION RESULT</span><h3 id="result-title">Capacity outcome.</h3></div><span className="simpy-card-aside">{report?'ENGINE RESULTS AVAILABLE':'AWAITING EVALUATION'}</span></div>
          {verdict?<div className="simpy-result-content">
            <div className="simpy-verdict-overview"><div><Outcome verdict={verdict.verdict}/><h4>{verdict.verdict==='will_survive'?'Capacity remains within the defined envelope.':verdict.verdict==='at_risk'?'The server is approaching its operating limit.':'The modeled demand exceeds available capacity.'}</h4></div><div className="simpy-bottleneck"><span>LIMITING RESOURCE</span><strong>{affected?.toUpperCase()??'NONE'}</strong></div></div>
            <div className="simpy-evidence-stats">
              <div><span>ARRIVED</span><strong>{format(details?.arrived??0)}</strong><small>simulated requests</small></div>
              <div><span>COMPLETED</span><strong>{format(details?.completed??0)}</strong><small>simulated requests</small></div>
              <div><span>SIMULATED TIME</span><strong>{format(details?.simulated_elapsed_seconds??0)}<small> s</small></strong><small>includes queue drain</small></div>
              <div><span>EXECUTION</span><strong>{format(report.execution_ms)}<small> ms</small></strong><small>server compute time</small></div>
            </div>
            <div className="simpy-utilization"><div className="simpy-subheading"><span>REPORTED RESOURCE PRESSURE</span><span>SIMPY VERDICT VALUES</span></div><ResourceBars result={verdict}/></div>
            <details className="simpy-explanations qa-simpy-reasons"><summary><Info size={16}/> View calculation rationale and engine notes <span>{verdict.reasons.length} findings</span></summary><div className="qa-simpy-reason-list">{verdict.reasons.map((reason,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{reason}</p></div>)}</div></details>
          </div>:<div className="simpy-awaiting">
            <div className="simpy-await-icon"><Waves size={34}/></div>
            <strong>Your evaluation will appear here.</strong>
            <p>Configure capacity and workload, run the model, then explore the visual replay and evidence.</p>
            <span>BASED ON COMPUTED SIMULATION OUTPUT</span>
          </div>}
        </section>
      </div>
    </div>

    {report&&details&&<details className="simpy-deepdive qa-simpy-evidence" id="simpy-deepdive">
      <summary><span><span className="simpy-section-number">05 / ADVANCED EVIDENCE</span><strong>Measured occupancy vs. offered demand</strong><small>See detailed resource ratios and simulation configuration</small></span><span>Expand <ChevronsRight size={17}/></span></summary><p>Measured occupancy is the time average inside SimPy. Offered demand estimates pressure on the configured capacity. When demand exceeds 100%, the reported verdict value uses the offered ratio.</p>
      <div className="simpy-metrics-table" role="table" aria-label="SimPy model metrics">
        <div role="row" className="simpy-metrics-heading"><span role="columnheader">Resource</span><span role="columnheader">Simulated mean</span><span role="columnheader">Offered demand</span></div>
        {labels.map(row=><div role="row" key={row.key} className="simpy-metrics-row"><strong role="cell">{row.label}</strong><span role="cell">{pct(details.measured_utilization[row.key])}</span><span role="cell">{pct(details.offered_utilization[row.key])}</span></div>)}
      </div>
      <div className="simpy-method-notes"><div><span>RANDOM SEED</span><strong>{details.seed}</strong></div><div><span>ARRIVAL WINDOW</span><strong>{details.arrival_window_seconds}s <small>nominal</small></strong></div><div><span>ARRIVAL LIMIT</span><strong>{format(details.arrival_cap)}</strong></div><div><span>ENGINE</span><strong>SimPy discrete-event</strong></div></div>
    </details>}

    {report&&compare&&<section className="simpy-compare-card" aria-label="Engine parity comparison">
      <div className="simpy-card-header"><div><span className="simpy-section-number">06 / CROSS-CHECK</span><h3>Two engines. One scenario.</h3><p>Compare both engines using the same server capacity and workload.</p></div><GitCompareArrows size={22}/></div>
      {rules&&verdict?<EngineComparison simpy={verdict} rules={rules}/>:
        <p className="simpy-compare-caption">{comparisonError||'The rules comparison has not been completed.'}</p>}
    </section>}

    {report&&<details className="simpy-raw" open={rawOpen} onToggle={e=>setRawOpen(e.currentTarget.open)}><summary><Terminal size={17}/> Inspect the complete model JSON <span>EVALUATION OUTPUT</span></summary><pre><code>{JSON.stringify(report,null,2)}</code></pre></details>}

  </div>;
}
