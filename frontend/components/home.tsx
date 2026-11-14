'use client';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Network, Activity, ShieldCheck, ChevronDown, MoveUpRight, CheckCircle2, FlaskConical, ArrowDownRight, Server, Cpu } from 'lucide-react';
import { Brand, Eyebrow, MicroChart } from './ui';
import { useState } from 'react';

function Mesh({compact=false}: {compact?:boolean}) {
  const [failure,setFailure]=useState(false);
  return <div className={`mesh-stage ${compact?'mesh-small':''}`}>
    <div className="mesh-grid"/>
    <div className="mesh-caption"><span className="live-indicator"/>SIMULATED TOPOLOGY <span>· 2 NODES</span></div>
    <svg className="mesh-lines" viewBox="0 0 600 350" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M 104 176 C 210 176 200 98 304 98" />
      <path d="M 104 176 C 210 176 200 250 304 250" />
      <path d="M 359 98 C 440 98 428 176 515 176" />
      <path d="M 359 250 C 440 250 428 176 515 176" />
      <circle className="packet packet-one" r="4"><animateMotion dur="2.8s" repeatCount="indefinite" path="M 104 176 C 210 176 200 98 304 98"/></circle>
      <circle className="packet packet-two" r="4"><animateMotion dur="3.5s" repeatCount="indefinite" path="M 104 176 C 210 176 200 250 304 250"/></circle>
    </svg>
    <div className="mesh-item mesh-user"><Activity size={24}/><small>TRAFFIC</small></div>
    <div className="mesh-item mesh-balancer"><Network size={24}/><small>GATEWAY</small></div>
    <div className="mesh-item mesh-server-one"><Server size={22}/><small>NODE A</small></div>
    <div className={`mesh-item mesh-server-two ${failure?'is-offline':''}`}><Server size={22}/><small>NODE B</small></div>
    <div className="mesh-item mesh-out"><CheckCircle2 size={24}/><small>RESPONSE</small></div>
    <div className="mesh-bottom"><div><span className="metric-name">Throughput model</span><strong>{failure?'1 active node':'2 active nodes'}</strong></div><button onClick={()=>setFailure(v=>!v)} className="mesh-toggle" aria-pressed={failure}>{failure?'Restore node':'Simulate node failure'} <ArrowRight size={14}/></button></div>
  </div>;
}
export default function Home() {
  return <main className="home">
    <header className="home-header"><div className="home-header-inner"><Brand/><nav aria-label="Primary navigation"><a href="#platform">Platform</a><a href="#capabilities">Capabilities</a><a href="#methodology">Methodology</a></nav><Link className="header-cta" href="/dashboard">Open platform <ArrowUpRight size={16}/></Link></div></header>
    <section className="hero"><div className="hero-dots"/><div className="hero-inner">
      <div className="hero-copy"><Eyebrow>THE NEXT STANDARD IN RELEASE INTELLIGENCE</Eyebrow>
        <h1>Know the limits.<br/><em>Before</em> they matter.</h1>
        <p>Understand how infrastructure behaves under pressure. Model capacity, explore failure scenarios, and turn complex signals into clearer release decisions.</p>
        <div className="hero-actions"><Link href="/simulation" className="btn btn-primary">Explore simulation lab <ArrowRight size={17}/></Link><Link href="/dashboard" className="text-button">View platform overview <ArrowUpRight size={16}/></Link></div>
        <div className="hero-proof"><span className="proof-line"/><span>DETERMINISTIC MODELS</span><span className="proof-dot"/> <span>EXPLAINABLE VERDICTS</span><span className="proof-dot"/> <span>OPENAPI FIRST</span></div>
      </div>
      <div className="hero-art"><div className="visual-overline"><span>01 / INFRASTRUCTURE MODEL</span><span>INTERACTIVE PREVIEW <span className="asterisk">✳</span></span></div><Mesh/><div className="hero-visual-foot"><span>Digital twin · Simulation preview</span><span>Drag your assumptions into the light <ArrowUpRight size={14}/></span></div></div>
    </div></section>
    <section className="value-band"><div><span className="band-index">01 — VISIBILITY</span><strong>Observe the system.</strong><p>Know where pressure accumulates.</p></div><div><span className="band-index">02 — EXPERIMENTATION</span><strong>Challenge assumptions.</strong><p>Test scenarios without touching production.</p></div><div><span className="band-index">03 — CONFIDENCE</span><strong>Explain every decision.</strong><p>Trace verdicts back to the model.</p></div></section>
    <section className="home-feature" id="platform"><div className="feature-intro"><Eyebrow>THE PLATFORM</Eyebrow><h2>More than a verdict.<br/><span>A clearer picture.</span></h2><p>Purpose-built for engineering teams that need to see the consequences of load changes—not just read numbers in a report.</p><Link className="inline-link" href="/dashboard">Explore the dashboard <ArrowUpRight size={17}/></Link></div>
      <div className="feature-dashboard"><div className="feature-dashboard-top"><span className="mini-brand">● SERVERAGENT / ANALYTICS</span><span className="mini-status">● DEMONSTRATION DATA</span></div><div className="feature-dashboard-title">Capacity intelligence <small>MODEL OVERVIEW</small></div><div className="feature-metrics"><div><small>REQUEST VOLUME</small><strong>1.2k<span> RPS</span></strong><span>Example scenario</span></div><div><small>CPU PRESSURE</small><strong>76<span>%</span></strong><span>Sample reading</span></div><div><small>MODEL VERDICT</small><strong className="feature-good">Stable</strong><span>Illustrative status</span></div></div><MicroChart values={[22,29,25,36,40,37,47,58,51,64,58,65,74,66,81,76]} height={175}/><div className="feature-dashboard-foot"><span>0:00</span><span>Model trend — illustrative, not live telemetry</span><span>1:00</span></div></div>
    </section>
    <section className="capabilities" id="capabilities"><div className="capabilities-inner"><Eyebrow>ENGINEERED FOR DECISIONS</Eyebrow><div className="capabilities-heading"><h2>From hypotheses<br/>to evidence.</h2><p>One connected workspace for capacity assessment, infrastructure scenarios and engineering assurance.</p></div><div className="capability-grid">
      {[{no:'01',icon:<FlaskConical size={27}/>,title:'Simulation Lab',text:'Explore rules-based and discrete-event models. Compare normal, peak and stress workloads before release.',href:'/simulation'},
      {no:'02',icon:<Network size={27}/>,title:'Topology Explorer',text:'Watch requests move through a modeled network. Take nodes offline and observe how traffic redistributes.',href:'/topology'},
      {no:'03',icon:<ShieldCheck size={27}/>,title:'Engineering Quality',text:'Bring tests, quality gates and deployment checks into one transparent engineering view.',href:'/quality'}].map(item=><Link href={item.href} className="capability-card" key={item.no}><div className="capability-top"><span>{item.no} / CAPABILITY</span><MoveUpRight size={18}/></div><span className="capability-icon">{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p><span className="capability-link">Explore capability <ArrowRight size={15}/></span></Link>)}
    </div></div></section>
    <section className="method" id="methodology"><div className="method-inner"><div><Eyebrow>BUILT ON EXPLAINABILITY</Eyebrow><h2>No black boxes.<br/><em>Just better questions.</em></h2></div><div className="method-text"><p>ServerAgent starts with established analytical rules and a SimPy discrete-event engine, then layers clear metrics and evidence on top. Every prediction is a model output—with assumptions you can inspect.</p><Link href="/developer" className="btn btn-outline">Explore the JSON API <ArrowUpRight size={17}/></Link></div></div></section>
    <footer className="home-footer"><Brand dark/><span>Simulation-led decisions, grounded in evidence.</span><span>© 2026 ServerAgent</span></footer>
  </main>;
}
