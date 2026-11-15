'use client';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, CircleHelp, Cpu, Play, RefreshCw } from 'lucide-react';
import { defaultLoad, defaultSpec, requestVerdict, saveRun, type VerdictResult, type Verdict, type VerdictRequest } from '../lib/model';
import { Outcome, ResourceBars } from './ui';
import { downloadUnassessablePDF } from '../lib/report-pdf';

export type AnalysisCase={factor:number;rps:number;verdict:Verdict;result?:VerdictResult;explanation?:string;explanationSource?:'llm'|'model'};
const BOUND=150;
const levels=[1,2,3];
function noteFor(rps:number){return 'At '+rps+' RPS this scenario is beyond the 1–150 RPS demo assessment range. No capacity verdict or resource metrics are inferred; validate the parameters with an additional performance test before making a release decision.';}
export default function AlignmentWorkbench({onEvaluated}:{onEvaluated:(cases:AnalysisCase[])=>void}){
  const [peak,setPeak]=useState(45);
  const [cores,setCores]=useState(4);
  const [ram,setRam]=useState(16384);
  const [cpuMs,setCpuMs]=useState(15);
  const [cases,setCases]=useState<AnalysisCase[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function run(){
    if(!Number.isInteger(peak)||peak<1||peak>100000||!Number.isInteger(cores)||cores<1||
       !Number.isFinite(ram)||ram<=0||!Number.isFinite(cpuMs)||cpuMs<=0){
      setError('Check the server capacity and workload values before running the analysis.');return;
    }
    setBusy(true);setError('');
    const spec={...structuredClone(defaultSpec),cpu:{cores,clock_ghz:2.5},ram:{total_mb:ram}};
    const load={...defaultLoad,avg_cpu_ms_per_req:cpuMs};
    try{
      const results=await Promise.all(levels.map(async (factor: number):Promise<AnalysisCase>=>{
        const rps=peak*factor;
        if(rps>BOUND){
          return {factor,rps,verdict:'not_assessable',explanation:noteFor(rps),explanationSource:'model'};
        }
        const req:VerdictRequest={engine:'simpy',spec,load:{...load,rps}};
        const result=await requestVerdict(req);
        return {factor,rps,verdict:result.verdict,result};
      }));
      setCases(results);onEvaluated(results);
      const normal=results[0];
      if(normal?.result){
        saveRun({
          id:crypto.randomUUID(),created_at:new Date().toISOString(),
          label:'QRIS Payment · assessment '+peak+' RPS',request:{engine:'simpy',spec,load:{...load,rps:peak}},
          result:normal.result,
        });
      }
      const out=results.filter(x=>x.verdict==='not_assessable');
      if(out.length){
        const target=out[0];
        void fetch('/api/reasoning',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({kind:'indeterminate',service:'QRIS Payment',rps:target.rps,
            maxSupported:BOUND,summary:noteFor(target.rps)}),
        }).then(async response=>response.ok?response.json():null)
          .then(data=>{
            if(data&&typeof data.text==='string'&&data.text.length){
              setCases(old=>{const next=old.map(x=>x.factor===target.factor?{...x,explanation:data.text,explanationSource:(data.generated?'llm':'model') as 'llm'|'model'}:x);onEvaluated(next);return next;});
            }
          }).catch(()=>{});
      }
    }catch(e){setError(e instanceof Error?e.message:'The capacity evaluation could not be completed.');}
    finally{setBusy(false);}
  }
  return <section className="tp-analysis">
    <div className="tp-panel-heading"><div><span>01 / RELEASE ALIGNMENT</span><h3>Evaluate production capacity.</h3><p>Set the workload once, then compare normal, 2×, and 3× traffic with the same server specification.</p></div><Cpu size={24}/></div>
    <div className="tp-analysis-form">
      <label>Production CPU cores<input type="number" min="1" step="1" value={cores} onChange={e=>setCores(Number(e.target.value))}/></label>
      <label>Production RAM (MB)<input type="number" min="512" step="512" value={ram} onChange={e=>setRam(Number(e.target.value))}/></label>
      <label>CPU processing (ms/request)<input type="number" min="0.1" step="1" value={cpuMs} onChange={e=>setCpuMs(Number(e.target.value))}/></label>
      <label>Normal demand (RPS)<input type="number" min="1" step="1" value={peak} onChange={e=>setPeak(Number(e.target.value))}/></label>
    </div>
    <details className="tp-calibration"><summary>Source of calibration · reference scenario</summary>
      <p>QRIS Payment · Cycle 03. Assessment scenarios use a 1–150 RPS reference window. Workloads beyond this range require further performance evidence.</p>
    </details>
    <div className="tp-analysis-footer"><span><CircleHelp size={16}/> 1–150 RPS assessment window · no production traffic</span>
      <button type="button" onClick={()=>void run()} disabled={busy}>{busy?<><RefreshCw size={17}/> Evaluating…</>:<><Play size={16}/> Run simulated analysis <ArrowRight size={16}/></>}</button></div>
    {error&&<div className="tp-error" role="alert">{error}</div>}
    {cases.length>0&&<div className="tp-analysis-results">
      <div className="tp-panel-heading"><div><span>02 / ASSESSMENT RESULTS</span><h3>Verdict first. Evidence on demand.</h3><p>Every valid scenario is calculated by SimPy. Out-of-range scenarios are left unassessed.</p></div></div>
      <div className="tp-whatif-cards">{cases.map(c=><article className="tp-whatif-card" key={c.factor}>
        <div className="tp-whatif-top"><span>{c.factor===1?'Normal':c.factor+'× demand'}</span><strong>{c.rps} RPS</strong></div>
        <Outcome verdict={c.verdict}/>
        {c.result?<><p>{c.result.bottleneck?'Limiting resource: '+c.result.bottleneck.toUpperCase():'Resources remain within the modeled capacity.'}</p>
          <details><summary>Technical indicators</summary><ResourceBars result={c.result}/><p>{c.result.reasons.join(' · ')}</p></details>
        </>:<><p>Capacity cannot be assessed for this workload using the current demo scope.</p>
          <div className="tp-assessment-reason"><strong>{c.explanationSource==='llm'?'AI-assisted explanation':'Scenario guidance'}</strong><p>{c.explanation}</p></div>
          <button className="tp-indeterminate-pdf" type="button" onClick={()=>void downloadUnassessablePDF(c.rps,c.explanation??noteFor(c.rps),c.explanationSource==='llm')}>Download assessment PDF</button>
        </>}
      </article>)}</div>
    </div>}
  </section>;
}
