'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, CircleAlert,
  Cpu, FileClock, GitBranch, Layers3, Menu, Network, Server, ShieldCheck, Terminal, Waves, X,
} from 'lucide-react';
import { Brand, Eyebrow, navigation, Outcome, ResourceBars } from './ui';
import { history, type HistoryItem } from '../lib/model';
import Simulation from './simulation';
import Compare from './compare';
import Reports from './reports';
import Developer from './developer';
import Quality from './quality';
import Methodology from './methodology';

const labels:Record<string,{title:string;description:string;eyebrow:string}>={
  dashboard:{title:'Capacity intelligence.',description:'Everything starts with the original copdash capacity evaluation engine.',eyebrow:'WORKSPACE / OVERVIEW'},
  simulation:{title:'SimPy workbench.',description:'Run the original discrete-event engine, inspect execution evidence, and compare against deterministic rules.',eyebrow:'WORKSPACE / DISCRETE-EVENT SIMULATION'},
  compare:{title:'Compare workloads',description:'Run the original /verdict endpoint for three different load levels.',eyebrow:'WORKSPACE / COMPARISON'},
  reports:{title:'Run history',description:'Revisit completed evaluations stored locally in this browser.',eyebrow:'WORKSPACE / HISTORY'},
  developer:{title:'API Explorer',description:'Inspect the original copdash endpoints and send real JSON requests.',eyebrow:'ENGINEERING / API'},
  quality:{title:'Engineering Quality',description:'GitHub tests, Python quality checks, and verified CI status.',eyebrow:'ENGINEERING / CI'},
  methodology:{title:'About the engines',description:'Understand the formulas, simulation mechanics, assumptions, and boundaries.',eyebrow:'ENGINEERING / METHODOLOGY'},
};
function Overview(){
  const [health,setHealth]=useState<'checking'|'online'|'unavailable'>('checking');
  const [engines,setEngines]=useState<string[]>([]);
  const [runs,setRuns]=useState<HistoryItem[]>([]);
  useEffect(()=>{
    const update=()=>setRuns(history());
    update(); window.addEventListener('serveragent-history',update);
    const healthCheck=fetch('/health').then(r=>r.json()).then(d=>setHealth(d.status==='ok'?'online':'unavailable')).catch(()=>setHealth('unavailable'));
    const engineCheck=fetch('/engines').then(r=>r.json()).then(d=>setEngines(d.engines??[])).catch(()=>setEngines([]));
    return()=>{window.removeEventListener('serveragent-history',update)};
  },[]);
  const last=runs[0];
  return <div className="page-stack">
    <div className="notice"><div className="notice-icon"><Cpu size={19}/></div><div><strong>Faithful to copdash.</strong><span>Two original engines, one input schema, three possible verdicts. The additional interface makes the underlying Python calculations easier to explore.</span></div><Link href="/simulation" className="notice-link">Run an evaluation <ArrowRight size={16}/></Link></div>
    <div className="overview-stats">
      <div className="stat-card"><div className="stat-top">BACKEND HEALTH <Activity size={18}/></div><strong className="overview-stat-word">{health==='online'?'Online':health==='checking'?'Checking':'Unavailable'}</strong><div className="stat-meta">Original GET /health endpoint</div></div>
      <div className="stat-card"><div className="stat-top">AVAILABLE ENGINES <Waves size={18}/></div><strong>{engines.length||'—'}</strong><div className="stat-meta">{engines.length?engines.join(' · '):'Awaiting engine registry'}</div></div>
      <div className="stat-card"><div className="stat-top">BROWSER HISTORY <FileClock size={18}/></div><strong>{runs.length}</strong><div className="stat-meta">Real evaluations saved locally</div></div>
      <div className="stat-card"><div className="stat-top">API CONTRACT <Terminal size={18}/></div><strong className="overview-stat-word">OpenAPI</strong><div className="stat-meta">GET /openapi.json</div></div>
    </div>
    <div className="overview-columns">
      <section className="panel panel-trend"><div className="panel-heading"><div><span className="kicker">THE CORE OF COPDASH</span><h3>From server specifications to a verdict</h3><p>The exact processing path in the source repository.</p></div><span className="demo-tag">2 ENGINES</span></div>
        <div className="logic-flow"><div className="logic-card"><span className="logic-number">01</span><Cpu size={23}/><strong>Server spec</strong><small>CPU · RAM · Network</small></div><ArrowRight className="logic-arrow" size={22}/><div className="logic-card"><span className="logic-number">02</span><Activity size={23}/><strong>Load profile</strong><small>RPS · CPU ms · Payload</small></div><ArrowRight className="logic-arrow" size={22}/><div className="logic-card logic-primary"><span className="logic-number">03</span><Waves size={23}/><strong>Engine</strong><small>Rules or SimPy</small></div><ArrowRight className="logic-arrow" size={22}/><div className="logic-card"><span className="logic-number">04</span><CheckCircle2 size={23}/><strong>Verdict</strong><small>Risk · Confidence · Reasons</small></div></div>
        <p className="logic-caption">The site does not simulate a load balancer or send traffic to actual infrastructure. It evaluates the defined mathematical / discrete-event models.</p>
      </section>
      <section className="panel panel-readiness"><div className="panel-heading"><div><span className="kicker">MOST RECENT EVALUATION</span><h3>{last?'Your latest model output':'No runs yet'}</h3></div><span className="icon-frame"><FileClock size={18}/></span></div>
        {last?<><div className="latest-run"><Outcome verdict={last.result.verdict}/><strong>{last.label}</strong><small>{new Date(last.created_at).toLocaleString()} · {last.result.engine}</small></div><ResourceBars result={last.result}/><p className="latest-run-note">Bottleneck: {last.result.bottleneck??'none'} · Confidence heuristic: {(last.result.confidence*100).toFixed(0)}%</p></>:<div className="overview-empty"><Waves size={34}/><p>Complete your first evaluation to see actual results here.</p></div>}
        <Link className="wide-action" href="/simulation">{last?'Evaluate another workload':'Start evaluating'} <ArrowUpRight size={17}/></Link>
      </section>
    </div>
    <div className="overview-bottom">
      <Link href="/compare" className="feature-tile"><span className="feature-tile-icon"><Activity size={22}/></span><div><span className="kicker">COMPARE INPUTS</span><h3>How much load can it handle?</h3><p>Run the original engine across three input profiles.</p></div><ArrowUpRight size={18}/></Link>
      <Link href="/developer" className="feature-tile"><span className="feature-tile-icon"><Terminal size={22}/></span><div><span className="kicker">API TRANSPARENCY</span><h3>Inspect the original endpoints.</h3><p>Try POST /verdict or open Swagger docs directly.</p></div><ArrowUpRight size={18}/></Link>
    </div>
  </div>;
}
export default function Workspace(){
  const path=usePathname();
  const section=path.split('/')[1]||'dashboard';
  const page=labels[section]??labels.dashboard;
  const [mobileOpen,setMobileOpen]=useState(false);
  const primary=navigation.filter(item=>item.group==='WORKSPACE');
  const secondary=navigation.filter(item=>item.group==='ENGINEERING');
  const close=()=>setMobileOpen(false);
  return <div className="sa-app">
    <header className="sa-header">
      <div className="sa-header-main">
        <Brand dark/>
        <nav className="sa-main-nav" aria-label="Primary navigation">
          {primary.map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?'page':undefined}
            className={path===item.href?'current':''}>{item.label==='SimPy Workbench'?'SimPy':item.label==='Compare Loads'?'Compare':item.label==='Run History'?'History':item.label}</Link>)}
          <details className="sa-more">
            <summary className={secondary.some(item=>item.href===path)?'current':''}>Explore <ChevronDown size={15}/></summary>
            <div className="sa-more-menu">{secondary.map(item=><Link key={item.href} href={item.href}
              aria-current={path===item.href?'page':undefined}><item.icon size={17}/>{item.label}</Link>)}</div>
          </details>
        </nav>
        <div className="sa-header-actions">
          <span className="sa-header-indicator"><span className="live-indicator"/> MODEL SANDBOX</span>
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="sa-docs-link">API docs <ArrowUpRight size={15}/></a>
          <Link className="sa-run-cta" href="/simulation">Run simulation <ArrowUpRight size={16}/></Link>
          <button type="button" className="sa-mobile-toggle" onClick={()=>setMobileOpen(v=>!v)}
            aria-expanded={mobileOpen} aria-controls="sa-mobile-navigation"
            aria-label={mobileOpen?'Close menu':'Open menu'}>{mobileOpen?<X size={24}/>:<Menu size={24}/>}</button>
        </div>
      </div>
      {mobileOpen&&<nav id="sa-mobile-navigation" className="sa-mobile-nav" aria-label="Mobile navigation">
        {[...primary,...secondary].map(item=><Link key={item.href} href={item.href} onClick={close}
          aria-current={path===item.href?'page':undefined}><item.icon size={19}/>{item.label}<ArrowUpRight size={15}/></Link>)}
        <a href="/docs" target="_blank" rel="noopener noreferrer" onClick={close}><Terminal size={19}/>Swagger API<ArrowUpRight size={15}/></a>
      </nav>}
    </header>
    <main className="sa-main">
      <div className="sa-breadcrumb"><Link href="/" aria-label="ServerAgent homepage">ServerAgent</Link><span>/</span><span>{page.eyebrow.replace('WORKSPACE / ','').replace('ENGINEERING / ','')}</span></div>
      <div className="page-header sa-page-header"><div><Eyebrow>{page.eyebrow}</Eyebrow><h1>{page.title}</h1><p>{page.description}</p></div><div className="page-header-right"><span className="build-label"><span/> BUILT ON COPDASH</span></div></div>
      {section==='dashboard'?<Overview/>:section==='simulation'?<Simulation/>:section==='compare'?<Compare/>:section==='reports'?<Reports/>:section==='developer'?<Developer/>:section==='quality'?<Quality/>:section==='methodology'?<Methodology/>:<Overview/>}
      <footer className="sa-footer"><div><Brand dark/><p>Capacity decisions, grounded in model evidence.</p></div>
        <div><span>Based on the original copdash Rules + SimPy engines.</span><span>Modeled predictions · Not observed production outcomes.</span></div></footer>
    </main>
  </div>;
}
