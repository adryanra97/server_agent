'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, BookOpenText,
  ClipboardCheck, FileClock, FileSignature, FlaskConical, Layers3,
  LogOut, Menu, Settings2, ShieldCheck, Terminal, UserRound, Waves, X,
} from 'lucide-react';
import { Brand, Eyebrow } from './ui';
import { getDemoRole, getPersona, allowedPages, canVisit, demoLogout, type DemoRole } from '../lib/demo';
import DemoRoleDashboard from './demo-dashboard';
import DemoWorkflows from './demo-workflows';
import Simulation from './simulation';
import Compare from './compare';
import Reports from './reports';
import Developer from './developer';
import Quality from './quality';
import Methodology from './methodology';
import AccessRoles from './access-roles';
import LLMSettings from './llm-settings';
import PlatformShowcase from './platform-showcase';
import { ensureDemoStarter } from '../lib/demo';

const titles:Record<string,{title:string;description:string;eyebrow:string}>={
  dashboard:{title:'Your workspace.',description:'Role-specific decisions and the latest SimPy evaluation evidence.',eyebrow:'ROLE WORKSPACE / OVERVIEW'},
  simulation:{title:'SimPy workbench.',description:'Run a discrete-event server simulation and explore its event-derived time series.',eyebrow:'MODEL / SIMULATION'},
  compare:{title:'Compare workloads.',description:'Test the same server at normal, 2× and 3× demand.',eyebrow:'MODEL / CAPACITY COMPARISON'},
  alignment:{title:'Release alignment.',description:'Submit technical evidence and record the decision for each sprint cycle.',eyebrow:'UC-01 / SCHEDULED ALIGNMENT'},
  incident:{title:'Incident response.',description:'Record escalation, reproduce model conditions, and compare a mitigation scenario.',eyebrow:'UC-02 / INCIDENT HANDLING'},
  signoff:{title:'Release sign-off.',description:'Approve or reject the technical recommendation with a recorded decision.',eyebrow:'UC-04 / SIGN-OFF'},
  reports:{title:'Reports & history.',description:'Explore past evaluations and release decisions.',eyebrow:'UC-03 / REPORTING'},
  developer:{title:'API explorer.',description:'Explore all seven registered evaluation and operational endpoints.',eyebrow:'ENGINEERING / API'},
  quality:{title:'Engineering quality.',description:'Review real GitHub Actions checks, coverage, and build status.',eyebrow:'ENGINEERING / CI'},
  methodology:{title:'About the engines.',description:'Understand assumptions, thresholds, and limitations of the current model.',eyebrow:'ENGINEERING / METHODOLOGY'},
  access:{title:'Access & roles.',description:'Explore responsibilities and available actions for each of the five roles.',eyebrow:'WORKSPACE / ROLE ACCESS'},
  settings:{title:'LLM settings.',description:'Connect a temporary model provider for explanations and report narratives.',eyebrow:'PLATFORM SHOWCASE / SESSION SETTINGS'},
  showcase:{title:'Platform Showcase',description:'Technical demonstrations and verifiable engineering evidence for every demo role.',eyebrow:'PLATFORM / DEMO REFERENCE'},
};

