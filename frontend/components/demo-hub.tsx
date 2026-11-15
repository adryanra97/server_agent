'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CheckCircle2, FlaskConical, ShieldCheck, Users, Waves } from 'lucide-react';
import { Brand } from './ui';
import { demoPersonas, ensureDemoStarter, selectDemoPersona, demoRecords, type DemoRole } from '../lib/demo';

export default function DemoHub(){
  const router=useRouter();
  const [caseReady,setCaseReady]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let alive=true;
    void ensureDemoStarter().then(ok=>{if(alive){setCaseReady(ok&&demoRecords().alignments.length>0);setLoading(false);}});
    return()=>{alive=false;};
  },[]);
  function choose(role:DemoRole){selectDemoPersona(role);router.push('/dashboard');}
  return <div className="tp-demo-hub">
    <header className="demo-login-header"><Brand dark/><Link href="/" className="demo-login-back">Main website <ArrowUpRight size={16}/></Link></header>
    <main className="tp-hub-main">
      <div className="tp-hub-intro">
        <div><span className="tp-kicker"><Waves size={16}/> TWINPEAK / GUIDED RELEASE JOURNEY</span>
          <h1>One release.<br/><em>Five perspectives.</em></h1>
          <p>Follow QRIS Payment through performance assessment, Technical Lead review, Manager sign-off, and incident response. Select a role to explore the journey.</p>
          <div className="tp-hub-badges"><span><CheckCircle2 size={15}/> SimPy evaluation</span><span><ShieldCheck size={15}/> No production traffic</span><span><Users size={15}/> Five specialized roles</span></div>
        </div>
        <aside className="tp-hub-case">
          <span>FEATURED SCENARIO · QRIS PAYMENT</span><h2>Release candidate · Cycle 03</h2>
          <p>Baseline: 45 RPS · 4 vCPU · 16 GB RAM</p>
          <div className="tp-hub-case-flow"><span>QA evidence</span><ArrowRight size={16}/><span>Technical review</span><ArrowRight size={16}/><span>Sign-off</span></div>
          <div className="tp-hub-ready">{loading?'Running initial model evaluation…':caseReady?'Scenario evidence is ready':'The sample is available; evaluate when the service reconnects'}</div>
          <small>The starting verdict is retrieved from the model, not predetermined.</small>
        </aside>
      </div>
      <section className="tp-hub-roles"><div className="tp-hub-section"><span>CHOOSE YOUR ROLE</span><h2>Explore the release journey.</h2><p>Switch roles any time through Access & Roles.</p></div>
        <div className="tp-persona-grid">{demoPersonas.map((persona,index)=><button type="button" className="tp-persona-card" key={persona.id} onClick={()=>choose(persona.id)}>
          <span className="tp-persona-number">0{index+1}</span><strong>{persona.shortRole}</strong><p>{persona.mission}</p><span className="tp-persona-enter">Explore role <ArrowUpRight size={17}/></span>
        </button>)}</div>
      </section>
      <div className="tp-hub-footer"><FlaskConical size={17}/> Five-role release workflow · Four assessment statuses</div>
    </main>
  </div>;
}
