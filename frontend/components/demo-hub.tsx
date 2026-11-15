'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, Users, Waves } from 'lucide-react';
import { Brand } from './ui';
import { demoPersonas, ensureDemoStarter, selectDemoPersona, demoRecords, type DemoRole } from '../lib/demo';

const roleSummaries:Record<DemoRole,string>={
  qa:'Simulate a workload and prepare release evidence.',
  lead:'Review the evidence and decide the next cycle.',
  engineer:'Investigate incidents and test mitigation.',
  manager:'Review recommendations and sign off releases.',
  support:'Log incidents and track investigation reports.',
};

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
          <p>Explore QRIS Payment Cycle 03 through five roles—from QA assessment to technical review, sign-off, and incident response.</p>
          <div className="tp-hub-badges"><span><CheckCircle2 size={15}/> SimPy evaluation</span><span><ShieldCheck size={15}/> No production traffic</span><span><Users size={15}/> Five specialized roles</span></div>
        </div>
        <aside className="tp-hub-case">
          <span>FEATURED SCENARIO · QRIS PAYMENT</span><h2>Release candidate · Cycle 03</h2>
          <p>Baseline: 45 RPS · 4 vCPU · 16 GB RAM</p>
          <div className="tp-hub-case-flow"><span>QA evidence</span><ArrowRight size={16}/><span>Technical review</span><ArrowRight size={16}/><span>Sign-off</span></div>
          <div className="tp-hub-ready">{loading?'Running initial model evaluation…':caseReady?'Scenario evidence is ready':'The sample is available; evaluate when the service reconnects'}</div>
        </aside>
      </div>
      <section className="tp-hub-roles" aria-labelledby="tp-role-heading"><div className="tp-hub-section"><span>CHOOSE YOUR ROLE</span><h2 id="tp-role-heading">Explore the release journey.</h2></div>
        <div className="tp-persona-grid">{demoPersonas.map((persona,index)=><button type="button" className="tp-persona-card" key={persona.id} onClick={()=>choose(persona.id)}>
          <span className="tp-persona-number">0{index+1}</span><strong>{persona.shortRole}</strong><p>{roleSummaries[persona.id]}</p><span className="tp-persona-enter">Explore role <ArrowUpRight size={17}/></span>
        </button>)}</div>
      </section>
    </main>
  </div>;
}
