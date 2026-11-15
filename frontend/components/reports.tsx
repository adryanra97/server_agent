'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Download, FileClock, Filter, Search } from 'lucide-react';
import { csvHistory, history, type HistoryItem } from '../lib/model';
import { Empty, Outcome, SectionHead } from './ui';
import { downloadTwinPeakPDF } from '../lib/report-pdf';
import TracePreview from './trace-preview';
import { requestReasoning } from '../lib/llm-session';
import { demoRecords, demoCsv, getDemoRole, type DemoRecords } from '../lib/demo';
export default function Reports(){
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [workflow,setWorkflow]=useState<DemoRecords>({alignments:[],incidents:[]});
  const [role,setRole]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [verdict,setVerdict]=useState('all');
  const [reportType,setReportType]=useState('all');
  const [serviceQuery,setServiceQuery]=useState('');
  const [cycleQuery,setCycleQuery]=useState('');
  const [reportDate,setReportDate]=useState('');
  const [insight,setInsight]=useState<{text:string;generated:boolean}|null>(null);
  const [aiBusy,setAiBusy]=useState(false);
  const [reportNotice,setReportNotice]=useState('');
  useEffect(()=>{const update=()=>{setRuns(history());setWorkflow(demoRecords());setRole(getDemoRole())};update();window.addEventListener('serveragent-history',update);window.addEventListener('serveragent-demo-records',update);return()=>{window.removeEventListener('serveragent-history',update);window.removeEventListener('serveragent-demo-records',update)}},[]);
  const filtered=useMemo(()=>runs.filter(r=>(verdict==='all'||r.result.verdict===verdict)&&(`${r.label} ${r.result.engine} ${r.result.bottleneck}`.toLowerCase().includes(query.toLowerCase()))),[runs,query,verdict]);
  const filteredWorkflows=useMemo(()=>{
    const match=(type:'alignment'|'incident',service:string,cycle:string,date:string)=>{
      return (reportType==='all'||reportType===type)&&
        service.toLowerCase().includes(serviceQuery.toLowerCase().trim())&&
        (!cycleQuery||cycle.includes(cycleQuery.trim()))&&
        (!reportDate||date.slice(0,10)===reportDate);
    };
    return {
      alignments:workflow.alignments.filter(x=>match('alignment',x.service,String(x.cycle),x.createdAt)),
      incidents:workflow.incidents.filter(x=>match('incident',x.service,'',x.createdAt)),
    };
  },[workflow,reportType,serviceQuery,cycleQuery,reportDate]);
  const reportCount=filteredWorkflows.alignments.length+filteredWorkflows.incidents.length;
  const canDownload=role==='support'||role==='manager'||role==='lead';
  async function makePdf(){
    try{setReportNotice('');await downloadTwinPeakPDF(filteredWorkflows,filtered,insight??undefined);}
    catch{setReportNotice('PDF export is unavailable. Please retry.');}
  }
  async function explainReport(){
    setAiBusy(true);setReportNotice('');
    try{
      const first=filteredWorkflows.alignments[0];
      const data=await requestReasoning({
        kind:'report',service:first?.service??'QRIS Payment',
        rps:first?.rps??0,verdict:first?.result.verdict??'not_assessable',
        summary:first?.result.reasons.join(' · ')??'No alignment evidence selected.',
        notes:first?.reviewerNote??first?.qaNotes??'',
      });
      if(!data.text)throw Error('Empty explanation');
      setInsight({text:data.text,generated:!!data.generated});
    }catch{setReportNotice('Additional explanation is not available right now. Existing report evidence can still be exported.');}
    finally{setAiBusy(false);}
  }
  const current=runs.find(r=>r.id===selected);
  return <div className="page-stack">
    <div className="report-cards"><div className="panel summary-tile"><span className="kicker">TOTAL RUNS</span><strong>{runs.length}</strong><p>Completed capacity evaluations</p></div><div className="panel summary-tile"><span className="kicker">RULES ENGINE</span><strong>{runs.filter(x=>x.result.engine==='rules').length}</strong><p>Deterministic model evaluations</p></div><div className="panel summary-tile"><span className="kicker">SIMPY ENGINE</span><strong>{runs.filter(x=>x.result.engine==='simpy').length}</strong><p>Discrete-event model evaluations</p></div></div>
    <section className="tp-report-library" aria-label="Release and incident report library">
      <div className="tp-panel-heading"><div><span>01 / REPORT LIBRARY</span><h3>Find the evidence. Export the report.</h3><p>Filter by service, type, cycle, or date. PDF reports include real SimPy trend charts when a recorded timeline is available.</p></div><Download size={24}/></div>
      <div className="tp-report-filters">
        <label>Report type<select value={reportType} onChange={e=>setReportType(e.target.value)}><option value="all">All reports</option><option value="alignment">Release alignment</option><option value="incident">Incident assessment</option></select></label>
        <label>Service<input value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} placeholder="Search service"/></label>
        <label>Cycle<input value={cycleQuery} onChange={e=>setCycleQuery(e.target.value)} placeholder="e.g. 3"/></label>
        <label>Date<input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)}/></label>
      </div>
      <div className="tp-report-summary"><div><span>MATCHING RECORDS</span><strong>{reportCount}</strong><small>{filteredWorkflows.alignments.length} alignments · {filteredWorkflows.incidents.length} incidents</small></div>
        <div className="tp-report-actions">{canDownload&&<>
          <button type="button" disabled={!reportCount&&!filtered.length} onClick={()=>void makePdf()}><Download size={17}/> Download PDF</button>
          <button type="button" disabled={!reportCount||aiBusy} className="tp-outline-action" onClick={()=>void explainReport()}>{aiBusy?'Analyzing…':'Add explanation'}</button>
          <button type="button" disabled={!reportCount} className="tp-outline-action" onClick={()=>demoCsv(filteredWorkflows)}><Download size={17}/> CSV</button>
        </>}</div>
      </div>
      <div className="tp-report-result-list">{[
        ...filteredWorkflows.alignments.map(item=>({key:item.id,entry:item,kind:'alignment' as const,title:item.service+' · '+item.release,meta:'Cycle '+item.cycle+' · '+item.rps+' RPS',status:item.status,date:item.createdAt})),
        ...filteredWorkflows.incidents.map(item=>({key:item.id,entry:item,kind:'incident' as const,title:item.service+' · '+item.incidentType,meta:item.peakRps+' RPS peak',status:item.status,date:item.createdAt})),
      ].sort((a,b)=>b.date.localeCompare(a.date)).map(x=><details key={x.key} className="tp-report-entry">
        <summary className="tp-report-result"><div><strong>{x.title}</strong><small>{x.kind==='alignment'?'Release alignment':'Incident'} · {x.meta}</small></div>
          <span>{x.status.replaceAll('-',' ')}</span><time>{new Date(x.date).toLocaleDateString()}</time><ChevronDown className="tp-expand-icon" size={18}/></summary>
        <div className="tp-report-entry-body">
          {x.kind==='alignment'?<>
            <div className="tp-entry-verdict"><Outcome verdict={x.entry.result.verdict}/><span>Limiting resource: {x.entry.result.bottleneck??'none'}</span></div>
            <p><strong>Model assessment:</strong> {x.entry.result.reasons.join(' · ')}</p>
            <p><strong>QA notes:</strong> {x.entry.qaNotes}</p>
            {x.entry.reviewerNote&&<p><strong>Technical Lead:</strong> {x.entry.reviewerNote}</p>}
            {x.entry.signoffNote&&<p><strong>Manager:</strong> {x.entry.signoffNote}</p>}
            <TracePreview points={x.entry.whatIf?.find(c=>c.factor===1)?.timeline??runs.find(r=>r.id===x.entry.runId)?.timeline}/>
            <button type="button" className="tp-entry-download" onClick={()=>void downloadTwinPeakPDF({alignments:[x.entry],incidents:[]},runs.filter(r=>r.id===x.entry.runId))}><Download size={16}/> Download this case as PDF</button>
          </>:<>
            <p><strong>Reported symptoms:</strong> {x.entry.symptom}</p>
            <p><strong>Peak traffic:</strong> {x.entry.peakRps} RPS · {x.entry.spec.cpu.cores} baseline CPU cores</p>
            {x.entry.before&&<p><strong>Before mitigation:</strong> {x.entry.before.verdict} · CPU {(x.entry.before.resources.cpu.utilization*100).toFixed(1)}%</p>}
            {x.entry.after&&<p><strong>After mitigation:</strong> {x.entry.after.verdict} · CPU {(x.entry.after.resources.cpu.utilization*100).toFixed(1)}%</p>}
            {x.entry.engineerNotes&&<p><strong>Engineer notes:</strong> {x.entry.engineerNotes}</p>}
            <TracePreview points={x.entry.beforeTimeline}/>
            {x.entry.afterTimeline&&<><h4>After mitigation</h4><TracePreview points={x.entry.afterTimeline}/></>}
            <button type="button" className="tp-entry-download" onClick={()=>void downloadTwinPeakPDF({alignments:[],incidents:[x.entry]},[])}><Download size={16}/> Download this incident as PDF</button>
          </>}
        </div>
      </details>)}
        {!reportCount&&<div className="tp-report-empty">No records match your filters. Try another service or date.</div>}
      </div>
      {insight&&<div className="tp-report-insight"><strong>{insight.generated?'AI-assisted report narrative':'Report interpretation'}</strong><p>{insight.text}</p></div>}
      {reportNotice&&<p className="tp-error" role="status">{reportNotice}</p>}
    </section>
    <section className="panel report-list-panel"><SectionHead eyebrow="CAPACITY EVALUATIONS" title="Saved evaluations" action={<button className="btn btn-outline btn-small" disabled={!filtered.length} onClick={()=>csvHistory(filtered)}><Download size={15}/>Export CSV</button>}/>
      <div className="report-toolbar"><label className="search-field"><Search size={15}/><input aria-label="Search runs" placeholder="Search runs..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-select"><Filter size={15}/><select aria-label="Filter by verdict" value={verdict} onChange={e=>setVerdict(e.target.value)}><option value="all">All verdicts</option><option value="will_survive">Will survive</option><option value="at_risk">At risk</option><option value="will_crash">Will crash</option></select></label></div>
      {filtered.length?<div className="reports-table"><div className="report-row report-row-heading"><span>EVALUATION</span><span>ENGINE</span><span>RPS</span><span>VERDICT</span><span>DATE</span></div>{filtered.map(r=><div key={r.id}><button className="report-row report-data-row" onClick={()=>setSelected(selected===r.id?null:r.id)} aria-expanded={selected===r.id}><span><strong>{r.label}</strong><small>{r.id.slice(0,8)}</small></span><span className="engine-tag">{r.result.engine.toUpperCase()}</span><span>{r.request.load.rps}</span><span><Outcome verdict={r.result.verdict}/></span><span>{new Date(r.created_at).toLocaleDateString()} <ChevronDown className="tp-expand-icon" size={15}/></span></button>{selected===r.id&&<div className="report-expanded"><div><span className="kicker">CPU UTILIZATION</span><strong>{(r.result.resources.cpu.utilization*100).toFixed(1)}%</strong></div><div><span className="kicker">BOTTLENECK</span><strong>{r.result.bottleneck??'none'}</strong></div><div><span className="kicker">CONFIDENCE HEURISTIC</span><strong>{(r.result.confidence*100).toFixed(0)}%</strong></div><p>{r.result.reasons.join(' · ')}</p><div className="tp-history-trace"><TracePreview points={r.timeline}/></div><button className="tp-entry-download" type="button" onClick={()=>void downloadTwinPeakPDF({alignments:[],incidents:[]},[r])}><Download size={16}/> Download evaluation PDF</button></div>}</div>)}</div>:<Empty title="No results yet" description={runs.length?'Try changing the filters.':'Run a capacity evaluation to see your first result here.'}/>}
      {!runs.length&&<div className="center-actions"><Link href="/simulation" className="btn btn-primary">Evaluate your first server <ArrowRight size={16}/></Link></div>}
    </section>
    <section className="role-list-panel sa-report-workflows">
      <div className="role-panel-head"><div><span className="role-eyebrow">UC-03 / ROLE-WORKFLOW RECORDS</span><h3>Decision and incident history</h3><p>Review release alignment decisions and incident assessments.</p></div>
        {role==='support'&&<button type="button" className="role-export-button" onClick={()=>demoCsv(workflow)} disabled={!workflow.alignments.length&&!workflow.incidents.length}><Download size={17}/> Export workflow CSV</button>}
      </div>
      <div className="sa-report-record-stats"><div><span>ALIGNMENTS</span><strong>{workflow.alignments.length}</strong></div><div><span>INCIDENTS</span><strong>{workflow.incidents.length}</strong></div><div><span>APPROVED SIGN-OFFS</span><strong>{workflow.alignments.filter(x=>x.status==='approved').length}</strong></div></div>
      {(workflow.alignments.length+workflow.incidents.length)>0?<div className="sa-report-event-list">
        {[...workflow.alignments.map(item=>({id:item.id,entry:item,kind:'alignment' as const,date:item.updatedAt,name:item.release+' · '+item.service,status:item.status,desc:'Cycle '+item.cycle+' · '+item.rps+' RPS'})),
          ...workflow.incidents.map(item=>({id:item.id,entry:item,kind:'incident' as const,date:item.updatedAt,name:item.incidentType+' · '+item.service,status:item.status,desc:item.peakRps+' RPS · '+item.service}))]
          .sort((a,b)=>b.date.localeCompare(a.date)).map(item=><details className="tp-workflow-entry" key={item.id}>
            <summary className="sa-report-event"><div><span className="role-eyebrow">{item.kind.toUpperCase()}</span><strong>{item.name}</strong><small>{item.desc}</small></div><span className={'role-state role-state-'+item.status}>{item.status.replaceAll('-',' ')}</span><time>{new Date(item.date).toLocaleDateString()}</time><ChevronDown className="tp-expand-icon" size={17}/></summary>
            <div className="tp-report-entry-body">
              {item.kind==='alignment'?<>
                <div className="tp-entry-verdict"><Outcome verdict={item.entry.result.verdict}/><span>Cycle {item.entry.cycle} · {item.entry.rps} RPS</span></div>
                <p><strong>QA:</strong> {item.entry.qaNotes}</p>
                {item.entry.reviewerNote&&<p><strong>Technical Lead:</strong> {item.entry.reviewerNote}</p>}
                {item.entry.signoffNote&&<p><strong>Manager:</strong> {item.entry.signoffNote}</p>}
                <TracePreview points={item.entry.whatIf?.find(c=>c.factor===1)?.timeline}/>
              </>:<>
                <p><strong>Incident:</strong> {item.entry.symptom}</p>
                {item.entry.engineerNotes&&<p><strong>Engineering finding:</strong> {item.entry.engineerNotes}</p>}
                <TracePreview points={item.entry.beforeTimeline}/>
              </>}
            </div>
          </details>)}
      </div>:<div className="role-empty"><FileClock size={26}/><strong>No workflow records yet.</strong><p>Open a relevant workflow to create your first record.</p></div>}
    </section>
  </div>;
}
