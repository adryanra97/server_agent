'use client';
import Link from 'next/link';
import {
  Activity, ArrowUpRight, BarChart3, BookOpenText, ClipboardList, FileClock,
  FlaskConical, GitBranch, ShieldCheck, Terminal, type LucideIcon,
} from 'lucide-react';
import type { VerdictResult, Verdict } from '../lib/model';

export const navigation:{label:string;href:string;icon:LucideIcon;group:string}[] = [
  {label:'Overview',href:'/dashboard',icon:Activity,group:'WORKSPACE'},
  {label:'SimPy Workbench',href:'/simulation',icon:FlaskConical,group:'WORKSPACE'},
  {label:'Compare Loads',href:'/compare',icon:BarChart3,group:'WORKSPACE'},
  {label:'Run History',href:'/reports',icon:FileClock,group:'WORKSPACE'},
  {label:'API Explorer',href:'/developer',icon:Terminal,group:'ENGINEERING'},
  {label:'Engineering Quality',href:'/quality',icon:ShieldCheck,group:'ENGINEERING'},
  {label:'About the Engines',href:'/methodology',icon:BookOpenText,group:'ENGINEERING'},
];
export function Brand({dark=false}:{dark?:boolean}){
  return <Link href="/" className={`brand ${dark?'brand-inverse':''}`} aria-label="TwinPeak home">
    <span className="brand-symbol"><span/><span/><span/><span/></span>
    <span className="brand-word">twin<span>peak</span><small>POWERED BY SERVERAGENT</small></span>
  </Link>;
}
export function Eyebrow({children}:{children:React.ReactNode}){
  return <span className="eyebrow"><span className="eyebrow-dot"/>{children}</span>;
}
export function Outcome({verdict}:{verdict:Verdict}){
  return <span className={`status-pill ${verdict==='not_assessable'?'neutral':verdict==='will_survive'?'good':verdict==='at_risk'?'warn':'bad'}`}>
    <span className="status-dot"/>
    {verdict==='not_assessable'?'? Tidak Dapat Dinilai':verdict==='will_survive'?'✓ Lolos':verdict==='at_risk'?'▲ Lolos Bersyarat':'✕ Tidak Lolos'}
  </span>;
}
export function ResourceBars({result}:{result:VerdictResult}){
  return <div className="resource-rows">
    {(['cpu','ram','network'] as const).map((name)=><div className="resource-row" key={name}>
      <div className="resource-header">
        <span>{name==='cpu'?'CPU utilization':name==='ram'?'RAM utilization':'Network utilization'}</span>
        <strong>{(result.resources[name].utilization*100).toFixed(1)}%</strong>
      </div>
      <div className="progress-rail"><div className="progress-fill" style={{
        width:`${Math.min(100,Math.max(0,result.resources[name].utilization*100))}%`,
        background:result.resources[name].status==='critical'?'var(--danger)':result.resources[name].status==='warning'?'var(--amber)':'var(--blue)',
      }}/></div>
    </div>)}
  </div>;
}
export function VerdictCard({result,detail=true}:{result:VerdictResult;detail?:boolean}){
  return <div className="verdict-display"><Outcome verdict={result.verdict}/>
    <h3>{result.verdict==='will_survive'?'Server capacity holds under this workload.':result.verdict==='at_risk'?'The model identifies elevated resource pressure.':'The projected load exceeds modeled server capacity.'}</h3>
    <p className="verdict-intro">Model: <strong>{result.engine.toUpperCase()}</strong> · Bottleneck: <strong>{result.bottleneck?.toUpperCase()??'None'}</strong> · Heuristic confidence: <strong>{(result.confidence*100).toFixed(0)}%</strong></p>
    <ResourceBars result={result}/>
    {detail&&<div className="verdict-reasons"><span className="kicker">WHY THIS VERDICT?</span>{result.reasons.map((r,i)=><p key={i}><span>{String(i+1).padStart(2,'0')}</span>{r}</p>)}</div>}
  </div>;
}
export function Empty({title,description}:{title:string;description:string}){
  return <div className="empty-state"><ClipboardList size={30}/><h3>{title}</h3><p>{description}</p></div>;
}
export function SectionHead({title,eyebrow,description,action}:{title:string;eyebrow:string;description?:string;action?:React.ReactNode}){
  return <div className="panel-heading"><div><span className="kicker">{eyebrow}</span><h3>{title}</h3>{description&&<p>{description}</p>}</div>{action}</div>;
}
