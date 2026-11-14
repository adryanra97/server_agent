import Link from 'next/link';
import { ArrowUpRight, Braces, Cpu, Waves } from 'lucide-react';
import { Eyebrow, SectionHead } from './ui';
export default function Methodology(){
  return <div className="page-stack">
    <div className="method-card-grid">
      <section className="panel model-method-card"><span className="kicker">ENGINE 01 / DETERMINISTIC</span><div className="method-card-icon"><Cpu size={26}/></div><h2>Rules Engine</h2><p>Computes offered demand divided by available capacity for CPU, RAM, and network. Takes the highest utilization as the bottleneck and determines the verdict using fixed thresholds.</p><div className="formula-block"><code>CPU = RPS × CPU ms / 1000 ÷ cores</code><code>RAM = concurrent × MB/req ÷ RAM MB</code><code>Network = max(bandwidth %, connections %)</code></div></section>
      <section className="panel model-method-card"><span className="kicker">ENGINE 02 / DISCRETE EVENTS</span><div className="method-card-icon"><Waves size={26}/></div><h2>SimPy Engine</h2><p>Uses a SimPy environment with resources for CPU and connections and a container for RAM. Requests arrive with exponential interarrival times; processing continues until queued requests complete.</p><div className="method-list"><span>Poisson request arrival process</span><span>Fixed random seed for reproducibility</span><span>30-second nominal arrival window</span><span>Maximum 20,000 simulated arrivals</span></div></section>
    </div>
    <section className="panel model-facts"><SectionHead eyebrow="HOW THE SYSTEM DECIDES" title="Thresholds and interpretation"/><div className="fact-grid"><div><span className="fact-color" style={{background:'#139879'}}/><strong>Will survive</strong><p>Peak modeled utilization is below 80%.</p></div><div><span className="fact-color" style={{background:'#d39232'}}/><strong>At risk</strong><p>Peak modeled utilization is between 80% and 100%, inclusive.</p></div><div><span className="fact-color" style={{background:'#cd5269'}}/><strong>Will crash</strong><p>Peak modeled utilization is above 100%.</p></div></div></section>
    <section className="panel model-facts"><SectionHead eyebrow="MODEL SCOPE" title="Understand the modeling assumptions"/><div className="model-limits">
      <div><span>01</span><div><strong>Clock speed is not used in the calculation.</strong><p>CPU capacity is calculated using core count and processing time per request.</p></div></div>
      <div><span>02</span><div><strong>Confidence is a heuristic, not a measured probability.</strong><p>It is higher when modeled utilization is farther from the verdict thresholds.</p></div></div>
      <div><span>03</span><div><strong>SimPy is reproducible for the same input.</strong><p>The engine fixes its random seed and simulation settings. Use the same inputs to reproduce the scenario.</p></div></div>
      <div><span>04</span><div><strong>Both engines are single-server capacity models.</strong><p>They do not currently model load balancers, multiple server nodes, real-world timeouts, database latency or observed service failures.</p></div></div>
    </div></section>
    <div className="insight-bar"><span className="insight-symbol"><Braces size={18}/></span><div><strong>Explore the exact JSON contract.</strong><span>Explore supported request fields, response data, and API examples.</span><Link href="/developer" className="inline-link">Open API Explorer <ArrowUpRight size={15}/></Link></div></div>
  </div>;
}
