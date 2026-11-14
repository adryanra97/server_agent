'use client';

import { useState } from 'react';
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
import { Outcome, ResourceBars, VerdictCard } from './ui';

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

function NumberInput({label,unit,value,onChange,min=0,step='any',note}:{
  label:string;unit:string;value:number;onChange:(value:number)=>void;
  min?:number;step?:number|string;note?:string;
}){
  return <label className="simpy-field">
    <span className="simpy-field-top"><strong>{label}</strong>{note&&<small>{note}</small>}</span>
    <span className="simpy-input"><input type="number" value={value} min={min} step={step}
      onChange={e=>onChange(Number(e.target.value))}
      aria-label={label}/><span>{unit}</span></span>
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
  const [compare,setCompare]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [comparisonError,setComparisonError]=useState('');
  const [rawOpen,setRawOpen]=useState(false);

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
    if(values.some(v=>!Number.isFinite(v)))return 'Complete every numeric field before running the simulation.';
    if(values.slice(0,5).some(v=>v<=0)||values.slice(5).some(v=>v<0))
      return 'Server capacity must be greater than zero. Traffic and request costs cannot be negative.';
    if(!Number.isInteger(spec.network.max_connections)||!Number.isInteger(load.concurrent_connections))
      return 'Connection limits and concurrent connections must be whole numbers.';
    if(load.rps>0&&load.avg_mem_mb_per_req>spec.ram.total_mb)
      return 'Memory per request exceeds total available RAM. Reduce the memory requirement or increase server RAM.';
    return '';
  }
  async function run(){
    const validation=validate();
    if(validation){setError(validation);return;}
    setBusy(true);setError('');setComparisonError('');setReport(null);setRules(null);setRawOpen(false);
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
      saveRun({
        id:crypto.randomUUID(),created_at:new Date().toISOString(),
        label:`SimPy · ${body.load.rps} RPS · ${body.spec.cpu.cores} cores`,
        request:{...body,engine:'simpy'},result:data.result,
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
  const difference=rules&&verdict?
    (['cpu','ram','network'] as const).map(key=>({
      label:key.toUpperCase(),simpy:verdict.resources[key].utilization,
      rules:rules.resources[key].utilization,
    })):[];

  return <div className="simpy-page">
    <section className="simpy-intro" aria-labelledby="simpy-intro-title">
      <div className="simpy-intro-copy"><span className="simpy-overline"><span/> MODEL / 02 — DISCRETE-EVENT</span>
        <h2 id="simpy-intro-title">See what a server does <em>under pressure.</em></h2>
        <p>Requests arrive. Resources are acquired. Work gets queued. The original copdash SimPy engine calculates how the system responds—without generating production traffic.</p>
        <div className="simpy-intro-facts"><span>SimPy 4</span><span>Fixed seed · 0</span><span>Up to 20,000 arrivals</span></div>
      </div>
      <div className="simpy-intro-graphic" aria-hidden="true">
        <div className="simpy-graphic-head"><span>SIMULATION SEQUENCE</span><span>NOT LIVE TELEMETRY</span></div>
        <div className="simpy-graphic-nodes">
          <span className="simpy-graphic-node"><Network size={20}/><small>NETWORK</small></span><span className="simpy-graphic-link"><i/></span>
          <span className="simpy-graphic-node"><Database size={20}/><small>RAM</small></span><span className="simpy-graphic-link"><i/></span>
          <span className="simpy-graphic-node"><Cpu size={20}/><small>CPU</small></span>
        </div><div className="simpy-graphic-bottom"><span>POISSON ARRIVALS</span><span>RESOURCE QUEUES</span><span>VERDICT</span></div>
      </div>
    </section>

    <div className="simpy-process-caption"><span>01 <b>/ Configure the experiment</b></span><span>02 <b>/ Execute the model</b></span><span>03 <b>/ Interpret the evidence</b></span></div>

    <div className="simpy-columns">
      <section className="simpy-config" aria-label="Simulation configuration">
        <div className="simpy-config-head"><div><span className="simpy-section-number">01 / INPUT</span><h3>Build your scenario.</h3><p>Every field maps directly to the original copdash request schema.</p></div><Server size={23}/></div>
        <div className="simpy-form-section"><div className="simpy-form-heading"><span>SERVER CAPACITY</span><span>WHAT IS AVAILABLE</span></div>
          <div className="simpy-fields">
            <NumberInput label="CPU cores" unit="cores" min={0.01} value={body.spec.cpu.cores} onChange={v=>updateSpec('cpu','cores',v)}/>
            <NumberInput label="Clock speed" unit="GHz" min={0.01} value={body.spec.cpu.clock_ghz} onChange={v=>updateSpec('cpu','clock_ghz',v)} note="Reserved — not used in calculations"/>
            <NumberInput label="Total RAM" unit="MB" min={0.01} value={body.spec.ram.total_mb} onChange={v=>updateSpec('ram','total_mb',v)}/>
            <NumberInput label="Network bandwidth" unit="Mbps" min={0.01} value={body.spec.network.bandwidth_mbps} onChange={v=>updateSpec('network','bandwidth_mbps',v)}/>
            <NumberInput label="Maximum connections" unit="connections" min={1} step={1} value={body.spec.network.max_connections} onChange={v=>updateSpec('network','max_connections',v)}/>
          </div>
        </div>
        <div className="simpy-form-section"><div className="simpy-form-heading"><span>REQUEST WORKLOAD</span><span>WHAT IS DEMANDED</span></div>
          <div className="simpy-preset-row"><span>Request-rate examples</span>{[{rps:100,label:'Normal'},{rps:360,label:'Peak'},{rps:900,label:'Stress'}].map(p=><button type="button" key={p.rps} className={body.load.rps===p.rps?'active':''} onClick={()=>preset(p.rps)}>{p.label} <small>{p.rps} RPS</small></button>)}</div>
          <div className="simpy-fields">
            <NumberInput label="Arrival rate" unit="RPS" value={body.load.rps} onChange={v=>updateLoad('rps',v)}/>
            <NumberInput label="CPU time / request" unit="ms" value={body.load.avg_cpu_ms_per_req} onChange={v=>updateLoad('avg_cpu_ms_per_req',v)}/>
            <NumberInput label="RAM / request" unit="MB" value={body.load.avg_mem_mb_per_req} onChange={v=>updateLoad('avg_mem_mb_per_req',v)}/>
            <NumberInput label="Concurrent connections" unit="connections" step={1} value={body.load.concurrent_connections} onChange={v=>updateLoad('concurrent_connections',v)}/>
            <NumberInput label="Response payload" unit="KB" value={body.load.payload_kb} onChange={v=>updateLoad('payload_kb',v)}/>
          </div>
          <p className="simpy-preset-note">Presets adjust arrival rate only. Other workload assumptions stay as you entered them.</p>
        </div>
        <div className="simpy-run-options">
          <label className="simpy-compare-toggle"><input type="checkbox" checked={compare} onChange={e=>{setCompare(e.target.checked);setRules(null)}}/><span className="simpy-compare-box"/><span><strong>Cross-check against Rules Engine</strong><small>Compare outputs from the original deterministic model.</small></span></label>
        </div>
        <button className="simpy-run-button" disabled={busy} onClick={run}>
          {busy?<><LoaderCircle className="spin" size={18}/>Executing SimPy…</>:<><Play size={17} fill="currentColor"/>Run discrete-event simulation</>}
          <ArrowRight size={18}/>
        </button>
        <div className="simpy-reset-row"><span><ShieldCheck size={15}/> Computation only · No production traffic</span><button onClick={reset}><RotateCcw size={14}/> Reset</button></div>
        {error&&<div role="alert" className="simpy-error"><CircleAlert size={18}/><span>{error}</span></div>}
      </section>

      <div className="simpy-main-column">
        <section className="simpy-flow-card" aria-labelledby="flow-title">
          <div className="simpy-card-header"><div><span className="simpy-section-number">02 / SIMULATION MECHANICS</span><h3 id="flow-title">Follow a request.</h3></div><span className="simpy-card-aside">CONCEPTUAL PATH · NOT EVENT REPLAY</span></div>
          <div className={`simpy-step-chain ${busy?'is-running':''}`}>
            {flow.map((step,index)=><div className="simpy-flow-row" key={step.number}>
              <div className="simpy-flow-number">{step.number}</div>
              <div className="simpy-flow-icon"><step.icon size={22} strokeWidth={1.65}/></div>
              <div className="simpy-flow-content"><strong>{step.label}</strong><span>{step.detail}</span></div>
              {index===flow.length-1?<CheckCircle2 className="simpy-flow-check" size={18}/>:<span className="simpy-flow-line"><span/></span>}
            </div>)}
          </div>
          <div className="simpy-flow-footer"><span className="simpy-pulse"/><span>{busy?'SimPy engine executing this scenario…':report?'Execution complete. See measured results below.':'Flow diagram describes the underlying SimPy model.'}</span></div>
        </section>

        <section className="simpy-result-card" aria-labelledby="result-title" aria-live="polite">
          <div className="simpy-card-header"><div><span className="simpy-section-number">03 / CAPACITY EVIDENCE</span><h3 id="result-title">What did the model find?</h3></div><span className="simpy-card-aside">{report?'ACTUAL ENGINE RESPONSE':'READY TO SIMULATE'}</span></div>
          {verdict?<div className="simpy-result-content">
            <div className="simpy-verdict-overview"><div><Outcome verdict={verdict.verdict}/><h4>{verdict.verdict==='will_survive'?'Capacity remains within the defined envelope.':verdict.verdict==='at_risk'?'The server is approaching its operating limit.':'The modeled demand exceeds available capacity.'}</h4></div><div className="simpy-bottleneck"><span>LIMITING RESOURCE</span><strong>{affected?.toUpperCase()??'NONE'}</strong></div></div>
            <div className="simpy-evidence-stats">
              <div><span>ARRIVED</span><strong>{format(details?.arrived??0)}</strong><small>simulated requests</small></div>
              <div><span>COMPLETED</span><strong>{format(details?.completed??0)}</strong><small>simulated requests</small></div>
              <div><span>SIMULATED TIME</span><strong>{format(details?.simulated_elapsed_seconds??0)}<small> s</small></strong><small>includes queue drain</small></div>
              <div><span>EXECUTION</span><strong>{format(report.execution_ms)}<small> ms</small></strong><small>server compute time</small></div>
            </div>
            <div className="simpy-utilization"><div className="simpy-subheading"><span>REPORTED RESOURCE PRESSURE</span><span>SIMPY VERDICT VALUES</span></div><ResourceBars result={verdict}/></div>
            <div className="simpy-explanations"><span className="simpy-subheading"><span>WHY THIS VERDICT</span></span>{verdict.reasons.map((reason,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{reason}</p></div>)}</div>
          </div>:<div className="simpy-awaiting">
            <div className="simpy-await-icon"><Waves size={34}/></div>
            <strong>A scenario is ready to be tested.</strong>
            <p>Run the SimPy model to reveal actual request counts, utilization, bottlenecks, and the reasoning behind its verdict.</p>
            <span>RESULTS ARE NEVER FABRICATED</span>
          </div>}
        </section>
      </div>
    </div>

    {report&&details&&<div className="simpy-deepdive">
      <div className="simpy-deepdive-head"><span className="simpy-section-number">04 / MODEL TRANSPARENCY</span><h3>What was measured? <em>What was assumed?</em></h3><p>SimPy exposes two kinds of capacity figures: observed utilization inside the simulation and offered demand from the original rules formulas. Offered demand is used to show overload beyond 100%.</p></div>
      <div className="simpy-metrics-table" role="table" aria-label="SimPy model metrics">
        <div role="row" className="simpy-metrics-heading"><span role="columnheader">Resource</span><span role="columnheader">Simulated mean</span><span role="columnheader">Offered demand</span></div>
        {labels.map(row=><div role="row" key={row.key} className="simpy-metrics-row"><strong role="cell">{row.label}</strong><span role="cell">{pct(details.measured_utilization[row.key])}</span><span role="cell">{pct(details.offered_utilization[row.key])}</span></div>)}
      </div>
      <div className="simpy-method-notes"><div><span>RANDOM SEED</span><strong>{details.seed}</strong></div><div><span>ARRIVAL WINDOW</span><strong>{details.arrival_window_seconds}s <small>nominal</small></strong></div><div><span>ARRIVAL LIMIT</span><strong>{format(details.arrival_cap)}</strong></div><div><span>ENGINE</span><strong>SimPy / copdash</strong></div></div>
    </div>}

    {report&&compare&&<section className="simpy-compare-card" aria-label="Engine parity comparison">
      <div className="simpy-card-header"><div><span className="simpy-section-number">05 / CROSS-CHECK</span><h3>Two engines. One scenario.</h3><p>Exactly the same server specification and workload sent to both original engines.</p></div><GitCompareArrows size={22}/></div>
      {rules&&verdict?<><div className="simpy-compare-grid"><div><span>DISCRETE-EVENT</span><strong>SimPy</strong><Outcome verdict={verdict.verdict}/></div><div><span>DETERMINISTIC</span><strong>Rules</strong><Outcome verdict={rules.verdict}/></div><div className="simpy-agreement">{rules.verdict===verdict.verdict?<><CheckCircle2 size={17}/> Verdicts agree</>:<><CircleAlert size={17}/> Model verdicts differ</>}</div></div>
        <div className="simpy-difference-grid">{difference.map(row=><div key={row.label}><strong>{row.label}</strong><span>SimPy {pct(row.simpy)}</span><span>Rules {pct(row.rules)}</span></div>)}</div>
        <p className="simpy-compare-caption">Differences can occur near the 80% and 100% thresholds because SimPy uses sampled arrival timing. Neither model is ground-truth production telemetry.</p>
      </>:<p className="simpy-compare-caption">{comparisonError||'The rules comparison has not been completed.'}</p>}
    </section>}

    {report&&<details className="simpy-raw" open={rawOpen} onToggle={e=>setRawOpen(e.currentTarget.open)}><summary><Terminal size={17}/> Inspect the complete model JSON <span>OPEN SOURCE OUTPUT</span></summary><pre><code>{JSON.stringify(report,null,2)}</code></pre></details>}

    <div className="simpy-bottom-notes"><div><Info size={18}/><p><strong>Model limitations.</strong> A fixed-seed simulation and closed-form demand estimates are useful for exploring capacity assumptions. The original model does not use clock speed in its formulas and does not incorporate real production traces or calibrated probabilities.</p></div><Link href="/methodology">Read the original model assumptions <ArrowUpRight size={16}/></Link></div>
  </div>;
}
