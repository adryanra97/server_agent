'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Check, ClipboardCheck, Clock3, FileCheck2, Info, LockKeyhole, ShieldAlert } from 'lucide-react';
import { loadHistory, type HistoryItem } from '../lib/model';
import { EmptyState, ResultStatus } from './ui';
type Signoff={id:string;status:'draft'|'approved'|'rejected';notes:string;time:string};
function readSignoffs():Record<string,Signoff>{
  if(typeof window==='undefined')return {};
  try{return JSON.parse(window.localStorage.getItem('serveragent-signoffs-demo')||'{}')}catch{return {}}
}
export default function Signoff(){
  const [history,setHistory]=useState<HistoryItem[]>([]);const [records,setRecords]=useState<Record<string,Signoff>>({});const [notes,setNotes]=useState<Record<string,string>>({});
  useEffect(()=>{setHistory(loadHistory());setRecords(readSignoffs())},[]);
  function act(item:HistoryItem,status:'approved'|'rejected'){
    const current=readSignoffs();
    if(current[item.id]?.status)return;
    const next={...current,[item.id]:{id:item.id,status,notes:notes[item.id]??'',time:new Date().toISOString()}};
    window.localStorage.setItem('serveragent-signoffs-demo',JSON.stringify(next));setRecords(next);
  }
  const eligible=history.filter(i=>i.result.verdict==='will_survive'||i.result.verdict==='at_risk');
  return <div className="page-stack"><div className="notice notice-technical"><span className="notice-icon"><ShieldAlert size={18}/></span><div><strong>Workflow preview — local approvals only</strong><span>This page demonstrates release review from completed simulations. Decisions live only in this browser and are not production authorization, authenticated signatures, or immutable audit records.</span></div></div>
    <div className="report-cards"><div className="panel summary-tile"><span className="kicker">REVIEW CANDIDATES</span><strong>{eligible.length}</strong><p>Model runs eligible for review</p></div><div className="panel summary-tile"><span className="kicker">APPROVED / DEMO</span><strong>{Object.values(records).filter(r=>r.status==='approved').length}</strong><p>Locally recorded approvals</p></div><div className="panel summary-tile"><span className="kicker">REJECTED / DEMO</span><strong>{Object.values(records).filter(r=>r.status==='rejected').length}</strong><p>Locally recorded rejections</p></div></div>
    <section className="panel report-list-panel"><div className="panel-heading"><div><span className="kicker">RELEASE DECISIONS</span><h3>Pending review</h3></div><span className="demo-tag">DEMO WORKFLOW</span></div>
    {eligible.length?<div className="signoff-list">{eligible.map(item=>{const record=records[item.id];return <div className="signoff-row" key={item.id}><div className="signoff-heading"><div><span className="kicker">SIMULATION REFERENCE / {item.id.slice(0,8)}</span><h3>{item.label}</h3><p>{new Date(item.created_at).toLocaleString()} · {item.engine} engine</p></div>{record?<span className={`signoff-status ${record.status}`}>{record.status==='approved'?<Check size={15}/>:<ShieldAlert size={15}/>} {record.status.toUpperCase()}</span>:<ResultStatus result={item.result}/>}</div><div className="signoff-review"><div><span className="kicker">MODEL EVIDENCE</span><p>Primary bottleneck: <strong>{item.result.bottleneck??'none'}</strong>. CPU estimated at <strong>{Math.round(item.result.resources.cpu.utilization*100)}%</strong>. A manual review of SIT/UAT evidence is still required.</p></div>{!record?<div className="signoff-actions"><input value={notes[item.id]??''} onChange={e=>setNotes(n=>({...n,[item.id]:e.target.value}))} placeholder="Reviewer notes (demo)" aria-label="Reviewer notes"/><button onClick={()=>act(item,'rejected')} className="btn btn-outline btn-small">Reject</button><button onClick={()=>act(item,'approved')} className="btn btn-primary btn-small">Approve demo</button></div>:<p className="signoff-record">Recorded {new Date(record.time).toLocaleString()} · {record.notes||'No notes'} · Locked in this browser</p>}</div></div>})}</div>:<EmptyState title="No candidate analyses" detail="Run a Simulation Lab scenario to create a candidate for review."/>}
    {!eligible.length&&<div className="center-actions"><Link href="/simulation" className="btn btn-primary">Open Simulation Lab <ArrowRight size={16}/></Link></div>}</section>
    <div className="insight-bar"><span className="insight-symbol"><LockKeyhole size={19}/></span><div><strong>Production sign-off requires authentication and an audit backend.</strong><span>We will connect this workflow to authenticated manager roles, immutable versioned documents, and protected database storage before it is treated as an actual release approval.</span></div></div>
  </div>;
}