const navIcons:Record<string,typeof Activity>={
  '/dashboard':Activity,'/simulation':FlaskConical,'/compare':BarChart3,
  '/alignment':ClipboardCheck,'/incident':Waves,'/signoff':FileSignature,
  '/reports':FileClock,'/access':ShieldCheck,'/methodology':BookOpenText,
  '/developer':Terminal,'/quality':ShieldCheck,'/settings':Settings2,'/showcase':Layers3,
};
const navShort:Record<string,string>={
  '/dashboard':'Overview','/simulation':'Simulation','/compare':'Compare',
  '/alignment':'Alignment','/incident':'Incidents','/signoff':'Sign-Off','/reports':'Report','/access':'Access',
};
function NotSignedIn(){
  return <div className="sa-access-gate">
    <div className="sa-gate-graphic"><UserRound size={35}/></div>
    <span className="role-eyebrow">ROLE WORKSPACE / DEMONSTRATION</span>
    <h1>Select a demo account to continue.</h1>
    <p>Explore the menus, responsibilities, and decisions assigned to each role.</p>
    <Link href="/login">Choose demo user <ArrowRight size={18}/></Link>
    <small>Guided access · Role-based experience</small>
  </div>;
}
export default function Workspace(){
  const pathname=usePathname();
  const router=useRouter();
  const section=pathname.split('/')[1]||'dashboard';
  const title=titles[section]??titles.dashboard;
  const [role,setRole]=useState<DemoRole|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);

  useEffect(()=>{
    const update=()=>{setRole(getDemoRole());setLoaded(true);};
    update();
    if(getDemoRole())void ensureDemoStarter();
    window.addEventListener('serveragent-demo-user',update);
    return()=>window.removeEventListener('serveragent-demo-user',update);
  },[]);
  // Consistent first-load position when moving between role workspaces.
  // Preserve in-page hash navigation for intentional anchor links.
  useEffect(()=>{
    if(!window.location.hash){
      window.scrollTo({top:0,left:0,behavior:'auto'});
    }
  },[pathname]);
  const pages=role?allowedPages(role):[];
  const primary=pages.filter(x=>['/dashboard','/alignment','/incident','/signoff','/reports','/access'].includes(x.href));
  const showcaseActive=['/showcase','/simulation','/compare','/methodology','/developer','/quality','/settings'].includes(pathname);
  const currentUser=role?getPersona(role):null;
  const allowed=role?canVisit(role,pathname):false;
  function leave(){
    demoLogout();setMobileOpen(false);router.push('/login');
  }
  function closeMenu(){setMobileOpen(false);}
  if(!loaded){
    return <div className="sa-app"><div className="sa-loading-demo" aria-label="Preparing role workspace"><Waves size={34}/><span>Loading role workspace…</span></div></div>;
  }
  if(!role){
    return <div className="sa-app"><header className="sa-header"><div className="sa-header-main"><Brand dark/><Link href="/login" className="sa-run-cta">Demo login <ArrowUpRight size={16}/></Link></div></header><NotSignedIn/></div>;
  }
  return <div className="sa-app">
    <header className="sa-header">
      <div className="sa-header-main">
        <Brand dark/>
        <nav className="sa-main-nav" aria-label="Role-based primary navigation">
          {primary.map(page=><Link key={page.href} href={page.href} aria-current={pathname===page.href?'page':undefined}
            className={pathname===page.href?'current':''}>{navShort[page.href]??page.label}</Link>)}
          <Link href="/showcase" className={'sa-showcase-nav '+(showcaseActive?'current':'')}
            aria-current={pathname==='/showcase'?'page':undefined}
            title="Simulation, CI/CD, API documentation and platform architecture">
            <Layers3 size={16}/> Showcase
          </Link>
        </nav>
        <div className="sa-header-actions">
          <span className="sa-role-identity" title={currentUser?.role}><span className="sa-role-avatar">{currentUser?.initial}</span><span className="sa-role-name"><strong>{currentUser?.name}</strong><small>{currentUser?.shortRole}</small></span></span>
          <Link className="sa-switch-role" href="/demo" title="Switch demo persona">Switch role</Link>
          <button type="button" className="sa-logout" onClick={leave} title="Sign out" aria-label="Sign out"><LogOut size={19}/></button>
          <button type="button" className="sa-mobile-toggle" onClick={()=>setMobileOpen(v=>!v)}
            aria-expanded={mobileOpen} aria-controls="sa-mobile-navigation" aria-label={mobileOpen?'Close menu':'Open menu'}>{mobileOpen?<X size={24}/>:<Menu size={24}/>}</button>
        </div>
      </div>
      {mobileOpen&&<nav id="sa-mobile-navigation" className="sa-mobile-nav" aria-label="Mobile role navigation">
        {primary.map(page=>{
          const Icon=navIcons[page.href]??Activity;
          return <Link key={page.href} href={page.href} onClick={closeMenu} aria-current={pathname===page.href?'page':undefined}>
            <Icon size={18}/>{page.label}<ArrowUpRight size={16}/></Link>;
        })}
        <Link href="/showcase" className="sa-showcase-mobile" onClick={closeMenu} aria-current={pathname==='/showcase'?'page':undefined}>
          <Layers3 size={18}/>Platform Showcase<ArrowUpRight size={16}/>
        </Link>
        <Link href="/demo" onClick={closeMenu}><UserRound size={18}/>Switch demo user<ArrowUpRight size={16}/></Link>
        <button type="button" onClick={leave}><LogOut size={18}/>Sign out</button>
      </nav>}
    </header>
    <main className={'sa-main sa-section-'+section}>
      <div className="sa-breadcrumb"><Link href="/demo" aria-label="TwinPeak demo">TwinPeak</Link><span>/</span><span>{currentUser?.shortRole}</span><span>/</span><strong>{title.title}</strong></div>
      {allowed?<>{section!=='showcase'&&<div className={'page-header sa-page-header sa-page-head-'+section}><div><Eyebrow>{title.eyebrow}</Eyebrow><h1>{title.title}</h1><p>{title.description}</p></div><span className="sa-demo-label">ENGINE EVALUATION</span></div>}
        {section==='showcase'?<PlatformShowcase/>:
          section==='dashboard'?<DemoRoleDashboard role={role}/>:
          section==='simulation'?<Simulation/>:
          section==='compare'?<Compare/>:
          section==='alignment'?<DemoWorkflows role={role} section="alignment"/>:
          section==='incident'?<DemoWorkflows role={role} section="incident"/>:
          section==='signoff'?<DemoWorkflows role={role} section="signoff"/>:
          section==='reports'?<Reports/>:
          section==='developer'?<Developer/>:
          section==='quality'?<Quality/>:
          section==='methodology'?<Methodology/>:
          section==='access'?<AccessRoles role={role}/>:
          section==='settings'?<LLMSettings/>:<DemoRoleDashboard role={role}/>}
      </>:<div className="sa-access-denied"><ShieldCheck size={34}/><span className="role-eyebrow">ROLE-SPECIFIC ACCESS</span>
        <h2>This page is not part of your demo role.</h2>
        <p><strong>{currentUser?.shortRole}</strong> has a different responsibility in the proposed AKPSI workflow. Switch accounts to explore this menu.</p>
        <Link href="/dashboard">Return to your dashboard <ArrowRight size={16}/></Link>
        <Link href="/login">Switch demo persona <ArrowUpRight size={16}/></Link></div>}
      <footer className="sa-footer"><div><Brand dark/><p>Capacity evidence meets role-based decision making.</p></div>
        <div><span>Role-based capacity evaluation workspace</span><span>Simulation-based evaluation · release workflow decision support</span></div></footer>
    </main>
  </div>;
}
