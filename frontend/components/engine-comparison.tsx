import {CheckCircle2,CircleAlert} from 'lucide-react';
import type {VerdictResult} from '../lib/model';
import {Outcome} from './ui';

const metrics=[
  {key:'cpu',name:'CPU'},
  {key:'ram',name:'RAM'},
  {key:'network',name:'NETWORK'},
] as const;
const pc=(value:number)=>Number.isFinite(value)?(value*100).toFixed(1)+'%':'—';
const gap=(a:number,b:number)=>Math.abs((a-b)*100);
export default function EngineComparison({simpy,rules}:{simpy:VerdictResult;rules:VerdictResult}){
  const values=metrics.map(metric=>({
    ...metric,
    simpy:simpy.resources[metric.key].utilization,
    rules:rules.resources[metric.key].utilization,
    difference:gap(simpy.resources[metric.key].utilization,rules.resources[metric.key].utilization),
  }));
  const axisMax=Math.max(100,Math.ceil(Math.max(...values.flatMap(x=>[x.simpy,x.rules]).map(n=>n*100))/25)*25);
  const largest=values.reduce((a,b)=>b.difference>a.difference?b:a);
  const agree=simpy.verdict===rules.verdict;
  const width=(value:number)=>Math.min(100,Math.max(0,value*10000/axisMax))+'%';
  return <>
    <div className="simpy-compare-grid">
      <div className="simpy-compare-engine">
        <span>DISCRETE-EVENT MODEL</span><strong>SimPy</strong><Outcome verdict={simpy.verdict}/>
      </div>
      <div className="simpy-compare-engine">
        <span>DETERMINISTIC MODEL</span><strong>Rules</strong><Outcome verdict={rules.verdict}/>
      </div>
      <div className={'simpy-compare-summary '+(agree?'agrees':'differs')}>
        {agree?<CheckCircle2 size={20}/>:<CircleAlert size={20}/>}
        <div><strong>{agree?'Same capacity verdict':'Different capacity verdicts'}</strong>
          <span>{largest.difference>0?'Largest utilization gap: '+largest.name+' · '+largest.difference.toFixed(1)+' percentage points':'All displayed resource ratios are identical'}</span>
        </div>
      </div>
    </div>
    <div className="simpy-compare-metrics-head">
      <div><h4>Resource-by-resource comparison</h4><p>Read values side by side. The difference is in percentage points (pp).</p></div>
      <span>SHARED BAR SCALE 0–{axisMax.toLocaleString('en-US')}%</span>
    </div>
    <div className="simpy-difference-grid" role="list" aria-label="Engine resource utilization comparison">
      {values.map(row=><article key={row.key} role="listitem"
        className={'simpy-compare-metric '+(largest.difference>0&&row.key===largest.key?'largest-gap':'')}>
        <div className="simpy-compare-metric-head">
          <strong>{row.name}</strong>
          <span><b>{row.difference.toFixed(1)}</b> pp apart</span>
        </div>
        <div className="simpy-compare-meter" role="group" aria-label={row.name+' comparison'}>
          <div className="simpy-compare-meter-label"><span>SimPy</span><strong>{pc(row.simpy)}</strong></div>
          <div className="simpy-compare-track"><span className="simpy-compare-fill simpy" style={{width:width(row.simpy)}}/></div>
          <div className="simpy-compare-meter-label"><span>Rules</span><strong>{pc(row.rules)}</strong></div>
          <div className="simpy-compare-track"><span className="simpy-compare-fill rules" style={{width:width(row.rules)}}/></div>
        </div>
      </article>)}
    </div>
    <p className="simpy-compare-caption">SimPy samples arrivals over time; Rules estimates demand deterministically. Matching verdicts can still have different resource utilization. Each pair of bars uses the same labeled scale; these are modeled outputs, not live infrastructure measurements.</p>
  </>;
}
