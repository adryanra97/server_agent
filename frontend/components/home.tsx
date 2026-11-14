'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Activity, ArrowDownRight, CheckCircle2,
  BarChart3, Braces, Cpu, Gauge, GitBranch, Layers3, Play, Server, ShieldCheck, Waves,
} from 'lucide-react';
import { defaultLoad, defaultSpec, requestVerdict, type Engine, type VerdictResult } from '../lib/model';
import { Brand, Eyebrow, Outcome, ResourceBars } from './ui';

export default function Home(){
  const [engine,setEngine]=useState<Engine>('rules');
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
    <header className="home-header"><div className="home-header-inner"><Brand/><nav aria-label="Primary"><a href="#engines">Engines</a><a href="#how-it-works">How it works</a><a href="/docs" target="_blank" rel="noopener noreferrer">API Docs</a></nav><Link className="header-cta" href="/simulation">Open evaluator <ArrowUpRight size={16}/></Link></div></header>
    <section className="truth-hero"><div className="truth-inner">
      <div className="truth-copy">
        <Eyebrow>CAPACITY INTELLIGENCE / TWO ENGINE APPROACH</Eyebrow>
        <h1>Will your server<br/><em>survive the load?</em></h1>
        <p>Model CPU, memory, and network demand against server capacity. Choose a deterministic rules engine or a discrete-event SimPy simulation—then inspect the evidence behind the verdict.</p>
        <div className="truth-actions"><Link href="/simulation" className="btn btn-primary">Evaluate your server <ArrowRight size={17}/></Link><a className="text-button" href="/docs" target="_blank" rel="noopener noreferrer">Explore the OpenAPI <ArrowUpRight size={16}/></a></div>
        <div className="truth-facts"><span>01 / TWO ENGINES</span><span>02 / THREE RESOURCES</span><span>03 / EXPLAINABLE RESULTS</span></div>
      </div>
      <div className="truth-console">
        <div className="truth-console-top"><span className="kicker">LIVE MODEL EXPERIMENT</span><span className="truth-indicator"><span className="live-indicator"/> CONNECTED TO FASTAPI</span></div>
        <div className="truth-console-title"><div><small>SERVER PROFILE</small><h3>4 CPU cores · 8 GB RAM</h3><span>1,000 Mbps bandwidth · 10,000 connections</span></div><Cpu size={25}/></div>
        <div className="truth-request"><span>TEST WORKLOAD</span><strong>360 <small>requests / second</small></strong><p>10 ms CPU / request · 100 connections · 10 KB payload</p></div>
        <div className="truth-choice"><span>ENGINE</span><div><button className={engine==='rules'?'active':''} onClick={()=>{setEngine('rules');setResult(null)}}>Rules</button><button className={engine==='simpy'?'active':''} onClick={()=>{setEngine('simpy');setResult(null)}}>SimPy</button></div></div>
        <button className="btn btn-primary truth-run" onClick={tryExample} disabled={busy}><Play size={16} fill="currentColor"/>{busy?'Evaluating…':'Evaluate this example'}<ArrowRight size={16}/></button>
        {result?<div className="truth-result"><div className="truth-result-head"><span className="kicker">BACKEND RESPONSE</span><Outcome verdict={result.verdict}/></div><ResourceBars result={result}/><p>Bottleneck: <strong>{result.bottleneck??'none'}</strong> · Heuristic confidence: <strong>{(result.confidence*100).toFixed(0)}%</strong></p></div>:<div className="truth-await"><Gauge size={19}/><span>Run the example to see a real model response, not a predetermined result.</span></div>}
        {error&&<p role="alert" className="error-box">{error}</p>}
      </div>
    </div></section>
    <section className="truth-strip"><div><span>PROVENANCE</span><strong>Built on copdash</strong><p>Original Python engines retained.</p></div><div><span>VERDICTS</span><strong>Survive · Risk · Crash</strong><p>Capacity thresholds at 80% and 100%.</p></div><div><span>OUTPUT</span><strong>Metrics & reasoning</strong><p>Every response includes the model’s calculation details.</p></div></section>
    <section id="engines" className="truth-section"><div className="truth-section-intro"><Eyebrow>BUILT ON THE ORIGINAL ENGINES</Eyebrow><h2>One question.<br/><span>Two ways to answer.</span></h2><p>Both engines share the exact same input and output schema, so you can explore the same server under the same demand assumptions.</p></div>
      <div className="truth-engine-grid"><Link href="/simulation" className="truth-engine-card"><div className="truth-engine-top"><span>ENGINE / 01</span><ArrowUpRight size={19}/></div><span className="truth-engine-icon"><BarChart3 size={27}/></span><h3>Rules engine</h3><p>Fast, deterministic demand-versus-capacity formulas. Ideal when you need a transparent calculation and clear bottleneck indicators.</p><span className="truth-engine-link">Explore rules <ArrowRight size={15}/></span></Link><Link href="/simulation" className="truth-engine-card"><div className="truth-engine-top"><span>ENGINE / 02</span><ArrowUpRight size={19}/></div><span className="truth-engine-icon"><Waves size={27}/></span><h3>SimPy engine</h3><p>Discrete-event modeling of arriving requests moving through CPU, RAM and network resources, using a repeatable random seed.</p><span className="truth-engine-link">Explore SimPy <ArrowRight size={15}/></span></Link></div>
    </section>
    <section className="truth-how" id="how-it-works"><div className="truth-how-inner"><div><Eyebrow>FROM INPUT TO EVIDENCE</Eyebrow><h2>Less guessing.<br/><em>More understanding.</em></h2></div><div className="truth-process">
      <div><span>01</span><div><strong>Describe the server</strong><p>Enter CPU cores, memory, bandwidth, and connection limits.</p></div></div><div><span>02</span><div><strong>Define the request load</strong><p>Set RPS, CPU time per request, memory per request, concurrency, and payload size.</p></div></div><div><span>03</span><div><strong>Read the verdict</strong><p>See resource utilization, the limiting resource, confidence heuristic, and reasons.</p></div></div>
    </div></div></section>
    <section className="truth-cta"><div><Eyebrow>ENGINEERING, MADE VISIBLE</Eyebrow><h2>Understand your limits<br/>before you reach them.</h2></div><Link href="/simulation" className="btn btn-primary">Start evaluating <ArrowRight size={18}/></Link></section>
    <footer className="home-footer"><Brand dark/><span>Adapted from <a href="https://github.com/mauikut-com/copdash" target="_blank" rel="noopener noreferrer">copdash</a> · Server capacity verdict platform</span><span>2026 © ServerAgent</span></footer>
  </main>;
}
