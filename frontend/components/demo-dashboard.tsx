'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, ClipboardCheck,
  Cpu, FileClock, FileSignature, Network, ShieldCheck, Waves,
} from 'lucide-react';
import { getPersona, allowedPages, demoRecords, type DemoRecords, type DemoRole } from '../lib/demo';
import { history, type HistoryItem } from '../lib/model';
import { Outcome } from './ui';

const missions:Record<DemoRole,{eyebrow:string;title:string;description:string;primary:string;primaryHref:string;secondary:string;secondaryHref:string}> = {
  qa:{eyebrow:'YOUR WORK / PERFORMANCE EVIDENCE',title:'Prepare the evidence. Move the release forward.',
    description:'Build a realistic traffic profile, run the original SimPy capacity model and attach the outcome to a release-cycle submission for the Technical Lead.',
    primary:'Run SimPy simulation',primaryHref:'/simulation',secondary:'Submit release alignment',secondaryHref:'/alignment'},
  lead:{eyebrow:'YOUR WORK / TECHNICAL DECISIONS',title:'Turn the model into a cycle decision.',
    description:'Review QA evidence and the limiting resource. Record whether the release candidate can progress toward sign-off or needs another cycle in Development.',
    primary:'Review release alignment',primaryHref:'/alignment',secondary:'Read incident cases',secondaryHref:'/incident'},
  engineer:{eyebrow:'YOUR WORK / INCIDENT REPRODUCTION',title:'Understand the failure before changing the system.',
    description:'Inspect escalated incidents, replay their traffic in SimPy and compare the same load against a CPU capacity mitigation, without sending Production traffic.',
    primary:'Open incident queue',primaryHref:'/incident',secondary:'Launch SimPy workbench',secondaryHref:'/simulation'},
  manager:{eyebrow:'YOUR WORK / RELEASE GOVERNANCE',title:'Make decisions grounded in evidence.',
    description:'Review technical recommendations, documented verdicts and limitations before approving or rejecting a demo release sign-off.',
    primary:'Review sign-off queue',primaryHref:'/signoff',secondary:'Read reports',secondaryHref:'/reports'},
  support:{eyebrow:'YOUR WORK / MONITORING & REPORTS',title:'From anomaly to actionable handoff.',
    description:'Capture incident symptoms, escalate to Integration Engineering, then collect browser-local release and incident records for reporting.',
    primary:'Record incident escalation',primaryHref:'/incident',secondary:'Explore reports',secondaryHref:'/reports'},
};
const workflow=[
  {id:'UC-01',name:'Scheduled release alignment',detail:'QA prepares evidence; Technical Lead decides next cycle',href:'/alignment'},
  {id:'UC-02',name:'Incident reproduction',detail:'Support escalates; Integration Engineer models mitigation',href:'/incident'},
  {id:'UC-03',name:'Reports & history',detail:'Review past evaluations and browser-local workflow records',href:'/reports'},
  {id:'UC-04',name:'Sign-off decision',detail:'Manager approves or rejects a technical recommendation',href:'/signoff'},
];
export default function DemoRoleDashboard({role}:{role:DemoRole}){
  const persona=getPersona(role);
  const mission=missions[role];
  const [records,setRecords]=useState<DemoRecords>({alignments:[],incidents:[]});
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [engineStatus,setEngineStatus]=useState('Checking');
  useEffect(()=>{
    const update=()=>{setRecords(demoRecords());setRuns(history());};
    update();
    window.addEventListener('serveragent-demo-records',update);
    window.addEventListener('serveragent-history',update);
    fetch('/health').then(r=>r.json()).then(d=>setEngineStatus(d.status==='ok'?'Online':'Offline')).catch(()=>setEngineStatus('Offline'));
    return()=>{
      window.removeEventListener('serveragent-demo-records',update);
      window.removeEventListener('serveragent-history',update);
    };
  },[]);
  const pendingReview=records.alignments.filter(x=>x.status==='review').length;
  const signoffPending=records.alignments.filter(x=>x.status==='pending-signoff').length;
  const pendingIncidents=records.incidents.filter(x=>x.status==='open'||x.status==='escalated').length;
  const queue=role==='qa'?runs.length:role==='lead'?pendingReview:role==='manager'?signoffPending:pendingIncidents;
  const queueLabel=role==='qa'?'Saved simulations':role==='lead'?'Review requests':role==='manager'?'Awaiting sign-off':'Incident cases to inspect';
  const visiblePages=allowedPages(role);
  return <div className="role-dashboard">
    <section className="role-hero">
      <div className="role-hero-copy"><span className="role-hero-eyebrow"><span/> {mission.eyebrow}</span>
        <div className="role-greeting">Logged in as <strong>{persona.name} / {persona.shortRole}</strong></div>
        <h2>{mission.title}</h2><p>{mission.description}</p>
        <div className="role-hero-buttons"><Link href={mission.primaryHref} className="role-primary-action">{mission.primary} <ArrowRight size={18}/></Link><Link href={mission.secondaryHref} className="role-secondary-action">{mission.secondary} <ArrowUpRight size={16}/></Link></div>
      </div>
      <div className="role-hero-brief"><span>YOUR RESPONSIBILITY</span><strong>{persona.role}</strong><p>{persona.mission}</p><div><CheckCircle2 size={18}/> {persona.next}</div></div>
    </section>
    <div className="role-stat-grid">
      <div><span>YOUR WORK QUEUE</span><strong>{queue}</strong><small>{queueLabel}</small></div>
      <div><span>EVALUATION ENGINE</span><strong className="role-stat-word">{engineStatus}</strong><small>Service health check</small></div>
      <div><span>RELEASE RECORDS</span><strong>{records.alignments.length}</strong><small>Saved in this browser</small></div>
      <div><span>INCIDENT RECORDS</span><strong>{records.incidents.length}</strong><small>Saved in this browser</small></div>
    </div>
    <div className="role-dashboard-body">
      <section className="role-dashboard-panel"><div className="role-panel-head"><div><span className="role-eyebrow">FUNCTIONAL MODEL / AKPSI</span><h3>The workflow behind each decision.</h3></div><span>FOUR USE CASES</span></div>
        <div className="role-process-list">{workflow.map((item,index)=>{
          const enabled=visiblePages.some(x=>x.href===item.href);
          return <div key={item.id} className={'role-process-item '+(enabled?'':'role-process-muted')}>
            <span className="role-process-number">{item.id}</span><div><strong>{item.name}</strong><p>{item.detail}</p></div>
            {enabled?<Link href={item.href} aria-label={'Open '+item.name}><ArrowUpRight size={19}/></Link>:<span className="role-process-not-assigned">OTHER ROLE</span>}
          </div>;
        })}</div>
      </section>
      <section className="role-dashboard-panel role-quick-panel"><div className="role-panel-head"><div><span className="role-eyebrow">QUICK ACCESS</span><h3>Your available workspace.</h3></div><ShieldCheck size={20}/></div>
        <div className="role-quick-links">{visiblePages.filter(x=>x.href!=='/dashboard').map(page=><Link href={page.href} key={page.href}><span>{page.label}</span><ArrowUpRight size={17}/></Link>)}</div>
        <p className="role-quick-note">Routes are filtered for the selected demo role. This is a product UX demonstration, not server-side access control.</p>
      </section>
    </div>
    <section className="role-latest"><div><span className="role-eyebrow">RECENT MODEL EVIDENCE</span><h3>{runs[0]?'Latest browser-local simulation':'No runs in this browser yet'}</h3><p>{runs[0]?'A real engine result saved by the SimPy workbench.':'Create an evaluation in SimPy to populate shared demo evidence for the QA alignment flow.'}</p></div>
      {runs[0]?<div className="role-latest-outcome"><Outcome verdict={runs[0].result.verdict}/><strong>{runs[0].request.load.rps} RPS</strong><span>{runs[0].result.engine.toUpperCase()} · bottleneck {runs[0].result.bottleneck??'none'}</span></div>:<Waves size={34}/>}
    </section>
  </div>;
}
