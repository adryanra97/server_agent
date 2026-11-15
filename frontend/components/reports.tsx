'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, FileClock, Filter, Search } from 'lucide-react';
import { csvHistory, history, type HistoryItem } from '../lib/model';
import { Empty, Outcome, SectionHead } from './ui';
import { downloadTwinPeakPDF } from '../lib/report-pdf';
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
      const response=await fetch('/api/reasoning',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind:'report',service:first?.service??'QRIS Payment',
          rps:first?.rps??0,verdict:first?.result.verdict??'not_assessable',
          summary:first?.result.reasons.join(' · ')??'No alignment evidence selected.',
          notes:first?.reviewerNote??first?.qaNotes??''}),
      });
      if(!response.ok)throw Error('Unavailable');
      const data=await response.json() as {text?:string;generated?:boolean};
      if(!data.text)throw Error('Empty explanation');
      setInsight({text:data.text,generated:!!data.generated});
    }catch{setReportNotice('Additional explanation is not available right now. Existing report evidence can still be exported.');}
    finally{setAiBusy(false);}
  }
  const current=runs.find(r=>r.id===selected);
  return <div className="page-stack">
    <div className="report-cards"><div className="panel summary-tile"><span className="kicker">TOTAL RUNS</span><strong>{runs.length}</strong><p>Completed capacity evaluations</p></div><div className="panel summary-tile"><span className="kicker">RULES ENGINE</span><strong>{runs.filter(x=>x.result.engine==='rules').length}</strong><p>Deterministic model evaluations</p></div><div className="panel summary-tile"><span className="kicker">SIMPY ENGINE</span><strong>{runs.filter(x=>x.result.engine==='simpy').length}</strong><p>Discrete-event model evaluations</p></div></div>
    <section className="tp-report-library" aria-label="Release and incident report library">
      <div className="tp-panel-heading"><div><span>01 / REPORT LIBRARY</span><h3>Find the evidence. Export the report.</h3><p>Filter release decisions and incident investigations by service, type, cycle or date.</p></div><Download size={24}/></div>
      <div className="tp-report-filters">
        <label>Report type<select value={reportType} onChange={e=>setReportType(e.target.value)}><option value="all">All reports</option><option value="alignment">Release alignment</option><option value="incident">Incident assessment</option></select></label>
        <label>Service<input value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} placeholder="Search service"/></label>
        <label>Cycle<input value={cycleQuery} onChange={e=>setCycleQuery(e.target.value)} placeholder="e.g. 3"/></label>
        <label>Date<input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)}/></label>
      </div>
      <div className="tp-report-summary"><div><span>MATCHING RECORDS</span><strong>{reportCount}</strong><small>{filteredWorkflows.alignments.length} alignments · {filteredWorkflows.incidents.length} incidents</small></div>
        <div className="tp-report-actions">{canDownload&&<>
          <button type="button" disabled={!reportCount&&!filtered.length} onClick={()=>void makePdf()}><Download size={17}/> Download PDF</button>
          <button type="button" disabled={!reportCount||aiBusy} className="tp-outline-action" onClick={()=>void explainReport()}>{aiBusy?'Analyzing…':'Add narrative'}</button>
          <button type="button" disabled={!reportCount} className="tp-outline-action" onClick={()=>demoCsv(filteredWorkflows)}><Download size={17}/> CSV</button>
        </>}</div>
      </div>
      <div className="tp-report-result-list">{[
        ...filteredWorkflows.alignments.map(x=>({key:x.id,title:x.service+' · '+x.release,meta:'Cycle '+x.cycle+' · '+x.rps+' RPS',status:x.status,kind:'Release alignment',date:x.createdAt})),
        ...filteredWorkflows.incidents.map(x=>({key:x.id,title:x.service+' · '+x.incidentType,meta:x.peakRps+' RPS peak',status:x.status,kind:'Incident',date:x.createdAt})),
      ].sort((a,b)=>b.date.localeCompare(a.date)).map(x=><div key={x.key} className="tp-report-result">
        <div><strong>{x.title}</strong><small>{x.kind} · {x.meta}</small></div>
        <span>{x.status.replaceAll('-',' ')}</span><time>{new Date(x.date).toLocaleDateString()}</time>
      </div>)}
        {!reportCount&&<div className="tp-report-empty">No records match your filters. Try another service or date.</div>}
      </div>
      {insight&&<div className="tp-report-insight"><strong>{insight.generated?'AI-assisted report narrative':'Report interpretation'}</strong><p>{insight.text}</p></div>}
      {reportNotice&&<p className="tp-error" role="status">{reportNotice}</p>}
    </section>
    <section className="panel report-list-panel"><SectionHead eyebrow="CAPACITY EVALUATIONS" title="Saved evaluations" action={<button className="btn btn-outline btn-small" disabled={!filtered.length} onClick={()=>csvHistory(filtered)}><Download size={15}/>Export CSV</button>}/>
      <div className="report-toolbar"><label className="search-field"><Search size={15}/><input aria-label="Search runs" placeholder="Search runs..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-select"><Filter size={15}/><select aria-label="Filter by verdict" value={verdict} onChange={e=>setVerdict(e.target.value)}><option value="all">All verdicts</option><option value="will_survive">Will survive</option><option value="at_risk">At risk</option><option value="will_crash">Will crash</option></select></label></div>
      {filtered.length?<div className="reports-table"><div className="report-row report-row-heading"><span>EVALUATION</span><span>ENGINE</span><span>RPS</span><span>VERDICT</span><span>DATE</span></div>{filtered.map(r=><div key={r.id}><button className="report-row report-data-row" onClick={()=>setSelected(selected===r.id?null:r.id)} aria-expanded={selected===r.id}><span><strong>{r.label}</strong><small>{r.id.slice(0,8)}</small></span><span className="engine-tag">{r.result.engine.toUpperCase()}</span><span>{r.request.load.rps}</span><span><Outcome verdict={r.result.verdict}/></span><span>{new Date(r.created_at).toLocaleDateString()}</span></button>{selected===r.id&&<div className="report-expanded"><div><span className="kicker">CPU UTILIZATION</span><strong>{(r.result.resources.cpu.utilization*100).toFixed(1)}%</strong></div><div><span className="kicker">BOTTLENECK</span><strong>{r.result.bottleneck??'none'}</strong></div><div><span className="kicker">CONFIDENCE HEURISTIC</span><strong>{(r.result.confidence*100).toFixed(0)}%</strong></div><p>{r.result.reasons.join(' · ')}</p></div>}</div>)}</div>:<Empty title="No results yet" description={runs.length?'Try changing the filters.':'Run a capacity evaluation to see your first result here.'}/>}
      {!runs.length&&<div className="center-actions"><Link href="/simulation" className="btn btn-primary">Evaluate your first server <ArrowRight size={16}/></Link></div>}
    </section>
    <section className="role-list-panel sa-report-workflows">
      <div className="role-panel-head"><div><span className="role-eyebrow">UC-03 / ROLE-WORKFLOW RECORDS</span><h3>Decision and incident history</h3><p>Review release alignment decisions and incident assessments.</p></div>
        {role==='support'&&<button type="button" className="role-export-button" onClick={()=>demoCsv(workflow)} disabled={!workflow.alignments.length&&!workflow.incidents.length}><Download size={17}/> Export workflow CSV</button>}
      </div>
      <div className="sa-report-record-stats"><div><span>ALIGNMENTS</span><strong>{workflow.alignments.length}</strong></div><div><span>INCIDENTS</span><strong>{workflow.incidents.length}</strong></div><div><span>APPROVED SIGN-OFFS</span><strong>{workflow.alignments.filter(x=>x.status==='approved').length}</strong></div></div>
      {(workflow.alignments.length+workflow.incidents.length)>0?<div className="sa-report-event-list">
        {[...workflow.alignments.map(item=>({id:item.id,date:item.updatedAt,name:item.release+' · '+item.service,type:'Alignment',status:item.status,desc:'Cycle '+item.cycle+' · '+item.rps+' RPS'})),
          ...workflow.incidents.map(item=>({id:item.id,date:item.updatedAt,name:item.incidentType+' · '+item.service,type:'Incident',status:item.status,desc:item.peakRps+' RPS · '+item.service}))]
          .sort((a,b)=>b.date.localeCompare(a.date)).map(item=><div className="sa-report-event" key={item.id}><div><span className="role-eyebrow">{item.type.toUpperCase()}</span><strong>{item.name}</strong><small>{item.desc}</small></div><span className={'role-state role-state-'+item.status}>{item.status.replaceAll('-',' ')}</span><time>{new Date(item.date).toLocaleDateString()}</time></div>)}
      </div>:<div className="role-empty"><FileClock size={26}/><strong>No workflow records yet.</strong><p>Open a relevant workflow to create your first record.</p></div>}
    </section>
  </div>;
}
