'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, FileClock, Filter, Info, Search } from 'lucide-react';
import { csvHistory, history, type HistoryItem } from '../lib/model';
import { Empty, Outcome, ResourceBars, SectionHead } from './ui';
export default function Reports(){
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [verdict,setVerdict]=useState('all');
  useEffect(()=>{const update=()=>setRuns(history());update();window.addEventListener('serveragent-history',update);return()=>window.removeEventListener('serveragent-history',update)},[]);
  const filtered=useMemo(()=>runs.filter(r=>(verdict==='all'||r.result.verdict===verdict)&&(`${r.label} ${r.result.engine} ${r.result.bottleneck}`.toLowerCase().includes(query.toLowerCase()))),[runs,query,verdict]);
  const current=runs.find(r=>r.id===selected);
  return <div className="page-stack">
    <div className="notice notice-technical"><span className="notice-icon"><FileClock size={18}/></span><div><strong>This history is a website enhancement, not a copdash backend feature.</strong><span>The original API is stateless. Completed evaluations are stored only in this browser. No shared database is claimed.</span></div></div>
    <div className="report-cards"><div className="panel summary-tile"><span className="kicker">TOTAL RUNS</span><strong>{runs.length}</strong><p>Completed evaluations in this browser</p></div><div className="panel summary-tile"><span className="kicker">RULES ENGINE</span><strong>{runs.filter(x=>x.result.engine==='rules').length}</strong><p>Deterministic model evaluations</p></div><div className="panel summary-tile"><span className="kicker">SIMPY ENGINE</span><strong>{runs.filter(x=>x.result.engine==='simpy').length}</strong><p>Discrete-event model evaluations</p></div></div>
    <section className="panel report-list-panel"><SectionHead eyebrow="BROWSER-LOCAL DATA" title="Saved evaluations" action={<button className="btn btn-outline btn-small" disabled={!filtered.length} onClick={()=>csvHistory(filtered)}><Download size={15}/>Export CSV</button>}/>
      <div className="report-toolbar"><label className="search-field"><Search size={15}/><input aria-label="Search runs" placeholder="Search runs..." value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="filter-select"><Filter size={15}/><select aria-label="Filter by verdict" value={verdict} onChange={e=>setVerdict(e.target.value)}><option value="all">All verdicts</option><option value="will_survive">Will survive</option><option value="at_risk">At risk</option><option value="will_crash">Will crash</option></select></label></div>
      {filtered.length?<div className="reports-table"><div className="report-row report-row-heading"><span>EVALUATION</span><span>ENGINE</span><span>RPS</span><span>VERDICT</span><span>DATE</span></div>{filtered.map(r=><div key={r.id}><button className="report-row report-data-row" onClick={()=>setSelected(selected===r.id?null:r.id)} aria-expanded={selected===r.id}><span><strong>{r.label}</strong><small>{r.id.slice(0,8)}</small></span><span className="engine-tag">{r.result.engine.toUpperCase()}</span><span>{r.request.load.rps}</span><span><Outcome verdict={r.result.verdict}/></span><span>{new Date(r.created_at).toLocaleDateString()}</span></button>{selected===r.id&&<div className="report-expanded"><div><span className="kicker">CPU UTILIZATION</span><strong>{(r.result.resources.cpu.utilization*100).toFixed(1)}%</strong></div><div><span className="kicker">BOTTLENECK</span><strong>{r.result.bottleneck??'none'}</strong></div><div><span className="kicker">CONFIDENCE HEURISTIC</span><strong>{(r.result.confidence*100).toFixed(0)}%</strong></div><p>{r.result.reasons.join(' · ')}</p></div>}</div>)}</div>:<Empty title="No results yet" description={runs.length?'Try changing the filters.':'Run the actual /verdict API to save your first evaluation here.'}/>}
      {!runs.length&&<div className="center-actions"><Link href="/simulation" className="btn btn-primary">Evaluate your first server <ArrowRight size={16}/></Link></div>}
    </section>
  </div>;
}
