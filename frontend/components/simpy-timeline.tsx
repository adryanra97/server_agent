'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ChevronLeft, ChevronRight, Cpu, Database,
  Info, Network, Pause, Play, RotateCcw, Waves,
} from 'lucide-react';

export type TimelinePoint = {
  second: number;
  duration_seconds: number;
  arrivals: number;
  completed: number;
  in_flight: number;
  cpu_percent: number;
  ram_percent: number;
  connection_percent: number;
  network_mbps: number;
  network_percent: number;
  queue_avg: number;
  cpu_queue_avg: number;
};

type Mode = 'pressure' | 'traffic' | 'queue';
type ValueKey = keyof Pick<TimelinePoint,
  'cpu_percent' | 'ram_percent' | 'network_percent' | 'connection_percent' |
  'arrivals' | 'completed' | 'queue_avg' | 'in_flight'>;
type Series = {key: ValueKey;label: string;color: string};
const modes: Record<Mode,{label:string;unit:string;series:Series[]}> = {
  pressure:{label:'Resource pressure',unit:'%',series:[
    {key:'cpu_percent',label:'CPU',color:'#205d9b'},
    {key:'ram_percent',label:'RAM',color:'#1eac98'},
    {key:'network_percent',label:'Bandwidth',color:'#d89a3b'},
    {key:'connection_percent',label:'Connections',color:'#8b8cb0'},
  ]},
  traffic:{label:'Request activity',unit:'requests / bucket',series:[
    {key:'arrivals',label:'Arrivals',color:'#2466af'},
    {key:'completed',label:'Completed',color:'#12a08f'},
  ]},
  queue:{label:'Backlog & waiting',unit:'requests',series:[
    {key:'queue_avg',label:'Waiting (avg)',color:'#d58b3c'},
    {key:'in_flight',label:'In flight (end)',color:'#2876ba'},
  ]},
};

const W=760;
const H=284;
const PAD_L=53;
const PAD_R=21;
const PAD_T=15;
const PAD_B=44;
const plotW=W-PAD_L-PAD_R;
const plotH=H-PAD_T-PAD_B;
const round=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:1});
const bound=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

