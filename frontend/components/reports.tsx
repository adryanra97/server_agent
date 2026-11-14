'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, FileClock, Filter, Info, Search } from 'lucide-react';
import { csvHistory, history, type HistoryItem } from '../lib/model';
import { Empty, Outcome, ResourceBars, SectionHead } from './ui';
import { demoRecords, demoCsv, getDemoRole, type DemoRecords } from '../lib/demo';
export default function Reports(){
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [workflow,setWorkflow]=useState<DemoRecords>({alignments:[],incidents:[]});
  const [role,setRole]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [verdict,setVerdict]=useState('all');
  useEffect(()=>{const update=()=>{setRuns(history());setWorkflow(demoRecords());setRole(getDemoRole())};update();window.addEventListener('serveragent-history',update);window.addEventListener('serveragent-demo-records',update);return()=>{window.removeEventListener('serveragent-history',update);window.removeEventListener('serveragent-demo-records',update)}},[]);
  const filtered=useMemo(()=>runs.filter(r=>(verdict==='all'||r.result.verdict===verdict)&&(`${r.label} ${r.result.engine} ${r.result.bottleneck}`.toLowerCase().includes(query.toLowerCase()))),[runs,query,verdict]);
  const current=runs.find(r=>r.id===selected);
  return <div className="page-stack">
    <div className="notice notice-technical"><span className="notice-icon"><FileClock size={18}/></span><div><strong>This history is a website enhancement, not a copdash backend feature.</strong><span>The original API is stateless. Completed evaluations and demo role workflow records are stored only in this browser. No shared database or cloud audit log is claimed.</span></div></div>
    <div className="report-cards"><div className="panel summary-tile"><span className="kicker">TOTAL RUNS</span><strong>{runs.length}</strong><p>Completed evaluations in this browser</p></div><div className="panel summary-tile"><span className="kicker">RULES ENGINE</span><strong>{runs.filter(x=>x.result.engine==='rules').length}</strong><p>Deterministic model evaluations</p></div><div className="panel summary-tile"><span className="kicker">SIMPY ENGINE</span><strong>{runs.filter(x=>x.result.engine==='simpy').length}</strong><p>Discrete-event model evaluations</p></div></div>
    <section className="panel report-list-panel"><SectionHead eyebrow="BROWSER-LOCAL DATA" title="Saved evaluations" action={<button className="btn btn-outline btn-small" disabled={!filtered.length} onClick={()=>csvHistory(filtered)}><Download size={15}/>Export CSV</button>}/>
      <div className="report-toolbar"><label className="search-field"><Search size={15}/><input aria-label="Search runs" placeholder="Search runs..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-select"><Filter size={15}/><select aria-label="Filter by verdict" value={verdict} onChange={e=>setVerdict(e.target.value)}><option value="all">All verdicts</option><option value="will_survive">Will survive</option><option value="at_risk">At risk</option><option value="will_crash">Will crash</option></select></label></div>
      {filtered.length?<div className="reports-table"><div className="report-row report-row-heading"><span>EVALUATION</span><span>ENGINE</span><span>RPS</span><span>VERDICT</span><span>DATE</span></div>{filtered.map(r=><div key={r.id}><button className="report-row report-data-row" onClick={()=>setSelected(selected===r.id?null:r.id)} aria-expanded={selected===r.id}><span><strong>{r.label}</strong><small>{r.id.slice(0,8)}</small></span><span className="engine-tag">{r.result.engine.toUpperCase()}</span><span>{r.request.load.rps}</span><span><Outcome verdict={r.result.verdict}/></span><span>{new Date(r.created_at).toLocaleDateString()}</span></button>{selected===r.id&&<div className="report-expanded"><div><span className="kicker">CPU UTILIZATION</span><strong>{(r.result.resources.cpu.utilization*100).toFixed(1)}%</strong></div><div><span className="kicker">BOTTLENECK</span><strong>{r.result.bottleneck??'none'}</strong></div><div><span className="kicker">CONFIDENCE HEURISTIC</span><strong>{(r.result.confidence*100).toFixed(0)}%</strong></div><p>{r.result.reasons.join(' · ')}</p></div>}</div>)}</div>:<Empty title="No results yet" description={runs.length?'Try changing the filters.':'Run the actual /verdict API to save your first evaluation here.'}/>}
      {!runs.length&&<div className="center-actions"><Link href="/simulation" className="btn btn-primary">Evaluate your first server <ArrowRight size={16}/></Link></div>}
    </section>
    <section className="role-list-panel sa-report-workflows">
      <div className="role-panel-head"><div><span className="role-eyebrow">UC-03 / ROLE-WORKFLOW RECORDS</span><h3>Decision and incident history</h3><p>Demo alignment decisions and incident assessments recorded on this browser.</p></div>
        {role==='support'&&<button type="button" className="role-export-button" onClick={()=>demoCsv(workflow)} disabled={!workflow.alignments.length&&!workflow.incidents.length}><Download size={17}/> Export workflow CSV</button>}
      </div>
      <div className="sa-report-record-stats"><div><span>ALIGNMENTS</span><strong>{workflow.alignments.length}</strong></div><div><span>INCIDENTS</span><strong>{workflow.incidents.length}</strong></div><div><span>APPROVED SIGN-OFFS</span><strong>{workflow.alignments.filter(x=>x.status==='approved').length}</strong></div></div>
      {(workflow.alignments.length+workflow.incidents.length)>0?<div className="sa-report-event-list">
        {[...workflow.alignments.map(item=>({id:item.id,date:item.updatedAt,name:item.release+' · '+item.service,type:'Alignment',status:item.status,desc:'Cycle '+item.cycle+' · '+item.rps+' RPS'})),
          ...workflow.incidents.map(item=>({id:item.id,date:item.updatedAt,name:item.incidentType+' · '+item.service,type:'Incident',status:item.status,desc:item.peakRps+' RPS · '+item.service}))]
          .sort((a,b)=>b.date.localeCompare(a.date)).map(item=><div className="sa-report-event" key={item.id}><div><span className="role-eyebrow">{item.type.toUpperCase()}</span><strong>{item.name}</strong><small>{item.desc}</small></div><span className={'role-state role-state-'+item.status}>{item.status.replaceAll('-',' ')}</span><time>{new Date(item.date).toLocaleDateString()}</time></div>)}
      </div>:<div className="role-empty"><FileClock size={26}/><strong>No workflow records yet.</strong><p>Open a role-specific workflow and complete a demo action to populate this history.</p></div>}
      <p className="sa-report-note"><Info size={16}/> CSV export is available to the Support & Monitoring persona. Real audit logging, sanitized PDF generation and shared reporting require a secure backend in a future phase.</p>
    </section>
  </div>;
}
