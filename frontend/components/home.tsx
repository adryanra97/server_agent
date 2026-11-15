'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Activity, ArrowDownRight, CheckCircle2,
  BarChart3, Braces, Cpu, Gauge, GitBranch, Layers3, Play, Server, ShieldCheck, Waves,
} from 'lucide-react';
import { defaultLoad, defaultSpec, requestVerdict, type Engine, type VerdictResult } from '../lib/model';
import { Brand, Eyebrow, Outcome, ResourceBars } from './ui';

export default function Home(){
  const [engine,setEngine]=useState<Engine>('simpy');
  const [health,setHealth]=useState<'checking'|'online'|'unavailable'>('checking');
  useEffect(()=>{
    fetch('/health',{cache:'no-store'})
      .then(async response=>response.ok?response.json():Promise.reject(new Error('health unavailable')))
      .then(data=>setHealth(data.status==='ok'?'online':'unavailable'))
      .catch(()=>setHealth('unavailable'));
  },[]);
  const [result,setResult]=useState<VerdictResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function tryExample(){
    setBusy(true);setError('');setResult(null);
    try{setResult(await requestVerdict({engine,spec:defaultSpec,load:{...defaultLoad,rps:360}}));}
    catch(e){setError(e instanceof Error?e.message:'The API could not be reached.');}
    finally{setBusy(false);}
  }
  return <main className="home">
    <header className="home-header"><div className="home-header-inner"><Brand/><nav aria-label="Primary"><a href="#engines">Engines</a><a href="#how-it-works">How it works</a><a href="/docs" target="_blank" rel="noopener noreferrer">API Docs</a></nav><Link className="header-cta" href="/demo">Explore role demo <ArrowUpRight size={16}/></Link></div></header>
    <section className="truth-hero"><div className="truth-inner">
      <div className="truth-copy">
        <Eyebrow>CAPACITY INTELLIGENCE / SIMPY DISCRETE-EVENT ENGINE</Eyebrow>
        <h1>Will your server<br/><em>survive the load?</em></h1>
        <p>Model CPU, memory, and network demand against server capacity. Explore request arrivals, CPU processing, memory use, and network demand through the SimPy engine. Explore resource pressure and the evidence behind each capacity verdict.</p>
        <div className="truth-actions"><Link href="/demo" className="btn btn-primary">Explore role demo <ArrowRight size={17}/></Link><a className="text-button" href="/docs" target="_blank" rel="noopener noreferrer">Explore the OpenAPI <ArrowUpRight size={16}/></a></div>
        <div className="truth-facts"><span>01 / TWO ENGINES</span><span>02 / THREE RESOURCES</span><span>03 / EXPLAINABLE RESULTS</span></div>
      </div>
      <div className="truth-console">
        <div className="truth-console-top"><span className="kicker">CAPACITY EVALUATION</span><span className="truth-indicator"><span className="live-indicator"/> {health==='online'?'ENGINE ONLINE':health==='checking'?'CHECKING ENGINE':'ENGINE UNAVAILABLE'}</span></div>
        <div className="truth-console-title"><div><small>SERVER PROFILE</small><h3>4 CPU cores · 8 GB RAM</h3><span>1,000 Mbps bandwidth · 10,000 connections</span></div><Cpu size={25}/></div>
        <div className="truth-request"><span>TEST WORKLOAD</span><strong>360 <small>requests / second</small></strong><p>10 ms CPU / request · 100 connections · 10 KB payload</p></div>
        <div className="truth-choice"><span>ENGINE</span><div><button className={engine==='rules'?'active':''} onClick={()=>{setEngine('rules');setResult(null)}}>Rules</button><button className={engine==='simpy'?'active':''} onClick={()=>{setEngine('simpy');setResult(null)}}>SimPy</button></div></div>
        <button className="btn btn-primary truth-run" onClick={tryExample} disabled={busy}><Play size={16} fill="currentColor"/>{busy?'Evaluating…':'Evaluate this example'}<ArrowRight size={16}/></button>
        {result?<div className="truth-result"><div className="truth-result-head"><span className="kicker">CAPACITY RESULT</span><Outcome verdict={result.verdict}/></div><ResourceBars result={result}/><p>Bottleneck: <strong>{result.bottleneck??'none'}</strong> · Heuristic confidence: <strong>{(result.confidence*100).toFixed(0)}%</strong></p></div>:<div className="truth-await"><Gauge size={19}/><span>Run the example to see the estimated resource pressure and capacity verdict.</span></div>}
        {error&&<p role="alert" className="error-box">{error}</p>}
      </div>
    </div></section>
    <section className="truth-strip"><div><span>PROVENANCE</span><strong>Engine methodology</strong><p>Two complementary capacity evaluation models.</p></div><div><span>VERDICTS</span><strong>Survive · Risk · Crash</strong><p>Capacity thresholds at 80% and 100%.</p></div><div><span>OUTPUT</span><strong>Metrics & reasoning</strong><p>Every response includes the model’s calculation details.</p></div></section>
    <section className="home-roles" aria-labelledby="home-roles-title"><div className="home-roles-head"><span className="role-eyebrow">ROLE-BASED WORKFLOW / AKPSI</span><h2 id="home-roles-title">Five roles. <em>One shared decision trail.</em></h2><p>Explore distinct workspaces for QA, Technical Lead, Integration Engineer, Project Manager, and Support & Monitoring. Each persona has different responsibilities.</p><Link href="/demo">Choose a demo role <ArrowUpRight size={18}/></Link></div><div className="home-role-row"><div><span>01</span><strong>QA Tester</strong><small>Run simulations</small></div><div><span>02</span><strong>Technical Lead</strong><small>Review readiness</small></div><div><span>03</span><strong>Project Manager</strong><small>Approve sign-off</small></div><div><span>04</span><strong>Integration Engineer</strong><small>Test mitigation</small></div><div><span>05</span><strong>Support & Monitoring</strong><small>Escalate & report</small></div></div></section>
    <section id="engines" className="truth-section"><div className="truth-section-intro"><Eyebrow>TWO COMPLEMENTARY ENGINES</Eyebrow><h2>One question.<br/><span>Two ways to answer.</span></h2><p>Both engines share the exact same input and output schema, so you can explore the same server under the same demand assumptions.</p></div>
      <div className="truth-engine-grid"><Link href="/demo" className="truth-engine-card"><div className="truth-engine-top"><span>REFERENCE / RULES</span><ArrowUpRight size={19}/></div><span className="truth-engine-icon"><BarChart3 size={27}/></span><h3>Rules engine</h3><p>Fast, deterministic demand-versus-capacity formulas. Ideal when you need a transparent calculation and clear bottleneck indicators.</p><span className="truth-engine-link">Explore rules <ArrowRight size={15}/></span></Link><Link href="/demo" className="truth-engine-card"><div className="truth-engine-top"><span>ENGINE / 01</span><ArrowUpRight size={19}/></div><span className="truth-engine-icon"><Waves size={27}/></span><h3>SimPy engine</h3><p>Discrete-event modeling of arriving requests moving through CPU, RAM and network resources, using a repeatable random seed.</p><span className="truth-engine-link">Explore SimPy <ArrowRight size={15}/></span></Link></div>
    </section>
    <section className="truth-how" id="how-it-works"><div className="truth-how-inner"><div><Eyebrow>FROM INPUT TO EVIDENCE</Eyebrow><h2>Less guessing.<br/><em>More understanding.</em></h2></div><div className="truth-process">
      <div><span>01</span><div><strong>Describe the server</strong><p>Enter CPU cores, memory, bandwidth, and connection limits.</p></div></div><div><span>02</span><div><strong>Define the request load</strong><p>Set RPS, CPU time per request, memory per request, concurrency, and payload size.</p></div></div><div><span>03</span><div><strong>Read the verdict</strong><p>See resource utilization, the limiting resource, confidence heuristic, and reasons.</p></div></div>
    </div></div></section>
    <section className="truth-cta"><div><Eyebrow>ENGINEERING, MADE VISIBLE</Eyebrow><h2>Understand your limits<br/>before you reach them.</h2></div><Link href="/demo" className="btn btn-primary">Explore role demo <ArrowRight size={18}/></Link></section>
    <footer className="home-footer"><Brand dark/><span>Server capacity intelligence · Evidence for better decisions</span><span>2026 © ServerAgent</span></footer>
  </main>;
}
