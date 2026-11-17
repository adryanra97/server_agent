'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleAlert, CircleHelp, Cpu, Play, RefreshCw } from 'lucide-react';
import {
  defaultLoad, defaultSpec, inspectSimPy, saveRun,
  type VerdictResult, type Verdict, type VerdictRequest,
} from '../lib/model';
import { readLLMSession, requestReasoning } from '../lib/llm-session';
import { compactTimeline, type TraceSample } from '../lib/trace';
import { Outcome, ResourceBars } from './ui';
import { downloadUnassessablePDF } from '../lib/report-pdf';
import AlignmentScenarioReplay from './alignment-scenario-replay';
import { WholeNumberInput } from './whole-number-input';
import { alignmentFieldIssues, validateAlignmentInputs } from '../lib/alignment-input-validation';

export type AnalysisCase={
  factor:number;rps:number;verdict:Verdict;
  result?:VerdictResult;timeline?:TraceSample[];explanation?:string;explanationSource?:'llm'|'model';
};
const levels=[1,2,3];
const noteFor=(rps:number)=>'SimPy could not complete the '+rps+
  ' RPS evaluation. Check server and workload parameters, retry the model, and use additional performance evidence before making a release decision. No capacity verdict is inferred.';

export default function AlignmentWorkbench({onEvaluated}:{onEvaluated:(cases:AnalysisCase[],issue?:string)=>void}){
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
  const warningRef=useRef<HTMLDivElement|null>(null);
  const errorRef=useRef<HTMLDivElement|null>(null);
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
  const inputValues={peak,cores,ram,cpuMs,memPerReq,concurrent,payload,bandwidth,maxConnections};
  const inputIssue=validateAlignmentInputs(inputValues);
  const fieldIssues=alignmentFieldIssues(inputValues);
  const bringIntoView=(element:HTMLElement|null)=>{
    if(!element)return;
    element.focus({preventScroll:true});
    element.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  };
  useEffect(()=>{if(error)bringIntoView(errorRef.current);},[error]);
  function edit(setter:(value:number)=>void,value:number){
    setter(value);setCases([]);setError('');
    onEvaluated([],'Configuration changed. Run the three SimPy scenarios again before submitting release evidence.');
  }
  async function run(){
    if(inputIssue){
      setCases([]);setError('');onEvaluated([],inputIssue);
      window.requestAnimationFrame(()=>bringIntoView(warningRef.current));
      return;
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
    const incomplete=results.some(item=>!item.result||item.verdict==='not_assessable');
    const evidenceIssue=incomplete?'Some scenarios did not return valid SimPy evidence. Re-run the assessment after reviewing the input and engine response.':undefined;
    setCases(results);onEvaluated(results,evidenceIssue);
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
      setError('SimPy service could not complete the assessment. Your entries passed input preflight; retry or check the service response. No verdict was generated.');
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
      <label className={fieldIssues.cores?'tp-field-invalid':undefined}>Production CPU cores<WholeNumberInput min={1} value={cores} onChange={v=>edit(setCores,v)} aria-invalid={!!fieldIssues.cores} aria-describedby={fieldIssues.cores?'tp-alignment-cores-issue':undefined}/>{fieldIssues.cores&&<small className="tp-field-issue" id="tp-alignment-cores-issue">{fieldIssues.cores}</small>}</label>
      <label className={fieldIssues.ram?'tp-field-invalid':undefined}>Production RAM (MB)<WholeNumberInput min={1} value={ram} onChange={v=>edit(setRam,v)} aria-invalid={!!fieldIssues.ram} aria-describedby={fieldIssues.ram?'tp-alignment-ram-issue':undefined}/>{fieldIssues.ram&&<small className="tp-field-issue" id="tp-alignment-ram-issue">{fieldIssues.ram}</small>}</label>
      <label className={fieldIssues.peak?'tp-field-invalid':undefined}>Normal demand (RPS)<WholeNumberInput min={1} value={peak} onChange={v=>edit(setPeak,v)} aria-invalid={!!fieldIssues.peak} aria-describedby={fieldIssues.peak?'tp-alignment-peak-issue':undefined}/>{fieldIssues.peak&&<small className="tp-field-issue" id="tp-alignment-peak-issue">{fieldIssues.peak}</small>}</label>
    </div>
    <details className="tp-calibration">
      <summary>Advanced Settings &amp; Workload Profile</summary>
      <p>Different applications can consume very different resources at the same RPS. Adjust these assumptions to match the workload being assessed.</p>
      <div className="tp-analysis-form tp-calibration-fields">
        <label className={fieldIssues.cpuMs?'tp-field-invalid':undefined}>CPU time / request (ms)<WholeNumberInput min={1} value={cpuMs} onChange={v=>edit(setCpuMs,v)} aria-invalid={!!fieldIssues.cpuMs} aria-describedby={fieldIssues.cpuMs?'tp-alignment-cpuMs-issue':undefined}/>{fieldIssues.cpuMs&&<small className="tp-field-issue" id="tp-alignment-cpuMs-issue">{fieldIssues.cpuMs}</small>}</label>
        <label className={fieldIssues.memPerReq?'tp-field-invalid':undefined}>Memory / request (MB)<WholeNumberInput min={0} value={memPerReq} onChange={v=>edit(setMemPerReq,v)} aria-invalid={!!fieldIssues.memPerReq} aria-describedby={fieldIssues.memPerReq?'tp-alignment-memPerReq-issue':undefined}/>{fieldIssues.memPerReq&&<small className="tp-field-issue" id="tp-alignment-memPerReq-issue">{fieldIssues.memPerReq}</small>}</label>
        <label className={fieldIssues.concurrent?'tp-field-invalid':undefined}>Concurrent connections<WholeNumberInput min={0} value={concurrent} onChange={v=>edit(setConcurrent,v)} aria-invalid={!!fieldIssues.concurrent} aria-describedby={fieldIssues.concurrent?'tp-alignment-concurrent-issue':undefined}/>{fieldIssues.concurrent&&<small className="tp-field-issue" id="tp-alignment-concurrent-issue">{fieldIssues.concurrent}</small>}</label>
        <label className={fieldIssues.payload?'tp-field-invalid':undefined}>Response payload (KB)<WholeNumberInput min={0} value={payload} onChange={v=>edit(setPayload,v)} aria-invalid={!!fieldIssues.payload} aria-describedby={fieldIssues.payload?'tp-alignment-payload-issue':undefined}/>{fieldIssues.payload&&<small className="tp-field-issue" id="tp-alignment-payload-issue">{fieldIssues.payload}</small>}</label>
        <label className={fieldIssues.bandwidth?'tp-field-invalid':undefined}>Network bandwidth (Mbps)<WholeNumberInput min={1} value={bandwidth} onChange={v=>edit(setBandwidth,v)} aria-invalid={!!fieldIssues.bandwidth} aria-describedby={fieldIssues.bandwidth?'tp-alignment-bandwidth-issue':undefined}/>{fieldIssues.bandwidth&&<small className="tp-field-issue" id="tp-alignment-bandwidth-issue">{fieldIssues.bandwidth}</small>}</label>
        <label className={fieldIssues.maxConnections?'tp-field-invalid':undefined}>Maximum connections<WholeNumberInput min={1} value={maxConnections} onChange={v=>edit(setMaxConnections,v)} aria-invalid={!!fieldIssues.maxConnections} aria-describedby={fieldIssues.maxConnections?'tp-alignment-maxConnections-issue':undefined}/>{fieldIssues.maxConnections&&<small className="tp-field-issue" id="tp-alignment-maxConnections-issue">{fieldIssues.maxConnections}</small>}</label>
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
    {inputIssue&&<div className="tp-input-warning" role="alert" ref={warningRef} tabIndex={-1}><CircleAlert size={19}/><span><strong>Check the entered values</strong>{inputIssue}</span></div>}
    {error&&<div className="tp-error" role="alert" ref={errorRef} tabIndex={-1}>{error}</div>}
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
