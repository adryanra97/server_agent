'use client';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, CircleAlert, Info, LoaderCircle, Play, Waves } from 'lucide-react';
import Link from 'next/link';
import { defaultSpec, defaultLoad, requestVerdict, type Engine, type VerdictResult } from '../lib/model';
import { Outcome, ResourceBars, SectionHead } from './ui';
type Scenario={label:string;multiplier:number;load:number;result:VerdictResult};
export default function Compare(){
  const [engine,setEngine]=useState<Engine>('rules');
  const [base,setBase]=useState(100);
  const [results,setResults]=useState<Scenario[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function run(){
    setError('');setResults([]);setLoading(true);
    try{
      const profiles=[{label:'Base load',multiplier:1},{label:'Double load',multiplier:2},{label:'Triple load',multiplier:3}];
      const responses=await Promise.all(profiles.map(async p=>{
        const adjusted={...defaultLoad,rps:base*p.multiplier,concurrent_connections:defaultLoad.concurrent_connections*p.multiplier};
        const result=await requestVerdict({engine,spec:defaultSpec,load:adjusted});
        return {...p,load:adjusted.rps,result};
      }));
      setResults(responses);
    }catch(e){setError(e instanceof Error?e.message:'The API could not evaluate the comparison.');}
    finally{setLoading(false);}
  }
  return <div className="page-stack">
    <div className="notice notice-technical"><span className="notice-icon"><BarChart3 size={19}/></span><div><strong>One original engine, evaluated three times.</strong><span>Comparison is a UI convenience: it sends three independent requests to the existing copdash POST /verdict endpoint. No new simulation algorithm is introduced.</span></div></div>
    <section className="panel compare-setup">
      <SectionHead eyebrow="01 / COMPARE WORKLOADS" title="Set a common server baseline" description="The original example configuration is used for every request."/>
      <div className="compare-controls"><label><span className="control-label">REQUEST RATE (BASELINE)</span><div className="verdict-field-input"><input type="number" min={0} max={20000} step={10} value={base} onChange={e=>{setBase(+e.target.value);setResults([])}}/><span>RPS</span></div></label><div><span className="control-label">MODEL ENGINE</span><div className="segmented"><button className={engine==='rules'?'selected':''} onClick={()=>{setEngine('rules');setResults([])}}>Rules</button><button className={engine==='simpy'?'selected':''} onClick={()=>{setEngine('simpy');setResults([])}}>SimPy</button></div></div><div><span className="control-label">SERVER CAPACITY</span><strong className="compare-capacity">4 cores · 8 GB RAM</strong></div><button className="btn btn-primary" disabled={loading||base<0||!Number.isFinite(base)} onClick={run}>{loading?<><LoaderCircle className="spin" size={16}/>Comparing…</>:<><Play size={16} fill="currentColor"/>Run comparison</>}</button></div>
    </section>
    <div className="compare-grid">{[1,2,3].map(multiplier=>{
      const found=results.find(x=>x.multiplier===multiplier);
      return <section key={multiplier} className="panel compare-card"><div className="compare-card-head"><span className="kicker">SCENARIO / 0{multiplier}</span><span className="compare-multiplier">{multiplier}× traffic</span></div><h3>{(base*multiplier).toLocaleString('en-US')} <small>RPS</small></h3>{found?<><Outcome verdict={found.result.verdict}/><ResourceBars result={found.result}/><div className="compare-card-bottom"><span>Bottleneck</span><strong>{found.result.bottleneck?.toUpperCase()??'NONE'}</strong></div></>:<div className="compare-empty">Run the comparison to see a calculated verdict for this load.</div>}</section>;
    })}</div>
    {results.length>0&&<section className="panel compare-insight"><SectionHead eyebrow="02 / INTERPRETATION" title="How the verdict changes"/><p>The selected <strong>{engine}</strong> engine was called separately for {results.map(r=>`${r.load} RPS`).join(', ')}. All three requests shared the same capacity specification. The verdict depends on the highest modeled utilization ratio.</p><Link href="/simulation" className="inline-link">Customize all server inputs <ArrowUpRight size={16}/></Link></section>}
    {error&&<p className="error-box" role="alert"><CircleAlert size={16}/>{error}</p>}
    <div className="insight-bar"><span className="insight-symbol"><Info size={19}/></span><div><strong>Read this comparison correctly.</strong><span>The example scales requests per second and declared concurrency together. The original SimPy model uses a fixed seed; results are modeled estimates, not evidence of an actual crash.</span></div></div>
  </div>;
}
