import {getSavedReports} from '../lib/workspace-sync';
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
import { useWorkspaceRole } from './workspace-role';

const missions:Record<DemoRole,{eyebrow:string;title:string;description:string;primary:string;primaryHref:string;secondary:string;secondaryHref:string}> = {
  qa:{eyebrow:'YOUR WORK / PERFORMANCE EVIDENCE',title:'Prepare the evidence. Move the release forward.',
    description:'Build a realistic traffic profile, run the SimPy capacity model and attach the outcome to a release-cycle submission for the Technical Lead.',
    primary:'Run SimPy simulation',primaryHref:'/simulation',secondary:'Submit release alignment',secondaryHref:'/alignment'},
  lead:{eyebrow:'YOUR WORK / TECHNICAL DECISIONS',title:'Turn the model into a cycle decision.',
    description:'Review QA evidence and the limiting resource. Record whether the release candidate can progress toward sign-off or needs another cycle in Development.',
    primary:'Review release alignment',primaryHref:'/alignment',secondary:'Read incident cases',secondaryHref:'/incident'},
  engineer:{eyebrow:'YOUR WORK / INCIDENT REPRODUCTION',title:'Understand the failure before changing the system.',
    description:'Inspect escalated incidents, replay their traffic in SimPy and compare the same load against a CPU capacity mitigation, without sending Production traffic.',
    primary:'Open incident queue',primaryHref:'/incident',secondary:'Launch SimPy workbench',secondaryHref:'/simulation'},
  manager:{eyebrow:'YOUR WORK / RELEASE GOVERNANCE',title:'Make decisions grounded in evidence.',
    description:'Review technical recommendations, documented verdicts and limitations before approving or rejecting a release sign-off recommendation.',
    primary:'Review sign-off queue',primaryHref:'/signoff',secondary:'Read reports',secondaryHref:'/reports'},
  support:{eyebrow:'YOUR WORK / MONITORING & REPORTS',title:'From anomaly to actionable handoff.',
    description:'Capture incident symptoms, escalate to Integration Engineering, then review release and incident records for reporting.',
    primary:'Record incident escalation',primaryHref:'/incident',secondary:'Explore reports',secondaryHref:'/reports'},
};
const workflow=[
  {id:'UC-01',name:'Scheduled release alignment',detail:'QA prepares evidence; Technical Lead decides next cycle',href:'/alignment'},
  {id:'UC-02',name:'Incident reproduction',detail:'Support escalates; Integration Engineer models mitigation',href:'/incident'},
  {id:'UC-03',name:'Reports & history',detail:'Review past evaluations and workflow decisions',href:'/reports'},
  {id:'UC-04',name:'Sign-off decision',detail:'Manager approves or rejects a technical recommendation',href:'/signoff'},
];
export default function DemoRoleDashboard(){
  const role=useWorkspaceRole();
  const persona=getPersona(role);
  const mission=missions[role];
  const [records,setRecords]=useState<DemoRecords>({alignments:[],incidents:[]});
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  const [savedReports,setSavedReports]=useState<Record<string,unknown>[]>([]);
  const [engineStatus,setEngineStatus]=useState('Checking');
  useEffect(()=>{
    const update=()=>{setRecords(demoRecords());setRuns(history());setSavedReports(getSavedReports());};
    update();
    window.addEventListener('serveragent-demo-records',update);
    window.addEventListener('serveragent-history',update);
    window.addEventListener('twinpeak-report-history',update);
    fetch('/health').then(r=>r.json()).then(d=>setEngineStatus(d.status==='ok'?'Online':'Offline')).catch(()=>setEngineStatus('Offline'));
    return()=>{
      window.removeEventListener('serveragent-demo-records',update);
      window.removeEventListener('serveragent-history',update);
      window.removeEventListener('twinpeak-report-history',update);
    };
  },[]);
  const pendingReview=records.alignments.filter(x=>x.status==='review').length;
  const signoffPending=records.alignments.filter(x=>x.status==='pending-signoff').length;
  const pendingIncidents=records.incidents.filter(x=>x.status==='open'||x.status==='escalated').length;
  const queue=role==='qa'?runs.length:role==='lead'?pendingReview:role==='manager'?signoffPending:pendingIncidents;
  const queueLabel=role==='qa'?'Saved simulations':role==='lead'?'Review requests':role==='manager'?'Awaiting sign-off':'Incident cases to inspect';
  const visiblePages=allowedPages(role);
  const activity=[
    ...runs.map(x=>({id:'run-'+x.id,title:x.label,kind:'Simulation',date:x.created_at,state:x.result.verdict})),
    ...records.alignments.map(x=>({id:'alignment-'+x.id,title:x.service+' · '+x.release,kind:'Alignment',date:x.updatedAt,state:x.status})),
    ...records.incidents.map(x=>({id:'incident-'+x.id,title:x.service+' · '+x.incidentType,kind:'Incident',date:x.updatedAt,state:x.status})),
    ...savedReports.map(x=>({id:'report-'+String(x.id),title:String(x.title),kind:'Report export',date:String(x.createdAt),state:'recorded'})),
  ].sort((a,b)=>b.date.localeCompare(a.date));
  const verdictCounts=[
    {label:'Survive',count:runs.filter(x=>x.result.verdict==='will_survive').length},
    {label:'At risk',count:runs.filter(x=>x.result.verdict==='at_risk').length},
    {label:'Crash',count:runs.filter(x=>x.result.verdict==='will_crash').length},
    {label:'Unassessable',count:runs.filter(x=>x.result.verdict==='not_assessable').length},
  ];
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
      <div><span>RELEASE RECORDS</span><strong>{records.alignments.length}</strong><small>Recorded in your workspace</small></div>
      <div><span>INCIDENT RECORDS</span><strong>{records.incidents.length}</strong><small>Recorded in your workspace</small></div>
    </div>
    <div className="role-dashboard-body">
      <section className="role-dashboard-panel"><div className="role-panel-head"><div><span className="role-eyebrow">FUNCTIONAL MODEL / AKPSI</span><h3>The workflow behind each decision.</h3></div><span>FOUR USE CASES</span></div>
        <div className="role-process-list">{workflow.map((item,index)=>{
          const enabled=visiblePages.some(x=>x.href===item.href);
          return enabled?
            <Link key={item.id} href={item.href} className="role-process-item tp-process-link" aria-label={'Open '+item.name}>
              <span className="role-process-number">{item.id}</span><div><strong>{item.name}</strong><p>{item.detail}</p></div><ArrowUpRight size={19}/>
            </Link>:
            <div key={item.id} className="role-process-item role-process-muted">
              <span className="role-process-number">{item.id}</span><div><strong>{item.name}</strong><p>{item.detail}</p></div><span className="role-process-not-assigned">OTHER ROLE</span>
            </div>;
        })}</div>
      </section>
      <section className="role-dashboard-panel role-quick-panel"><div className="role-panel-head"><div><span className="role-eyebrow">QUICK ACCESS</span><h3>Your available workspace.</h3></div><ShieldCheck size={20}/></div>
        <div className="role-quick-links">{visiblePages.filter(x=>x.href!=='/dashboard').map(page=><Link href={page.href} key={page.href}><span>{page.label}</span><ArrowUpRight size={17}/></Link>)}</div>
      </section>
    </div>
    <section className="tp-history-overview" aria-label="Recorded evaluation and workflow activity">
      <div className="tp-history-panel"><div className="tp-history-panel-title"><div><span className="role-eyebrow">DECISION RECORDS</span><h3>Recent activity</h3></div><Link href="/reports">View all records <ArrowUpRight size={16}/></Link></div>
        <div className="tp-history-stats"><span><strong>{records.alignments.filter(x=>x.status==='approved').length}</strong> approved sign-offs</span><span><strong>{savedReports.length}</strong> report exports</span></div>
        {activity.length?<ul className="tp-history-events">{activity.slice(0,6).map(x=><li key={x.id}>
          <span className="tp-history-event-dot" aria-hidden="true"/>
          <div><strong>{x.title}</strong><small>{x.kind} · {x.state.replaceAll('_',' ')}</small></div>
          <time dateTime={x.date}>{new Date(x.date).toLocaleDateString()}</time>
        </li>)}</ul>:<p className="tp-history-empty">No submitted activity yet. Run a model or submit an alignment to begin the shared timeline.</p>}
      </div>
      <div className="tp-history-panel"><div className="tp-history-panel-title"><div><span className="role-eyebrow">EVALUATION ANALYTICS</span><h3>Recorded capacity verdicts</h3></div><span>{runs.length} runs</span></div>
        <div className="tp-verdict-bars">{verdictCounts.map(x=><div key={x.label} className="tp-verdict-row">
          <div><span>{x.label}</span><strong>{x.count}</strong></div>
          <div className="tp-verdict-rail" role="meter" aria-label={x.label+' evaluations'} aria-valuemin={0} aria-valuemax={Math.max(1,runs.length)} aria-valuenow={x.count}><span style={{width:(runs.length?x.count/runs.length*100:0)+'%'}}/></div>
        </div>)}</div>
        <p className="tp-verdict-foot">Aggregated from saved evaluation outcomes, not estimated values.</p>
      </div>
    </section>
    <section className="role-latest"><div><span className="role-eyebrow">RECENT MODEL EVIDENCE</span><h3>{runs[0]?'Latest simulation result':'No simulation results yet'}</h3><p>{runs[0]?'The most recent SimPy capacity evaluation.':'Run a simulation to prepare evidence for QA review.'}</p></div>
      {runs[0]?<div className="role-latest-outcome"><Outcome verdict={runs[0].result.verdict}/><strong>{runs[0].request.load.rps} RPS</strong><span>{runs[0].result.engine.toUpperCase()} · bottleneck {runs[0].result.bottleneck??'none'}</span></div>:<Waves size={34}/>}
    </section>
  </div>;
}
