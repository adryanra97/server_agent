'use client';
import Link from 'next/link';
import { ArrowUpRight, Activity, ArrowRight, Check, ShieldCheck, Server, GitBranch, Gauge, Network, FlaskConical, FileText, Terminal, BadgeCheck, ClipboardCheck, AlertTriangle, Layers3, LayoutDashboard, ArrowLeft, MoveUpRight, type LucideIcon } from 'lucide-react';
import type { Verdict, VerdictResult } from '../lib/model';

export const navigation: {label:string;href:string;icon:LucideIcon;group:string}[] = [
  {label:'Overview',href:'/dashboard',icon:LayoutDashboard,group:'WORKSPACE'},
  {label:'Simulation Lab',href:'/simulation',icon:FlaskConical,group:'WORKSPACE'},
  {label:'Topology Explorer',href:'/topology',icon:Network,group:'WORKSPACE'},
  {label:'Incident Response',href:'/incidents',icon:AlertTriangle,group:'OPERATIONS'},
  {label:'Reports & History',href:'/reports',icon:FileText,group:'OPERATIONS'},
  {label:'Sign-off Center',href:'/signoff',icon:ClipboardCheck,group:'OPERATIONS'},
  {label:'API Explorer',href:'/developer',icon:Terminal,group:'PLATFORM'},
  {label:'Engineering Quality',href:'/quality',icon:ShieldCheck,group:'PLATFORM'},
];
export function Brand({dark=false}: {dark?:boolean}) {
  return <Link href="/" className={`brand ${dark?'brand-inverse':''}`} aria-label="ServerAgent home">
    <span className="brand-symbol"><span/><span/><span/><span/></span>
    <span className="brand-word">server<span>agent</span><small>RELEASE INTELLIGENCE</small></span>
  </Link>;
}
export function Eyebrow({children}: {children:React.ReactNode}) {return <span className="eyebrow"><span className="eyebrow-dot"/>{children}</span>}
export function SectionHead({eyebrow,title,description,action}: {eyebrow:string;title:string;description?:string;action?:React.ReactNode}) {
  return <div className="section-head"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action&&<div className="section-action">{action}</div>}</div>
}
export function Stat({label,value,sub,icon:Icon,trend}: {label:string;value:string;sub:string;icon:LucideIcon;trend?:string}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18} strokeWidth={1.8}/></div><strong>{value}</strong><div className="stat-meta">{trend&&<span className="trend">{trend}</span>}{sub}</div></div>
}
export function StatusPill({status}: {status:'good'|'warn'|'bad'|'neutral'}) {
  const text={good:'Within capacity',warn:'Approaching limit',bad:'Capacity exceeded',neutral:'Not evaluated'}[status];
  return <span className={`status-pill ${status}`}><span className="status-dot"/>{text}</span>
}
export function ResultStatus({result}: {result:VerdictResult|null}) {
  return <StatusPill status={!result?'neutral':result.verdict==='will_survive'?'good':result.verdict==='at_risk'?'warn':'bad'}/>;
}
export function ProgressBar({value,color}: {value:number;color?:string}) {
  return <div className="progress-rail"><div className="progress-fill" style={{width:`${Math.min(100,Math.max(0,value*100))}%`,background:color|| (value>1?'var(--danger)':value>=.8?'var(--amber)':'var(--blue)')}}/></div>
}
export function ResourceRows({result}: {result:VerdictResult}) {
  return <div className="resource-rows">{(['cpu','ram','network'] as const).map(k=><div className="resource-row" key={k}>
    <div className="resource-header"><span>{k==='cpu'?'CPU utilization':k==='ram'?'Memory pressure':'Network pressure'}</span><strong>{Math.round(result.resources[k].utilization*100)}%</strong></div>
    <ProgressBar value={result.resources[k].utilization}/></div>)}</div>
}
export function MicroChart({values, height=130}: {values:number[];height?:number}) {
  const w=520; const h=height; const max=Math.max(...values,1); const min=Math.min(...values,0);
  const span=max-min||1;
  const points=values.map((v,i)=>`${(i/(values.length-1))*w},${h-14-(v-min)/span*(h-30)}`).join(' ');
  const area=`0,${h} ${points} ${w},${h}`;
  return <svg className="micro-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label="Illustrative trend chart" role="img">
    <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#498af8" stopOpacity=".23"/><stop offset="1" stopColor="#498af8" stopOpacity="0"/></linearGradient></defs>
    {[.25,.5,.75].map(v=><line key={v} x1="0" x2={w} y1={h*v} y2={h*v} stroke="#dce7f2" strokeDasharray="4 5"/>)}
    <polygon points={area} fill="url(#chart-fill)"/><polyline points={points} fill="none" stroke="#1d62d8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>;
}
export function EmptyState({title,detail}: {title:string;detail:string}) {return <div className="empty-state"><Layers3 size={30}/><h3>{title}</h3><p>{detail}</p></div>}
export function SecondaryLink({href,children}:{href:string;children:React.ReactNode}) {return <Link className="inline-link" href={href}>{children}<ArrowUpRight size={15}/></Link>}
