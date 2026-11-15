'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleHelp, Cpu, Play, RefreshCw } from 'lucide-react';
import {
  defaultLoad, defaultSpec, inspectSimPy, saveRun,
  type VerdictResult, type Verdict, type VerdictRequest,
} from '../lib/model';
import { readLLMSession, requestReasoning } from '../lib/llm-session';
import { compactTimeline, type TraceSample } from '../lib/trace';
import { Outcome, ResourceBars } from './ui';
import { downloadUnassessablePDF } from '../lib/report-pdf';
import AlignmentScenarioReplay from './alignment-scenario-replay';

export type AnalysisCase={
  factor:number;rps:number;verdict:Verdict;
  result?:VerdictResult;timeline?:TraceSample[];explanation?:string;explanationSource?:'llm'|'model';
};
const levels=[1,2,3];
const noteFor=(rps:number)=>'SimPy could not complete the '+rps+
  ' RPS evaluation. Check server and workload parameters, retry the model, and use additional performance evidence before making a release decision. No capacity verdict is inferred.';

export default function AlignmentWorkbench({onEvaluated}:{onEvaluated:(cases:AnalysisCase[])=>void}){
  const [peak,setPeak]=useState(45);
  const [cores,setCores]=useState(4);
  const [ram,setRam]=useState(16384);
  const [cpuMs,setCpuMs]=useState(15);
  const [memPerReq,setMemPerReq]=useState(defaultLoad.avg_mem_mb_per_req);
  const [concurrent,setConcurrent]=useState(defaultLoad.concurrent_connections);
  const [payload,setPayload]=useState(defaultLoad.payload_kb);
  const [bandwidth,setBandwidth]=useState(defaultSpec.network.bandwidth_mbps);
  const [maxConnections,setMaxConnections]=useState(defaultSpec.network.max_connections);
  const [calibrationSource,setCalibrationSource]=useState<'sample'|'measured'>('sample');
  const [cases,setCases]=useState<AnalysisCase[]>([]);
  const resultsRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    if(cases.length>0){
      resultsRef.current?.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
        block:'start',
      });
    }
  },[cases.length]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function run(){
    const values=[peak,cores,ram,cpuMs,memPerReq,concurrent,payload,bandwidth,maxConnections];
    if(values.some(value=>!Number.isFinite(value))||!Number.isInteger(peak)||peak<1||
       !Number.isInteger(cores)||cores<1||ram<=0||cpuMs<=0||memPerReq<0||
       !Number.isInteger(concurrent)||concurrent<0||payload<0||bandwidth<=0||
       !Number.isInteger(maxConnections)||maxConnections<1){
      setError('Complete the workload and server settings with valid values before running SimPy.');return;
    }
    setBusy(true);setError('');setCases([]);
    const spec={
      ...structuredClone(defaultSpec),
      cpu:{cores,clock_ghz:defaultSpec.cpu.clock_ghz},
      ram:{total_mb:ram},network:{bandwidth_mbps:bandwidth,max_connections:maxConnections},
    };
    const load={
      ...defaultLoad,avg_cpu_ms_per_req:cpuMs,avg_mem_mb_per_req:memPerReq,
      concurrent_connections:concurrent,payload_kb:payload,
    };
    const settled=await Promise.allSettled(levels.map(async factor=>{
      const rps=peak*factor;
      const req:VerdictRequest={engine:'simpy',spec,load:{...load,rps}};
      const inspected=await inspectSimPy(req);
      return {factor,rps,verdict:inspected.result.verdict,result:inspected.result,
        timeline:compactTimeline(inspected.simulation.timeline)} as AnalysisCase;
    }));
    const results:AnalysisCase[]=settled.map((entry,index)=>entry.status==='fulfilled'?entry.value:{
      factor:levels[index],rps:peak*levels[index],verdict:'not_assessable',
      explanation:noteFor(peak*levels[index]),explanationSource:'model',
    });
    setCases(results);onEvaluated(results);
    const normal=results[0];
    if(normal?.result){
      try{
        saveRun({
          id:crypto.randomUUID(),created_at:new Date().toISOString(),
          label:'QRIS Payment · assessment '+peak+' RPS',
          request:{engine:'simpy',spec,load:{...load,rps:peak}},
          result:normal.result,timeline:normal.timeline,
        });
      }catch{setError('The assessment finished, but the browser could not save it to the local history.');}
    }
    const failed=results.filter(item=>item.verdict==='not_assessable');
    if(failed.length===results.length){
      setError('SimPy could not evaluate any of the three scenarios. Verify the engine connection and your input values.');
    }
    setBusy(false);
    // LLM is a fallback explanation ONLY for genuinely unsuccessful SimPy calls.
    // Its output never replaces a model verdict or creates computed resource data.
    if(readLLMSession()&&failed.length){
      const explanations=await Promise.all(failed.map(async item=>{
        try{
          const result=await requestReasoning({
            kind:'indeterminate',service:'QRIS Payment',rps:item.rps,
            summary:noteFor(item.rps),
          });
          return {factor:item.factor,text:result.text,generated:result.generated};
        }catch{return null;}
      }));
      const next=results.map(item=>{
        const explanation=explanations.find(row=>row?.factor===item.factor);
        return explanation?{
          ...item,explanation:explanation.text,
          explanationSource:(explanation.generated?'llm':'model') as 'llm'|'model',
        }:item;
      });
      setCases(next);onEvaluated(next);
    }
  }
  return <section className="tp-analysis">
    <div className="tp-panel-heading"><div><span>01 / RELEASE ALIGNMENT</span><h3>Evaluate production capacity.</h3>
      <p>Compare normal, 2×, and 3× demand using the same server and workload profile. Every valid scenario is sent to SimPy.</p>
    </div><Cpu size={24}/></div>
    <div className="tp-analysis-form">
      <label>Production CPU cores<input type="number" min="1" step="1" value={cores} onChange={e=>setCores(Number(e.target.value))}/></label>
      <label>Production RAM (MB)<input type="number" min="512" step="512" value={ram} onChange={e=>setRam(Number(e.target.value))}/></label>
      <label>Normal demand (RPS)<input type="number" min="1" step="1" value={peak} onChange={e=>setPeak(Number(e.target.value))}/></label>
    </div>
    <details className="tp-calibration">
      <summary>Advanced Settings &amp; Workload Profile</summary>
      <p>Different applications can consume very different resources at the same RPS. Adjust these assumptions to match the workload being assessed.</p>
      <div className="tp-analysis-form tp-calibration-fields">
        <label>CPU time / request (ms)<input type="number" min="0.1" step="0.1" value={cpuMs} onChange={e=>setCpuMs(Number(e.target.value))}/></label>
        <label>Memory / request (MB)<input type="number" min="0" step="0.1" value={memPerReq} onChange={e=>setMemPerReq(Number(e.target.value))}/></label>
        <label>Concurrent connections<input type="number" min="0" step="1" value={concurrent} onChange={e=>setConcurrent(Number(e.target.value))}/></label>
        <label>Response payload (KB)<input type="number" min="0" step="0.1" value={payload} onChange={e=>setPayload(Number(e.target.value))}/></label>
        <label>Network bandwidth (Mbps)<input type="number" min="1" step="1" value={bandwidth} onChange={e=>setBandwidth(Number(e.target.value))}/></label>
        <label>Maximum connections<input type="number" min="1" step="1" value={maxConnections} onChange={e=>setMaxConnections(Number(e.target.value))}/></label>
        <label>Profile evidence<select value={calibrationSource} onChange={e=>setCalibrationSource(e.target.value as 'sample'|'measured')}>
          <option value="sample">Example assumptions</option>
          <option value="measured">Values provided from load testing</option>
        </select></label>
      </div>
      <p className="tp-calibration-note">{calibrationSource==='sample'?
        'Example assumptions are not verified measurements. Update the values before interpreting real application capacity.':
        'User-provided load-test values. TwinPeak does not independently verify or calibrate these measurements.'}</p>
    </details>
    <div className="tp-analysis-footer"><span><CircleHelp size={16}/> Workload-specific assumptions · SimPy evaluation</span>
      <button type="button" onClick={()=>void run()} disabled={busy}>{busy?<><RefreshCw size={17}/> Evaluating…</>:<><Play size={16}/> Run simulated analysis <ArrowRight size={16}/></>}</button>
    </div>
    {error&&<div className="tp-error" role="alert">{error}</div>}
    {cases.length>0&&<div className="tp-analysis-results" ref={resultsRef}>
      <div className="tp-panel-heading"><div><span>02 / ASSESSMENT RESULTS</span><h3>Verdict first. Evidence on demand.</h3>
        <p>SimPy results are shown when available. An unsuccessful engine request is marked Tidak Dapat Dinilai, without inventing measurements.</p>
      </div></div>
      <div className="tp-whatif-cards">{cases.map(c=><article className="tp-whatif-card" key={c.factor}>
        <div className="tp-whatif-top"><span>{c.factor===1?'Normal':c.factor+'× demand'}</span><strong>{c.rps} RPS</strong></div>
        <Outcome verdict={c.verdict}/>
        {c.result?<><p>{c.result.bottleneck?'Limiting resource: '+c.result.bottleneck.toUpperCase():'Resources remain within modeled capacity.'}</p>
          <details><summary>Technical indicators</summary><ResourceBars result={c.result}/><p>{c.result.reasons.join(' · ')}</p></details>
        </>:<><p>SimPy could not complete this scenario. No pass/fail assessment is inferred.</p>
          <div className="tp-assessment-reason"><strong>{c.explanationSource==='llm'?'LLM-assisted explanation':'Guidance to retry the evaluation'}</strong><p>{c.explanation}</p></div>
          <button className="tp-indeterminate-pdf" type="button"
            onClick={()=>void downloadUnassessablePDF(c.rps,c.explanation??noteFor(c.rps),c.explanationSource==='llm')}>
            Download assessment PDF
          </button>
        </>}
      </article>)}</div>
      <AlignmentScenarioReplay cases={cases} sectionId="alignment-live-replay"/>
    </div>}
  </section>;
}