function exportTrace(trace:TimelinePoint[]){
  const cols:(keyof TimelinePoint)[]=[
    'second','duration_seconds','arrivals','completed','in_flight',
    'cpu_percent','ram_percent','network_percent','connection_percent',
    'network_mbps','queue_avg','cpu_queue_avg',
  ];
  const rows=[cols.join(','),...trace.map(point=>cols.map(key=>point[key]).join(','))];
  const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='serveragent-simpy-per-second.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SimulationTimeline({
  trace,running,truncated,limit,
}:{
  trace:TimelinePoint[];running:boolean;truncated:boolean;limit:number;
}){
  const [index,setIndex]=useState(0);
  const [mode,setMode]=useState<Mode>('pressure');
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1);
  const hasTrace=trace.length>0;
  const last=Math.max(0,trace.length-1);
  const point=trace[bound(index,0,last)]??null;

  useEffect(()=>{
    setIndex(0);
    setPlaying(trace.length>1);
  },[trace]);

  useEffect(()=>{
    if(!playing||trace.length<2)return;
    const interval=window.setInterval(()=>{
      setIndex(current=>{
        if(current>=trace.length-1){
          setPlaying(false);
          return current;
        }
        return current+1;
      });
    },Math.round(520/speed));
    return()=>window.clearInterval(interval);
  },[playing,speed,trace.length]);

  const selected=modes[mode];
  const maxValue=useMemo(()=>{
    if(!hasTrace)return 100;
    const maximum=Math.max(0,...trace.flatMap(p=>selected.series.map(s=>Number(p[s.key])||0)));
    return mode==='pressure'?Math.max(100,Math.ceil(maximum/20)*20):
      Math.max(1,Math.ceil(maximum/5)*5);
  },[trace,hasTrace,selected,mode]);

  const chartLines=useMemo(()=>selected.series.map(series=>{
    const points=trace.map((p,i)=>{
      const x=PAD_L+(i/Math.max(1,trace.length-1))*plotW;
      const y=PAD_T+plotH*(1-Number(p[series.key])/maxValue);
      return String(x.toFixed(2))+','+String(y.toFixed(2));
    });
    return {...series,points:points.join(' ')};
  }),[selected,maxValue,trace]);

  const insight=useMemo(()=>{
    if(!hasTrace)return null;
    const first80=trace.find(p=>p.cpu_percent>=80);
    const highest=trace.reduce((a,b)=>a.queue_avg>=b.queue_avg?a:b);
    const peak=trace.reduce((a,b)=>a.cpu_percent>=b.cpu_percent?a:b);
    return {first80,highest,peak};
  },[trace,hasTrace]);

  function chooseSecond(value:number){
    setPlaying(false);
    setIndex(bound(value,0,last));
  }
  function moveChart(clientX:number,target:SVGSVGElement){
    const rect=target.getBoundingClientRect();
    const plotLeft=rect.left+PAD_L/W*rect.width;
    const plotWidth=plotW/W*rect.width;
    const offset=(clientX-plotLeft)/plotWidth;
    chooseSecond(Math.round(bound(offset,0,1)*last));
  }

  return <section className="timeline-shell" id="simpy-timeline" aria-labelledby="timeline-heading">
    <header className="timeline-head">
      <div><span className="simpy-section-number">02 / SIMULATION REPLAY</span>
        <h3 id="timeline-heading">Every second tells <em>a different story.</em></h3>
        <p>Explore resource demand, throughput, and waiting queues using one-second buckets computed from actual SimPy events.</p>
      </div>
      <div className="timeline-source"><span className="timeline-source-dot"/> {running?'COMPUTING MODEL':hasTrace?'RECORDED ENGINE DATA':'AWAITING SIMULATION'}</div>
    </header>

    <div className="flow-visual" aria-label="Simulation resource path">
      <div className="flow-topline"><span>DISCRETE EVENT MODEL</span><span>{hasTrace?'SECOND '+String(point?.second??0).padStart(2,'0'):'MODEL SCHEMATIC'}</span></div>
      <div className={'flow-rail '+((running||playing)?'flow-rail-playing':'')}>
        <div className="flow-station">
          <span className="flow-icon"><Activity size={25}/></span>
          <strong>Arrivals</strong>
          <small>{hasTrace?String(point?.arrivals??0)+' requests':'Poisson stream'}</small>
        </div>
        <div className="flow-connector"><span className="flow-packet"/></div>
        <div className="flow-station">
          <span className="flow-icon"><Network size={25}/></span>
          <strong>Connection</strong>
          <small>{hasTrace?round(point?.connection_percent??0)+'%':'Resource slot'}</small>
        </div>
        <div className="flow-connector"><span className="flow-packet"/></div>
        <div className="flow-station">
          <span className="flow-icon"><Database size={25}/></span>
          <strong>Memory</strong>
          <small>{hasTrace?round(point?.ram_percent??0)+'%':'Container'}</small>
        </div>
        <div className="flow-connector"><span className="flow-packet"/></div>
        <div className={'flow-station '+((point?.cpu_percent??0)>=80?'flow-hot':'')}>
          <span className="flow-icon"><Cpu size={25}/></span>
          <strong>CPU</strong>
          <small>{hasTrace?round(point?.cpu_percent??0)+'%':'Core processing'}</small>
        </div>
        <div className="flow-connector"><span className="flow-packet"/></div>
        <div className="flow-station">
          <span className="flow-icon"><Waves size={25}/></span>
          <strong>Response</strong>
          <small>{hasTrace?String(point?.completed??0)+' completed':'Payload exit'}</small>
        </div>
      </div>
      <div className="flow-activity">
        <div><span>QUEUED (SECOND AVG)</span><strong>{hasTrace?round(point?.queue_avg??0):'—'}</strong></div>
        <div><span>IN FLIGHT (END)</span><strong>{hasTrace?round(point?.in_flight??0):'—'}</strong></div>
        <div><span>DELIVERED PAYLOAD</span><strong>{hasTrace?round(point?.network_mbps??0)+' Mbps':'—'}</strong></div>
        <p>The flowing dots visualize the pipeline concept. Metrics are the selected second's actual aggregate, not individual request playback.</p>
      </div>
    </div>

    <div className="timeline-controls">
      <div className="timeline-controls-main">
        <button type="button" className="timeline-play" disabled={!hasTrace||last===0} onClick={()=>{if(index>=last)setIndex(0);setPlaying(!playing)}} aria-label={playing?'Pause trace replay':'Play trace replay'}>{playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}</button>
        <button type="button" className="timeline-step" disabled={!hasTrace||index===0} aria-label="Previous second" onClick={()=>chooseSecond(index-1)}><ChevronLeft size={20}/></button>
        <button type="button" className="timeline-step" disabled={!hasTrace||index===last} aria-label="Next second" onClick={()=>chooseSecond(index+1)}><ChevronRight size={20}/></button>
        <div className="timeline-current"><strong>{hasTrace?'T + '+String(point?.second??0).padStart(2,'0')+'s':'T + —'}</strong><span>{hasTrace?String(trace.length)+' sampled seconds':'Run a simulation to activate replay'}</span></div>
      </div>
      <label className="timeline-speed">SPEED
        <select value={speed} onChange={e=>setSpeed(Number(e.target.value))} aria-label="Replay speed">
          <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
        </select>
      </label>
    </div>

    <input type="range" className="timeline-scrubber" min={0} max={last} step={1} disabled={!hasTrace} value={Math.min(index,last)} onChange={e=>chooseSecond(Number(e.target.value))} aria-label="Simulation second" />
    <div className="timeline-axis-text"><span>0 seconds</span><span>{hasTrace?last+' seconds':'Awaiting simulation'}</span></div>

    <div className="timeline-chart-header"><div><span className="simpy-section-number">03 / TIME-SERIES ANALYTICS</span><h3>See the inflection point.</h3></div>
      {hasTrace&&<button type="button" className="timeline-export" onClick={()=>exportTrace(trace)}><ArrowDownToLine size={16}/> Export per-second CSV</button>}
    </div>

    <div className="timeline-tabs" role="group" aria-label="Chart metrics">
      {(['pressure','traffic','queue'] as const).map(tab=><button type="button" key={tab} className={mode===tab?'active':''} onClick={()=>setMode(tab)} aria-pressed={mode===tab}>{modes[tab].label}</button>)}
    </div>

    <div className="timeline-chart-wrap">
      {hasTrace?<svg className="timeline-chart" viewBox={'0 0 '+W+' '+H} role="img" aria-label={selected.label+' per second; use timeline scrubber for keyboard navigation'} onClick={e=>moveChart(e.clientX,e.currentTarget)}>
        <title>{selected.label} by simulated second</title>
        {[0,.25,.5,.75,1].map(v=>{
          const y=PAD_T+plotH*(1-v);
          return <g key={v}><line x1={PAD_L} y1={y} x2={W-PAD_R} y2={y} stroke="#e1e8ed" strokeDasharray={v===0?'0':'4 5'}/><text x={PAD_L-11} y={y+4} fontSize={12} fill="#667f91" textAnchor="end">{round(v*maxValue)}</text></g>;
        })}
        {chartLines.map(line=><polyline key={line.key} points={line.points} fill="none" stroke={line.color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
        {[0,.25,.5,.75,1].map(v=><text key={v} x={PAD_L+plotW*v} y={H-13} fontSize={12} fill="#718a9c" textAnchor="middle">{Math.round(v*last)+'s'}</text>)}
        <line x1={PAD_L+index/Math.max(1,last)*plotW} x2={PAD_L+index/Math.max(1,last)*plotW} y1={PAD_T} y2={PAD_T+plotH} stroke="#0b2b41" strokeWidth={1.6} strokeDasharray="5 4"/>
        {selected.series.map(series=>{
          const x=PAD_L+index/Math.max(1,last)*plotW;
          const y=PAD_T+plotH*(1-Number(point?.[series.key]??0)/maxValue);
          return <circle key={series.key} cx={x} cy={y} r={4.5} fill="#fff" stroke={series.color} strokeWidth={2.6}/>;
        })}
      </svg>:<div className="timeline-chart-empty"><Waves size={30}/><strong>Time-series data begins with a simulation.</strong><p>Run the engine to reveal recorded one-second measurements instead of placeholder chart data.</p></div>}
    </div>

    <div className="timeline-legend">
      {selected.series.map(series=><div key={series.key}><i style={{background:series.color}}/><span>{series.label}</span><strong>{hasTrace?round(Number(point?.[series.key]??0))+(mode==='pressure'?'%':''):'—'}</strong></div>)}
    </div>
    {hasTrace&&<div className="timeline-insights">
      <div><span>HIGHEST SAMPLED CPU PRESSURE</span><strong>{round(insight?.peak.cpu_percent??0)}%</strong><small>Second {insight?.peak.second??0}</small></div>
      <div><span>FIRST SAMPLED CPU ≥ 80%</span><strong>{insight?.first80?'T + '+insight.first80.second+'s':'Not reached'}</strong><small>Based on sampled utilization</small></div>
      <div><span>HIGHEST QUEUE AVERAGE</span><strong>{round(insight?.highest.queue_avg??0)}</strong><small>Second {insight?.highest.second??0}</small></div>
    </div>}
    <p className="timeline-disclaimer"><Info size={15}/>{truncated?'The simulated run exceeded '+limit+' seconds, so the chart shows only the first '+limit+' one-second buckets. ':''}Elapsed time includes draining queued requests. Plotted CPU/RAM and connection pressure are time-integrated sampled occupancy; bandwidth is completed payload per bucket. The original engine verdict can use offered demand for overloaded resources.</p>
  </section>;
}
