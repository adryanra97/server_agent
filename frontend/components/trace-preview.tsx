'use client';
import type { TraceSample } from '../lib/trace';

type Trend={key:'cpu_percent'|'ram_percent'|'network_percent';name:string;color:string};
const trends:Trend[]=[
  {key:'cpu_percent',name:'CPU',color:'#1278B7'},
  {key:'ram_percent',name:'Memory',color:'#12A18C'},
  {key:'network_percent',name:'Network',color:'#C18B49'},
];
export default function TracePreview({points}:{points:TraceSample[]|undefined}){
  if(!points||points.length<2)return <div className="tp-trace-empty">No per-second SimPy trace was saved for this evaluation. Run a new simulation to attach an actual time-series chart.</div>;
  const W=660,H=192,left=43,right=644,top=23,bottom=145;
  const min=points[0].second,max=points[points.length-1].second;
  const highest=Math.max(100,...points.flatMap(p=>trends.map(t=>Math.max(0,p[t.key]))));
  const topValue=Math.max(100,Math.ceil(highest/25)*25);
  const x=(second:number)=>left+(second-min)/Math.max(1,max-min)*(right-left);
  const y=(v:number)=>bottom-Math.max(0,Math.min(1,v/topValue))*(bottom-top);
  const line=(key:Trend['key'])=>points.map((p,i)=>(i?'L':'M')+x(p.second).toFixed(1)+' '+y(p[key]).toFixed(1)).join(' ');
  return <div className="tp-trace-preview">
    <div className="tp-trace-heading"><strong>Recorded resource utilization over time</strong><span>{points.length} sampled seconds</span></div>
    <svg viewBox={'0 0 '+W+' '+H} role="img" aria-label="Recorded SimPy CPU, memory, and network percentages over simulated seconds">
      {[0,1,2,3,4].map(i=>{
        const value=topValue*i/4,gy=y(value);
        return <g key={i}><line x1={left} y1={gy} x2={right} y2={gy} stroke="#DFEAF2" strokeWidth="1"/>
          <text x={left-7} y={gy+4} textAnchor="end" fontSize="11" fill="#52758D">{value.toFixed(0)}%</text></g>;
      })}
      {trends.map(t=><path key={t.key} d={line(t.key)} fill="none" stroke={t.color} strokeWidth="2.5" strokeLinejoin="round"/>)}
      <text x={left} y={bottom+20} fontSize="11" fill="#52758D">{min}s</text>
      <text x={right} y={bottom+20} textAnchor="end" fontSize="11" fill="#52758D">{max}s</text>
      {trends.map((t,i)=><g key={t.key} transform={'translate('+(left+i*129)+',180)'}>
        <rect width="11" height="4" y="-4" rx="2" fill={t.color}/><text x="17" fontSize="11" fill="#315D7B">{t.name}</text></g>)}
    </svg>
    <p>Source: recorded SimPy event buckets, not production telemetry. Only original recorded points are connected.</p>
  </div>;
}
