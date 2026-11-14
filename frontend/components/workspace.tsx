'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Activity, ArrowUpRight, Bell, ChevronDown, CircleHelp, Command, ExternalLink, Menu, PanelLeftClose, ShieldCheck, Sparkles, X, CheckCircle2, ArrowRight, Cpu, Boxes, GitBranch, Network, AlertCircle, CircleDot } from 'lucide-react';
import { Brand, Eyebrow, MicroChart, SectionHead, Stat, navigation } from './ui';
import Simulation from './simulation';
import Topology from './topology';
import Incidents from './incidents';
import Reports from './reports';
import Developer from './developer';
import Quality from './quality';
import Signoff from './signoff';
const labels:Record<string,{title:string;sub:string;overline:string}> = {
  dashboard:{title:'At a glance.',sub:'The state of your simulation workspace, in one clear view.',overline:'WORKSPACE / OVERVIEW'},
  simulation:{title:'Simulation Lab',sub:'Challenge your capacity assumptions before they become incidents.',overline:'WORKSPACE / MODELING'},
  topology:{title:'Topology Explorer',sub:'Watch modeled traffic flow through your infrastructure.',overline:'WORKSPACE / TOPOLOGY'},
  incidents:{title:'Incident Response',sub:'Reproduce a failure scenario and evaluate safer alternatives.',overline:'OPERATIONS / INCIDENTS'},
  reports:{title:'Reports & History',sub:'Revisit your analyses and understand the decisions behind them.',overline:'OPERATIONS / REPORTING'},
  signoff:{title:'Release Sign-off',sub:'Turn simulation evidence into a structured release decision.',overline:'OPERATIONS / APPROVALS'},
  developer:{title:'API Explorer',sub:'A transparent, versioned JSON interface to the same simulation engines.',overline:'PLATFORM / DEVELOPERS'},
  quality:{title:'Engineering Quality',sub:'What passed, what failed, and what is still unmeasured.',overline:'PLATFORM / ASSURANCE'}
};
function Overview(){
  return <div className="page-stack">
    <div className="notice"><div className="notice-icon"><Sparkles size={18}/></div><div><strong>Welcome to ServerAgent.</strong><span>Your engineering workspace is ready. Start with a live simulation to generate your first real result.</span></div><Link href="/simulation" className="notice-link">Run simulation <ArrowRight size={16}/></Link></div>
    <div className="overview-stats">
      <Stat label="Available engines" value="02" sub="Rules · SimPy" icon={Cpu}/>
      <Stat label="Scenario presets" value="03" sub="Normal · Peak · Stress" icon={Boxes}/>
      <Stat label="Versioned API" value="v1" sub="JSON · Swagger/OpenAPI" icon={GitBranch}/>
      <Stat label="Quality status" value="Live" sub="See GitHub Actions checks" icon={ShieldCheck}/>
    </div>
    <div className="overview-columns"><section className="panel panel-trend">
      <div className="panel-heading"><div><span className="kicker">SIMULATION CONCEPT</span><h3>Know your operating envelope</h3><p>Sample load behavior across rising traffic demand.</p></div><span className="demo-tag">ILLUSTRATIVE</span></div>
      <MicroChart values={[16,20,24,23,32,36,38,43,48,47,55,60,69,70,84,87,92,97]} height={240}/>
      <div className="chart-axis"><span>Low load</span><span>Increasing request rate</span><span>At capacity</span></div>
    </section>
    <section className="panel panel-readiness"><div className="panel-heading"><div><span className="kicker">HOW IT WORKS</span><h3>From input to verdict</h3></div><span className="icon-frame"><Activity size={18}/></span></div>
      <div className="pipeline-steps">
        {[{n:'01',t:'Define a workload',d:'CPU, RAM, requests per second and network constraints'},{n:'02',t:'Select an engine',d:'Instant analytical rules or a reproducible SimPy simulation'},{n:'03',t:'Inspect the evidence',d:'Resource pressure, bottlenecks and reasons'},{n:'04',t:'Capture the insight',d:'Save results locally and compare across runs'}].map(s=><div className="pipeline-step" key={s.n}><span className="pipeline-number">{s.n}</span><div><strong>{s.t}</strong><p>{s.d}</p></div></div>)}
      </div><Link className="wide-action" href="/simulation">Open Simulation Lab <ArrowUpRight size={17}/></Link>
    </section></div>
    <div className="overview-bottom">
      <Link href="/topology" className="feature-tile"><span className="feature-tile-icon"><Network size={22}/></span><div><span className="kicker">VISUAL EXPLORATION</span><h3>What if a node goes offline?</h3><p>Redistribute traffic and inspect the modeled impact.</p></div><ArrowUpRight size={19}/></Link>
      <Link href="/developer" className="feature-tile"><span className="feature-tile-icon"><GitBranch size={22}/></span><div><span className="kicker">DEVELOPER EXPERIENCE</span><h3>One deployment. Open APIs.</h3><p>Explore endpoints and inspect example request bodies.</p></div><ArrowUpRight size={19}/></Link>
    </div>
  </div>;
}
export default function Workspace(){
  const pathname=usePathname(); const section=pathname.split('/')[1]||'dashboard';
  const page=labels[section]??labels.dashboard;
  const [open,setOpen]=useState(false);
  return <div className="workspace">
    <aside className={`sidebar ${open?'sidebar-mobile-open':''}`}><div className="sidebar-top"><Brand/><button className="sidebar-close" onClick={()=>setOpen(false)} aria-label="Close navigation"><X size={19}/></button></div><div className="sidebar-project"><span className="project-icon"><Boxes size={17}/></span><div><strong>ServerAgent Platform</strong><small>Development workspace</small></div><ChevronDown size={15}/></div>
    <nav className="sidebar-nav" aria-label="Workspace navigation">{['WORKSPACE','OPERATIONS','PLATFORM'].map(group=><div key={group} className="nav-group"><div className="nav-group-label">{group}</div>{navigation.filter(item=>item.group===group).map(({href,icon:Icon,label})=><Link onClick={()=>setOpen(false)} className={`sidebar-link ${pathname===href?'active':''}`} aria-current={pathname===href?'page':undefined} href={href} key={href}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{pathname===href&&<span className="active-marker"/>}</Link>)}</div>)}</nav>
    <div className="sidebar-foot"><div className="sidebar-card"><span className="sidebar-card-label"><span className="live-indicator"/> MODEL-DRIVEN</span><strong>Build with evidence.</strong><p>Every simulation is an estimate with assumptions worth inspecting.</p><Link href="/developer">Explore the API <ArrowUpRight size={14}/></Link></div><div className="sidebar-bottomline"><span className="user-avatar">SA</span><div><strong>ServerAgent</strong><small>Engineering console · v0.1</small></div><CircleHelp size={16}/></div></div>
    </aside>
    {open&&<button onClick={()=>setOpen(false)} className="sidebar-scrim" aria-label="Close menu"/>}
    <div className="workspace-main"><header className="app-topbar"><div className="app-topbar-left"><button className="menu-mobile" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><span className="breadcrumb-root">Workspace</span><span className="breadcrumb-divider">/</span><strong>{navigation.find(n=>n.href===pathname)?.label??'Overview'}</strong></div><div className="app-topbar-right"><span className="topbar-environment"><span className="live-indicator"/> SANDBOX MODE</span><a href="https://github.com/adryanra97/server_agent" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository"><GitBranch size={18}/></a><Link href="/developer" aria-label="Developer API"><Command size={18}/></Link></div></header>
    <main className="workspace-content"><div className="page-header"><div><Eyebrow>{page.overline}</Eyebrow><h1>{page.title}</h1><p>{page.sub}</p></div><div className="page-header-right"><span className="build-label"><span/> ENGINEERING PREVIEW</span></div></div>
    {section==='dashboard'?<Overview/>:section==='simulation'?<Simulation/>:section==='topology'?<Topology/>:section==='incidents'?<Incidents/>:section==='reports'?<Reports/>:section==='signoff'?<Signoff/>:section==='developer'?<Developer/>:section==='quality'?<Quality/>:<Overview/>}
    <footer className="workspace-footer"><span>ServerAgent · Capacity intelligence and release assurance</span><span>Results are modeled estimates, not production measurements.</span></footer></main></div>
  </div>;
}
