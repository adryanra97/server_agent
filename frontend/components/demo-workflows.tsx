'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, ClipboardCheck,
  Clock3, Cpu, ChevronDown, Download, FileText, GitCompareArrows, Info, Play, ShieldCheck, Waves,
} from 'lucide-react';
import { inspectSimPy, history, defaultLoad, defaultSpec, type HistoryItem } from '../lib/model';
import { compactTimeline, hasFullReplay, type TraceSample } from '../lib/trace';
import {
  demoRecords, saveAlignment, saveIncident, getPersona,
  type DemoRecords, type DemoAlignment, type DemoIncident,
} from '../lib/demo';
import { Outcome } from './ui';
import { useWorkspaceRole } from './workspace-role';
import AlignmentWorkbench, { type AnalysisCase } from './alignment-workbench';
import AlignmentDecision from './alignment-decision';
import AlignmentScenarioReplay from './alignment-scenario-replay';
import { downloadTwinPeakPDF } from '../lib/report-pdf';
import TracePreview from './trace-preview';

type Section='alignment'|'incident'|'signoff';
const date=(value:string)=>new Date(value).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
const now=()=>new Date().toISOString();
function useDemoRecords(){
  const [state,setState]=useState<DemoRecords>({alignments:[],incidents:[]});
  useEffect(()=>{
    const refresh=()=>setState(demoRecords());
    refresh();
    window.addEventListener('serveragent-demo-records',refresh);
    return()=>window.removeEventListener('serveragent-demo-records',refresh);
  },[]);
  return state;
}
function StateTag({value}:{value:string}){
  const names:Record<string,string>={
    review:'Awaiting technical review',returned:'Returned to Dev',
    'pending-signoff':'Awaiting sign-off',approved:'Approved for attachment',
    rejected:'Sign-off rejected',open:'Escalated / open',
    analyzed:'Mitigation modeled',escalated:'Needs technical escalation',
  };
  return <span className={'role-state role-state-'+value}>{names[value]??value}</span>;
}
function EmptyRecords({message,link,label}:{message:string;link?:string;label?:string}){
  return <div className="role-empty"><FileText size={30}/><strong>No matching records yet.</strong><p>{message}</p>{link&&<Link href={link}>{label??'Continue'} <ArrowUpRight size={16}/></Link>}</div>;
}
export default function DemoWorkflows({section}:{section:Section}){
  const role=useWorkspaceRole();
  const data=useDemoRecords();
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [analysisCases,setAnalysisCases]=useState<AnalysisCase[]>([]);
  const [release,setRelease]=useState('QRIS-RC03');
  const [cycle,setCycle]=useState(3);
  const [service,setService]=useState('QRIS Payment');
  const [runId,setRunId]=useState('');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [incidentType,setIncidentType]=useState('Traffic spike');
  const [symptom,setSymptom]=useState('Increased response times during traffic peak');
  const [incidentRps,setIncidentRps]=useState(900);
  const [incidentService,setIncidentService]=useState('Integration Gateway');
  const [mitigationCores,setMitigationCores]=useState(12);
  const [selectedIncident,setSelectedIncident]=useState<string|null>(null);
  const [expandedAlignments,setExpandedAlignments]=useState<Record<string,boolean>>({});
  useEffect(()=>{
    setRuns(history());
    const refresh=()=>setRuns(history());
    window.addEventListener('serveragent-history',refresh);
    return()=>window.removeEventListener('serveragent-history',refresh);
  },[]);
  const selectedRun=runs.find(x=>x.id===runId)||runs[0];
  const latestByRelease=useMemo(()=>data.alignments.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[data.alignments]);
  function submitAlignment(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage('');
    if(role!=='qa'||!selectedRun){setMessage('Run a SimPy evaluation first, then select its result.');return;}
    if(analysisCases[0]?.verdict==='not_assessable'){
      setMessage('The selected normal-demand simulation could not be evaluated. Retry the SimPy engine before submitting release evidence.');return;
    }
    if(!note.trim()){setMessage('Add a brief QA test summary before submitting the release candidate.');return;}
    const stamp=now();
    saveAlignment({
      id:crypto.randomUUID(),type:'alignment',createdAt:stamp,updatedAt:stamp,
      release:release.trim(),cycle,service:service.trim(),qaNotes:note.trim(),
      createdBy:role,status:'review',runId:selectedRun.id,
      whatIf:analysisCases.length?analysisCases:undefined,
      result:selectedRun.result,rps:selectedRun.request.load.rps,
    });
    setNote('');
    setMessage('Alignment evidence submitted for Technical Lead review.');
  }
  async function loadAlignmentReplay(item:DemoAlignment,factor:number):Promise<TraceSample[]>{
    const saved=history().find(run=>run.id===item.runId);
    if(!saved||saved.request.engine!=='simpy'){
      throw new Error('The original server profile for this case is unavailable. Run a new SimPy evaluation from QA.');
    }
    const previous=item.whatIf?.find(c=>c.factor===factor);
    if(previous?.verdict==='not_assessable'){
      throw new Error('This scenario has no completed verdict to replay.');
    }
    const rps=previous?.rps??saved.request.load.rps*factor;
    const inspection=await inspectSimPy({
      ...saved.request,engine:'simpy',
      load:{...saved.request.load,rps},
    });
    const expected=previous?.verdict??(factor===1?item.result.verdict:null);
    if(expected&&inspection.result.verdict!==expected){
      throw new Error('The new model verdict differs from the saved decision. Keep the original evidence and create a fresh QA evaluation instead.');
    }
    const timeline=compactTimeline(inspection.simulation.timeline);
    if(!hasFullReplay(timeline)){
      throw new Error('SimPy did not return a complete replay trace for this scenario.');
    }
    const latest=demoRecords().alignments.find(record=>record.id===item.id);
    if(latest){
      const current=latest.whatIf??[];
      const merged=current.some(c=>c.factor===factor)
        ?current.map(c=>c.factor===factor?{...c,timeline}:c)
        :[...current,{factor,rps,verdict:inspection.result.verdict,result:inspection.result,timeline}]
          .sort((a,b)=>a.factor-b.factor);
      saveAlignment({...latest,whatIf:merged});
    }
    return timeline;
  }
  function decideAlignment(item:DemoAlignment,status:'returned'|'pending-signoff',reviewText:string){
    if(role!=='lead'||item.status!=='review')return;
    if(!reviewText.trim()){setMessage('Add a Technical Lead review note before recording your decision.');return;}
    const stamp=now();
    saveAlignment({...item,status,reviewerNote:reviewText.trim(),reviewedAt:stamp,updatedAt:stamp});
    setMessage(status==='returned'?'Cycle returned to Development for iteration.':'Technical recommendation sent to the Manager sign-off queue.');
  }
  function signOff(item:DemoAlignment,status:'approved'|'rejected'){
    if(role!=='manager'||item.status!=='pending-signoff')return;
    if(!note.trim()){setMessage('Add the manager sign-off decision rationale before submitting.');return;}
    const stamp=now();
    saveAlignment({...item,status,signoffNote:note.trim(),signedAt:stamp,
      signedVersion:status==='approved'?'v1.0':undefined,updatedAt:stamp});
    setNote('');setMessage(status==='approved'?'Demo sign-off recorded and version locked in the UI.':'Rejection recorded with its review note.');
  }
  function submitIncident(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage('');
    if(role!=='support')return;
    const stamp=now();
    saveIncident({
      id:crypto.randomUUID(),type:'incident',createdAt:stamp,updatedAt:stamp,
      service:incidentService.trim(),symptom:symptom.trim(),incidentType,
      peakRps:incidentRps,detectedAt:stamp,createdBy:'support',status:'open',
      spec:structuredClone(defaultSpec),load:{...defaultLoad,rps:incidentRps},
    });
    setMessage('Incident escalation saved. Switch to Integration Engineer to evaluate the scenario.');
  }
  async function investigate(item:DemoIncident){
    if(role!=='engineer')return;
    if(!Number.isFinite(mitigationCores)||mitigationCores<=0){
      setMessage('Mitigation CPU cores must be greater than zero.');return;
    }
    setMessage('');setBusy(item.id);
    try{
      const beforeInspection=await inspectSimPy({engine:'simpy',spec:item.spec,load:item.load});
      const afterInspection=await inspectSimPy({
        engine:'simpy',
        spec:{...item.spec,cpu:{...item.spec.cpu,cores:mitigationCores}},
        load:item.load,
      });
      const before=beforeInspection.result,after=afterInspection.result;
      const stamp=now();
      saveIncident({...item,status:after.verdict==='will_crash'?'escalated':'analyzed',
        before,after,
        beforeTimeline:compactTimeline(beforeInspection.simulation.timeline),
        afterTimeline:compactTimeline(afterInspection.simulation.timeline),
        mitigatedCores:mitigationCores,engineerNotes:note.trim(),analyzedAt:stamp,updatedAt:stamp});
      setMessage(after.verdict==='will_crash'?'Scenario simulated; mitigation remains insufficient and is flagged for escalation.':'Original SimPy engine executed both scenarios. Review the before/after evidence below.');
    }catch(error){setMessage(error instanceof Error?error.message:'The simulation could not be run.');}
    finally{setBusy(null);}
  }
  return <div className="role-workflow">
    <div className="role-workflow-intro">
      <div><span className="role-eyebrow">{section==='alignment'?'UC-01 / RELEASE ALIGNMENT':section==='incident'?'UC-02 / INCIDENT HANDLING':'UC-04 / RELEASE SIGN-OFF'}</span>
        <h2>{section==='alignment'?'From model evidence to a release decision.':section==='incident'?'Reproduce and reason about incident risk.':'A documented decision before deployment.'}</h2>
        <p>{section==='alignment'?'QA submits actual engine results; the Technical Lead records the next-cycle decision.':section==='incident'?'Support logs incident symptoms; the Integration Engineer evaluates a simulated reproduction and CPU-capacity mitigation.':'The Project/Technical Manager reviews recommendations forwarded by the Technical Lead.'}</p>
      </div>
      <div className="role-workflow-owner"><span>YOUR RESPONSIBILITY</span><strong>{getPersona(role).shortRole}</strong><small>{section==='incident'&&role==='support'?'Record & escalate':section==='incident'&&role==='engineer'?'Reproduce & test':section==='alignment'&&role==='qa'?'Prepare evidence':section==='alignment'&&role==='lead'?'Review & decide':section==='signoff'?'Approve or reject':'Read-only oversight'}</small></div>
    </div>
    {message&&<div className="role-workflow-message" role="status"><Info size={18}/>{message}</div>}

    {section==='alignment'&&<>
      {(role==='qa'||role==='lead')&&<AlignmentWorkbench onEvaluated={cases=>{setAnalysisCases(cases);setRunId('');}}/>}
      {role==='qa'&&<section className="role-form-panel">
        <div className="role-panel-head"><div><span className="role-eyebrow">STEP 01 / QA SUBMISSION</span><h3>Submit simulation evidence</h3></div><Activity size={22}/></div>
        <p>Select an actual evaluation saved by the ServerAgent simulator. It will be attached to this release-cycle submission.</p>
        <form onSubmit={submitAlignment} className="role-form-grid">
          <label>Release candidate<input required value={release} onChange={e=>setRelease(e.target.value)}/></label>
          <label>Sprint cycle<input required type="number" min="1" step="1" value={cycle} onChange={e=>setCycle(Number(e.target.value))}/></label>
          <label>Service<input required value={service} onChange={e=>setService(e.target.value)}/></label>
          <label>SimPy evidence<select aria-label="Select saved simulation" value={selectedRun?.id??''} onChange={e=>setRunId(e.target.value)} disabled={!runs.length}>
            {runs.length?runs.map(item=><option key={item.id} value={item.id}>{item.result.engine.toUpperCase()} · {item.request.load.rps} RPS · {item.result.verdict}</option>):<option value="">No simulation available</option>}
          </select></label>
          <label className="role-form-wide">QA testing notes<textarea rows={3} required placeholder="Summary of Dev test, changes, and acceptance context" value={note} onChange={e=>setNote(e.target.value)}/></label>
          <div className="role-form-wide role-form-footer"><Link href="/simulation">Open SimPy simulator <ArrowUpRight size={16}/></Link><button type="submit" disabled={!selectedRun}>Submit for Technical Lead review <ArrowRight size={16}/></button></div>
        </form>
      </section>}
      {role==='lead'&&<div className="role-review-hint"><ClipboardCheck size={19}/><span>Review submitted model evidence. The Technical Lead records the alignment decision.</span></div>}
      <section className="role-list-panel"><div className="role-panel-head"><div><span className="role-eyebrow">ALIGNMENT RECORDS</span><h3>Sprint-cycle evidence</h3></div><span className="role-count">{latestByRelease.length} records</span></div>
        {latestByRelease.length?latestByRelease.map((item,index)=><article className="role-record tp-case-record" key={item.id}>
          <details className="tp-case-disclosure" ref={element=>{
            if(element&&!element.dataset.initialized){
              element.dataset.initialized='true';
              element.open=role==='lead'&&index===0;
            }
          }} onToggle={event=>{
            const expanded=event.currentTarget.open;
            setExpandedAlignments(prev=>prev[item.id]===expanded?prev:{...prev,[item.id]:expanded});
          }}>
            <summary className="tp-case-summary">
              <div className="role-record-heading"><div><span className="role-eyebrow">{item.release} · CYCLE {item.cycle} · {item.service}</span><h4>{item.result.engine.toUpperCase()} capacity assessment · {item.rps} RPS</h4><small>Submitted {date(item.createdAt)}</small></div><StateTag value={item.status}/></div>
              <div className="tp-case-preview"><Outcome verdict={item.result.verdict}/><span>Bottleneck: {item.result.bottleneck??'None'}</span><span className="tp-case-open">View case details <ChevronDown size={17}/></span></div>
            </summary>
            <div className="tp-case-body">
              <div className="role-verdict-strip"><Outcome verdict={item.result.verdict}/><span>Limiting resource: <strong>{item.result.bottleneck??'None'}</strong></span></div>
          <p className="tp-verdict-narrative">{item.result.reasons.join(' · ')}</p>
          <details className="tp-record-technical"><summary>View technical indicators</summary><div><span>CPU: {(item.result.resources.cpu.utilization*100).toFixed(1)}%</span><span>RAM: {(item.result.resources.ram.utilization*100).toFixed(1)}%</span><span>Network: {(item.result.resources.network.utilization*100).toFixed(1)}%</span></div></details>
          {item.whatIf&&item.whatIf.length>0&&<div className="tp-record-whatif">{item.whatIf.map(c=><span key={c.factor}>{c.factor}× · {c.rps} RPS · <Outcome verdict={c.verdict}/></span>)}</div>}
          {(expandedAlignments[item.id]??(role==='lead'&&index===0))&&<AlignmentScenarioReplay
            sectionId={'alignment-record-'+item.id}
            heading="Replay the submitted workload"
            cases={item.whatIf?.length?item.whatIf:[{
              factor:1,rps:item.rps,verdict:item.result.verdict,
              timeline:runs.find(r=>r.id===item.runId)?.timeline,
            }]}
            onLoadReplay={factor=>loadAlignmentReplay(item,factor)}
          />}
          <p>{item.qaNotes||'No supplementary testing notes provided.'}</p>
          {item.reviewerNote&&<p className="role-review-note"><strong>Technical review:</strong> {item.reviewerNote}</p>}
          {item.signoffNote&&<p className="role-review-note"><strong>Sign-off note:</strong> {item.signoffNote}</p>}
          {role==='lead'&&item.status==='review'&&<AlignmentDecision key={item.id} item={item} onSave={(decision,text)=>decideAlignment(item,decision,text)}/>}
          {item.status==='approved'&&<div className="role-locked"><ShieldCheck size={17}/> Demo document {item.signedVersion} · approved {item.signedAt?date(item.signedAt):''} · locked against changes through this interface</div>}
              <div className="tp-case-actions"><button type="button" onClick={()=>void downloadTwinPeakPDF({alignments:[item],incidents:[]},history())}><Download size={16}/> Download case PDF</button><Link href="/reports">Open report library <ArrowUpRight size={16}/></Link></div>
            </div>
          </details>
        </article>):<EmptyRecords message="QA can create an alignment submission from an actual simulation run. Switch to the QA persona to begin." link={role==='qa'?'/simulation':undefined} label="Run SimPy simulation"/>}
      </section>
    </>}

    {section==='incident'&&<>
      {role==='support'&&<section className="role-form-panel">
        <div className="role-panel-head"><div><span className="role-eyebrow">STEP 01 / SUPPORT ESCALATION</span><h3>Record an incident</h3></div><CircleAlert size={22}/></div>
        <p>Record a synthetic incident description and estimated peak load. This does not query Production monitoring systems.</p>
        <form onSubmit={submitIncident} className="role-form-grid">
          <label>Service<input required value={incidentService} onChange={e=>setIncidentService(e.target.value)}/></label>
          <label>Incident type<select value={incidentType} onChange={e=>setIncidentType(e.target.value)}><option>Traffic spike</option><option>Memory pressure</option><option>Batch job overlap</option><option>Response timeout</option></select></label>
          <label>Peak request rate<input type="number" min="0" max="100000" required value={incidentRps} onChange={e=>setIncidentRps(Number(e.target.value))}/></label>
          <label className="role-form-wide">Observed symptoms<textarea required rows={3} value={symptom} onChange={e=>setSymptom(e.target.value)}/></label>
          <div className="role-form-wide role-form-footer"><span>Incident escalation</span><button type="submit">Record & escalate <ArrowRight size={16}/></button></div>
        </form>
      </section>}
      {role==='engineer'&&<div className="role-review-hint"><Cpu size={19}/><span>Select an incident below. SimPy will evaluate its original server profile, then evaluate the same load with your proposed CPU capacity.</span></div>}
      <section className="role-list-panel"><div className="role-panel-head"><div><span className="role-eyebrow">INCIDENT CASES</span><h3>Safe reproduction queue</h3></div><span className="role-count">{data.incidents.length} cases</span></div>
        {data.incidents.length?data.incidents.map(item=><article key={item.id} className="role-record tp-case-record">
          <details className="tp-case-disclosure">
            <summary className="tp-case-summary">
              <div className="role-record-heading"><div><span className="role-eyebrow">{item.incidentType.toUpperCase()} · {item.service}</span><h4>{item.peakRps.toLocaleString()} RPS peak · {item.spec.cpu.cores} cores baseline</h4><small>Detected {date(item.detectedAt)}</small></div><StateTag value={item.status}/></div>
              <div className="tp-case-preview"><span>{item.symptom}</span><span className="tp-case-open">View incident <ChevronDown size={17}/></span></div>
            </summary>
            <div className="tp-case-body">
              <p>{item.symptom}</p>
          {item.before&&item.after&&<div className="role-before-after"><div><span>BEFORE · ORIGINAL CAPACITY</span><Outcome verdict={item.before.verdict}/><small>CPU {Math.round(item.before.resources.cpu.utilization*100)}% · bottleneck {item.before.bottleneck}</small></div><div><span>AFTER · CPU MITIGATION</span><Outcome verdict={item.after.verdict}/><small>{item.mitigatedCores} cores · CPU {Math.round(item.after.resources.cpu.utilization*100)}%</small></div></div>}
          <TracePreview points={item.beforeTimeline}/>
          {item.afterTimeline&&<><h4>After mitigation · recorded simulation</h4><TracePreview points={item.afterTimeline}/></>}
          {item.engineerNotes&&<p className="role-review-note"><strong>Engineer finding:</strong> {item.engineerNotes}</p>}
          {role==='engineer'&&<div className="role-record-actions">
            {selectedIncident===item.id&&<div className="role-investigation-form"><label>Mitigation CPU cores<input type="number" min="1" step="1" value={mitigationCores} onChange={e=>setMitigationCores(Number(e.target.value))}/></label><label>Investigation note<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe the modeled mitigation and observation"/></label></div>}
            <div>{selectedIncident!==item.id?<button onClick={()=>setSelectedIncident(item.id)}><GitCompareArrows size={17}/> Test mitigation</button>:<button onClick={()=>investigate(item)} disabled={busy===item.id}>{busy===item.id?'Running SimPy…':'Run before / after SimPy'} <Play size={16}/></button>}</div>
          </div>}
              <div className="tp-case-actions"><button type="button" onClick={()=>void downloadTwinPeakPDF({alignments:[],incidents:[item]},[])}><Download size={16}/> Download incident PDF</button></div>
            </div>
          </details>
        </article>):<EmptyRecords message="Support & Monitoring can record a synthetic incident. Switch to that persona to populate the escalation queue."/>}
      </section>
    </>}

    {section==='signoff'&&<section className="role-list-panel"><div className="role-panel-head"><div><span className="role-eyebrow">MANAGER DECISION QUEUE</span><h3>Release sign-off documents</h3></div><span className="role-count">{data.alignments.filter(item=>item.status==='pending-signoff').length} pending</span></div>
      {data.alignments.some(x=>x.status==='pending-signoff'||x.status==='approved'||x.status==='rejected')?data.alignments.filter(x=>['pending-signoff','approved','rejected'].includes(x.status)).map(item=><article className="role-record tp-case-record" key={item.id}>
        <details className="tp-case-disclosure">
          <summary className="tp-case-summary">
            <div className="role-record-heading"><div><span className="role-eyebrow">{item.release} / CYCLE {item.cycle}</span><h4>{item.service}</h4><small>Technical review {item.reviewedAt?date(item.reviewedAt):'—'}</small></div><StateTag value={item.status}/></div>
            <div className="tp-case-preview"><Outcome verdict={item.result.verdict}/><span>{item.rps} RPS</span><span className="tp-case-open">View sign-off <ChevronDown size={17}/></span></div>
          </summary>
          <div className="tp-case-body">
            <div className="role-verdict-strip"><Outcome verdict={item.result.verdict}/><span>{item.rps} RPS</span><span>CPU {(item.result.resources.cpu.utilization*100).toFixed(1)}%</span><span>Bottleneck: {item.result.bottleneck??'None'}</span></div>
            <TracePreview points={item.whatIf?.find(x=>x.factor===1)?.timeline??runs.find(r=>r.id===item.runId)?.timeline}/>
        <p><strong>Technical review:</strong> {item.reviewerNote||'No additional note recorded.'}</p>
        {item.signoffNote&&<p className="role-review-note"><strong>Manager note:</strong> {item.signoffNote}</p>}
        {item.status==='pending-signoff'&&role==='manager'&&<div className="role-record-actions"><textarea value={note} onChange={e=>setNote(e.target.value)} aria-label="Sign-off review note" placeholder="Decision rationale and conditions (recommended)"/><div><button className="role-secondary-button" onClick={()=>signOff(item,'rejected')}>Reject sign-off</button><button onClick={()=>signOff(item,'approved')}>Approve sign-off <CheckCircle2 size={16}/></button></div></div>}
        {item.status==='approved'&&<div className="role-locked"><ShieldCheck size={18}/> Signed document {item.signedVersion} · {item.signedAt?date(item.signedAt):''}. Approval recorded in the release review.</div>}
            <div className="tp-case-actions"><button type="button" onClick={()=>void downloadTwinPeakPDF({alignments:[item],incidents:[]},history())}><Download size={16}/> Download sign-off PDF</button><Link href="/reports">Open report library <ArrowUpRight size={16}/></Link></div>
          </div>
        </details>
      </article>):<EmptyRecords message="No sign-off candidate yet. QA must submit a real simulation, and the Technical Lead must forward the recommendation before the Manager can decide."/>}
    </section>}
  </div>;
}
