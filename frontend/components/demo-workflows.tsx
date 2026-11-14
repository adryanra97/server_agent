'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, ClipboardCheck,
  Clock3, Cpu, FileText, GitCompareArrows, Info, Play, ShieldCheck, Waves,
} from 'lucide-react';
import { requestVerdict, history, defaultLoad, defaultSpec, type HistoryItem } from '../lib/model';
import {
  demoRecords, saveAlignment, saveIncident, getPersona,
  type DemoRole, type DemoRecords, type DemoAlignment, type DemoIncident,
} from '../lib/demo';
import { Outcome } from './ui';

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
export default function DemoWorkflows({role,section}:{role:DemoRole;section:Section}){
  const data=useDemoRecords();
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [release,setRelease]=useState('RC-01');
  const [cycle,setCycle]=useState(1);
  const [service,setService]=useState('Integration Gateway');
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
    if(role!=='qa'||!selectedRun){setMessage('Run a real SimPy evaluation first, then select its result.');return;}
    if(!note.trim()){setMessage('Add a brief QA test summary before submitting the release candidate.');return;}
    const stamp=now();
    saveAlignment({
      id:crypto.randomUUID(),type:'alignment',createdAt:stamp,updatedAt:stamp,
      release:release.trim(),cycle,service:service.trim(),qaNotes:note.trim(),
      createdBy:role,status:'review',runId:selectedRun.id,
      result:selectedRun.result,rps:selectedRun.request.load.rps,
    });
    setNote('');
    setMessage('The alignment evidence is now available to the Technical Lead in this browser.');
  }
  function decideAlignment(item:DemoAlignment,status:'returned'|'pending-signoff'){
    if(role!=='lead'||item.status!=='review')return;
    if(!note.trim()){setMessage('Add a Technical Lead review note before recording your decision.');return;}
    if(status==='pending-signoff'&&item.result.verdict==='will_crash'){
      setMessage('This modeled scenario exceeds capacity. Return it to Dev for another cycle.');return;
    }
    const stamp=now();
    saveAlignment({...item,status,reviewerNote:note.trim(),reviewedAt:stamp,updatedAt:stamp});
    setNote('');setMessage(status==='returned'?'Cycle returned to Development for iteration.':'Technical recommendation sent to the Manager sign-off queue.');
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
      const before=await requestVerdict({engine:'simpy',spec:item.spec,load:item.load});
      const after=await requestVerdict({
        engine:'simpy',
        spec:{...item.spec,cpu:{...item.spec.cpu,cores:mitigationCores}},
        load:item.load,
      });
      const stamp=now();
      saveIncident({...item,status:after.verdict==='will_crash'?'escalated':'analyzed',
        before,after,mitigatedCores:mitigationCores,engineerNotes:note.trim(),analyzedAt:stamp,updatedAt:stamp});
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
    <div className="role-workflow-banner"><Info size={18}/><p><strong>Interactive local prototype.</strong> Role-based workflow records are stored in this browser. Capacity verdicts come from the real copdash SimPy engine. This does not authorize production deployment or replace SIT/UAT.</p></div>
    {message&&<div className="role-workflow-message" role="status"><Info size={18}/>{message}</div>}

    {section==='alignment'&&<>
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
      {role==='lead'&&<div className="role-review-hint"><ClipboardCheck size={19}/><span>Review submitted model evidence. Only the Technical Lead can record the demo alignment decision.</span></div>}
      <section className="role-list-panel"><div className="role-panel-head"><div><span className="role-eyebrow">ALIGNMENT RECORDS</span><h3>Sprint-cycle evidence</h3></div><span className="role-count">{latestByRelease.length} records</span></div>
        {latestByRelease.length?latestByRelease.map(item=><article className="role-record" key={item.id}>
          <div className="role-record-heading"><div><span className="role-eyebrow">{item.release} · CYCLE {item.cycle} · {item.service}</span><h4>{item.result.engine.toUpperCase()} capacity assessment · {item.rps} RPS</h4><small>Submitted {date(item.createdAt)}</small></div><StateTag value={item.status}/></div>
          <div className="role-verdict-strip"><Outcome verdict={item.result.verdict}/><span>Bottleneck: <strong>{item.result.bottleneck??'None'}</strong></span><span>CPU: <strong>{(item.result.resources.cpu.utilization*100).toFixed(1)}%</strong></span><span>RAM: <strong>{(item.result.resources.ram.utilization*100).toFixed(1)}%</strong></span></div>
          <p>{item.qaNotes||'No supplementary testing notes provided.'}</p>
          {item.reviewerNote&&<p className="role-review-note"><strong>Technical review:</strong> {item.reviewerNote}</p>}
          {item.signoffNote&&<p className="role-review-note"><strong>Sign-off note:</strong> {item.signoffNote}</p>}
          {role==='lead'&&item.status==='review'&&<div className="role-record-actions"><textarea aria-label="Technical review note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Record review justification and next-cycle actions"/><div><button className="role-secondary-button" onClick={()=>decideAlignment(item,'returned')}>Return to Dev</button><button onClick={()=>decideAlignment(item,'pending-signoff')} disabled={item.result.verdict==='will_crash'}>Forward for sign-off <ArrowRight size={16}/></button></div>{item.result.verdict==='will_crash'&&<small>Modeled overload: this demo does not allow forwarding a will_crash verdict.</small>}</div>}
          {item.status==='approved'&&<div className="role-locked"><ShieldCheck size={17}/> Demo document {item.signedVersion} · approved {item.signedAt?date(item.signedAt):''} · locked against changes through this interface</div>}
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
          <div className="role-form-wide role-form-footer"><span>Browser-local escalation</span><button type="submit">Record & escalate <ArrowRight size={16}/></button></div>
        </form>
      </section>}
      {role==='engineer'&&<div className="role-review-hint"><Cpu size={19}/><span>Select an incident below. SimPy will evaluate its original server profile, then evaluate the same load with your proposed CPU capacity.</span></div>}
      <section className="role-list-panel"><div className="role-panel-head"><div><span className="role-eyebrow">INCIDENT CASES</span><h3>Safe reproduction queue</h3></div><span className="role-count">{data.incidents.length} cases</span></div>
        {data.incidents.length?data.incidents.map(item=><article key={item.id} className="role-record">
          <div className="role-record-heading"><div><span className="role-eyebrow">{item.incidentType.toUpperCase()} · {item.service}</span><h4>{item.peakRps.toLocaleString()} RPS peak · {item.spec.cpu.cores} cores baseline</h4><small>Detected {date(item.detectedAt)}</small></div><StateTag value={item.status}/></div>
          <p>{item.symptom}</p>
          {item.before&&item.after&&<div className="role-before-after"><div><span>BEFORE · ORIGINAL CAPACITY</span><Outcome verdict={item.before.verdict}/><small>CPU {Math.round(item.before.resources.cpu.utilization*100)}% · bottleneck {item.before.bottleneck}</small></div><div><span>AFTER · CPU MITIGATION</span><Outcome verdict={item.after.verdict}/><small>{item.mitigatedCores} cores · CPU {Math.round(item.after.resources.cpu.utilization*100)}%</small></div></div>}
          {item.engineerNotes&&<p className="role-review-note"><strong>Engineer finding:</strong> {item.engineerNotes}</p>}
          {role==='engineer'&&<div className="role-record-actions">
            {selectedIncident===item.id&&<div className="role-investigation-form"><label>Mitigation CPU cores<input type="number" min="1" step="1" value={mitigationCores} onChange={e=>setMitigationCores(Number(e.target.value))}/></label><label>Investigation note<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe the modeled mitigation and observation"/></label></div>}
            <div>{selectedIncident!==item.id?<button onClick={()=>setSelectedIncident(item.id)}><GitCompareArrows size={17}/> Test mitigation</button>:<button onClick={()=>investigate(item)} disabled={busy===item.id}>{busy===item.id?'Running SimPy…':'Run before / after SimPy'} <Play size={16}/></button>}</div>
          </div>}
        </article>):<EmptyRecords message="Support & Monitoring can record a synthetic incident. Switch to that persona to populate the escalation queue."/>}
      </section>
    </>}

    {section==='signoff'&&<section className="role-list-panel"><div className="role-panel-head"><div><span className="role-eyebrow">MANAGER DECISION QUEUE</span><h3>Release sign-off documents</h3></div><span className="role-count">{data.alignments.filter(item=>item.status==='pending-signoff').length} pending</span></div>
      {data.alignments.some(x=>x.status==='pending-signoff'||x.status==='approved'||x.status==='rejected')?data.alignments.filter(x=>['pending-signoff','approved','rejected'].includes(x.status)).map(item=><article className="role-record" key={item.id}>
        <div className="role-record-heading"><div><span className="role-eyebrow">{item.release} / CYCLE {item.cycle}</span><h4>{item.service}</h4><small>Technical review {item.reviewedAt?date(item.reviewedAt):'—'}</small></div><StateTag value={item.status}/></div>
        <div className="role-verdict-strip"><Outcome verdict={item.result.verdict}/><span>{item.rps} RPS</span><span>CPU {(item.result.resources.cpu.utilization*100).toFixed(1)}%</span><span>Bottleneck: {item.result.bottleneck??'None'}</span></div>
        <p><strong>Technical review:</strong> {item.reviewerNote||'No additional note recorded.'}</p>
        {item.signoffNote&&<p className="role-review-note"><strong>Manager note:</strong> {item.signoffNote}</p>}
        {item.status==='pending-signoff'&&role==='manager'&&<div className="role-record-actions"><textarea value={note} onChange={e=>setNote(e.target.value)} aria-label="Sign-off review note" placeholder="Decision rationale and conditions (recommended)"/><div><button className="role-secondary-button" onClick={()=>signOff(item,'rejected')}>Reject sign-off</button><button onClick={()=>signOff(item,'approved')}>Approve sign-off <CheckCircle2 size={16}/></button></div></div>}
        {item.status==='approved'&&<div className="role-locked"><ShieldCheck size={18}/> Signed document {item.signedVersion} · {item.signedAt?date(item.signedAt):''}. Demo-only approval; no deployment triggered.</div>}
      </article>):<EmptyRecords message="No sign-off candidate yet. QA must submit a real simulation, and the Technical Lead must forward the recommendation before the Manager can decide."/>}
    </section>}
  </div>;
}
