'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ChevronLeft, ChevronRight, Cpu, Database,
  Info, Network, Pause, Play, RotateCcw, Waves, Server, HardDrive, Router, CircleCheck, Gauge,
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

type Mode = 'compute' | 'network' | 'traffic' | 'queue';
type ValueKey = keyof Pick<TimelinePoint,
  'cpu_percent' | 'ram_percent' | 'network_percent' | 'connection_percent' |
  'arrivals' | 'completed' | 'queue_avg' | 'in_flight'>;
type Series = {key:ValueKey;label:string;color:string};
const modes:Record<Mode,{label:string;unit:string;series:Series[]}> = {
  compute:{label:'CPU & memory',unit:'%',series:[
    {key:'cpu_percent',label:'CPU occupancy',color:'#2563d9'},
    {key:'ram_percent',label:'Memory occupancy',color:'#11a69d'},
  ]},
  network:{label:'Network & connections',unit:'%',series:[
    {key:'network_percent',label:'Delivered bandwidth',color:'#2563d9'},
    {key:'connection_percent',label:'Connection occupancy',color:'#d9893b'},
  ]},
  traffic:{label:'Requests',unit:'requests / second',series:[
    {key:'arrivals',label:'Arrived',color:'#2563d9'},
    {key:'completed',label:'Completed',color:'#10a48a'},
  ]},
  queue:{label:'Waiting & in flight',unit:'requests',series:[
    {key:'queue_avg',label:'Queued (time average)',color:'#d38b35'},
    {key:'in_flight',label:'Not completed (end)',color:'#2563d9'},
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
  const [mode,setMode]=useState<Mode>('compute');
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1);
  const hasTrace=trace.length>0;
  const last=Math.max(0,trace.length-1);
  const point=trace[bound(index,0,last)]??null;

  useEffect(()=>{
    setIndex(0);
    setPlaying(trace.length>1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    return (mode==='compute'||mode==='network')?Math.max(100,Math.ceil(maximum/20)*20):
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
    const totalArrivals=trace.reduce((n,p)=>n+p.arrivals,0);
    const totalCompleted=trace.reduce((n,p)=>n+p.completed,0);
    const delivered=trace.reduce((n,p)=>n+p.completed,0);
    const firstBacklog=trace.find(p=>p.in_flight>0);
    return {first80,highest,peak,totalArrivals,totalCompleted,delivered,firstBacklog};
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


    <div className={'sa-visual-stage '+((running||playing)?'sa-stage-animated':'')} aria-label="Illustrated request journey with measured resource occupancy">
      <div className="sa-stage-top">
        <div><span className="sa-stage-kicker">NETWORK TO SERVER</span><h4>Follow the workload, not just the numbers.</h4></div>
        <span className="sa-stage-time">{hasTrace?'T + '+String(point?.second??0).padStart(2,'0')+' SEC':'READY TO RECORD'}</span>
      </div>
      <div className="sa-stage-hardware">
        <div className="sa-stage-arrivals">
          <span className="sa-stage-icon"><Activity size={28}/></span>
          <span>INCOMING TRAFFIC</span>
          <strong>{hasTrace?round(point?.arrivals??0):'—'}</strong>
          <small>requests entering</small>
          <div className="sa-stage-arrival-dots"><i/><i/><i/><i/><i/></div>
        </div>
        <div className="sa-stage-network">
          <div className="sa-stage-wire-label"><Router size={18}/><span>NETWORK LINK</span></div>
          <div className="sa-stage-wire"><span className="sa-stage-wire-track"/><b className="sa-stage-packet"/><b className="sa-stage-packet"/><b className="sa-stage-packet"/></div>
          <div className="sa-stage-traffic-meter">
            <div><span>Delivered bandwidth</span><strong>{hasTrace?round(point?.network_percent??0)+'%':'—'}</strong></div>
            <div className="sa-stage-mini-rail"><span style={{width:Math.min(100,Math.max(0,point?.network_percent??0))+'%'}}/></div>
            <small>Connection occupancy {hasTrace?round(point?.connection_percent??0)+'%':'—'}</small>
          </div>
        </div>
        <div className="sa-stage-server">
          <div className="sa-stage-server-head"><Server size={22}/><span>APPLICATION SERVER</span><span className="sa-stage-server-led"/></div>
          <div className="sa-stage-server-body">
            <div className="sa-stage-component">
              <div className="sa-stage-component-name"><Cpu size={20}/><div><strong>CPU</strong><small>Processing capacity</small></div><b>{hasTrace?round(point?.cpu_percent??0)+'%':'—'}</b></div>
              <div className="sa-stage-chip-graphic">
                <div className="sa-stage-chip"><span/><span/><span/><span/></div>
                <div className="sa-stage-hardware-meter"><span style={{width:Math.min(100,Math.max(0,point?.cpu_percent??0))+'%'}}/></div>
              </div>
            </div>
            <div className="sa-stage-component">
              <div className="sa-stage-component-name"><HardDrive size={20}/><div><strong>Memory</strong><small>Allocated to requests</small></div><b>{hasTrace?round(point?.ram_percent??0)+'%':'—'}</b></div>
              <div className="sa-stage-memory-graphic">
                <div className="sa-stage-memory-banks">{Array.from({length:12},(_,i)=>{
                  const fill=Math.max(0,Math.min(100,(point?.ram_percent??0)*12-i*100));
                  return <i key={i} style={{background:`linear-gradient(90deg,#63b9ba ${fill}%,#dce8f5 ${fill}%)`}}/>;
                })}</div>
                <div className="sa-stage-hardware-meter sa-stage-memory-meter"><span style={{width:Math.min(100,Math.max(0,point?.ram_percent??0))+'%'}}/></div>
              </div>
            </div>
          </div>
          <div className="sa-stage-server-foot"><span>SimPy model: CPU · RAM · connections</span><small>GPU not modeled</small></div>
        </div>
      </div>
      <div className="sa-stage-outputs">
        <div><CircleCheck size={19}/><span>COMPLETED</span><strong>{hasTrace?round(point?.completed??0):'—'}</strong><small>this second</small></div>
        <div><Waves size={19}/><span>IN FLIGHT</span><strong>{hasTrace?round(point?.in_flight??0):'—'}</strong><small>end of second</small></div>
        <div><Gauge size={19}/><span>WAITING</span><strong>{hasTrace?round(point?.queue_avg??0):'—'}</strong><small>second average</small></div>
      </div>
      <p className="sa-stage-explain">The hardware illustration shows aggregate occupancy from the selected simulation second. Moving particles illustrate the request path; they are not tracked individual requests.</p>
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

    <div className="timeline-chart-header"><div><span className="simpy-section-number">03 / TIME-SERIES ANALYTICS</span><h3>What changes each second?</h3><p className="sa-chart-subtitle">One question at a time. Select a metric group, then drag the timeline or click the chart.</p></div>
      {hasTrace&&<button type="button" className="timeline-export" onClick={()=>exportTrace(trace)}><ArrowDownToLine size={16}/> Export per-second CSV</button>}
    </div>

    <div className="timeline-tabs" role="group" aria-label="Chart metrics">
      {(['compute','network','traffic','queue'] as const).map(tab=><button type="button" key={tab} className={mode===tab?'active':''} onClick={()=>setMode(tab)} aria-pressed={mode===tab}>{modes[tab].label}</button>)}
    </div>

    <div className="timeline-chart-wrap">
      {hasTrace?<svg className="timeline-chart" viewBox={'0 0 '+W+' '+H} role="img" aria-label={selected.label+' per second; use timeline scrubber for keyboard navigation'} onClick={e=>moveChart(e.clientX,e.currentTarget)}>
        <title>{selected.label} by simulated second</title>
        {[0,.25,.5,.75,1].map(v=>{
          const y=PAD_T+plotH*(1-v);
          return <g key={v}><line x1={PAD_L} y1={y} x2={W-PAD_R} y2={y} stroke="#e1e8ed" strokeDasharray={v===0?'0':'4 5'}/><text x={PAD_L-11} y={y+4} fontSize={12} fill="#667f91" textAnchor="end">{round(v*maxValue)}</text></g>;
        })}
        {(mode==='compute'||mode==='network')&&[80,100].map(threshold=>{
          const y=PAD_T+plotH*(1-threshold/maxValue);
          return <g key={'threshold-'+threshold}><line x1={PAD_L} y1={y} x2={W-PAD_R} y2={y} stroke={threshold===80?'#cd9851':'#dc6b78'} strokeWidth={1} strokeDasharray="5 6"/><text x={W-PAD_R-3} y={y-5} fill={threshold===80?'#aa7332':'#b34958'} textAnchor="end" fontSize={11}>{threshold===80?'Risk 80%':'Capacity 100%'}</text></g>;
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
      {selected.series.map(series=><div key={series.key}><i style={{background:series.color}}/><span>{series.label}</span><strong>{hasTrace?round(Number(point?.[series.key]??0))+(mode==='compute'||mode==='network'?'%':''):'—'}</strong></div>)}
    </div>
    {hasTrace&&insight&&<div className="sa-chart-story">
      <div className="sa-chart-story-main"><span className="simpy-section-number">WHAT THE MODEL RECORDED</span>
        <h4>{insight.first80?'CPU reached the 80% risk threshold at T + '+insight.first80.second+'s.':'CPU stayed below the 80% sampled risk threshold.'}</h4>
        <p>The highest sampled CPU occupancy was <strong>{round(insight.peak.cpu_percent)}%</strong> at second <strong>{insight.peak.second}</strong>. {insight.highest.queue_avg>0?'The average waiting queue peaked at '+round(insight.highest.queue_avg)+' requests at second '+insight.highest.second+'.':'No waiting queue developed in the recorded intervals.'} These are simulated time samples, not live server measurements.</p>
      </div>
      <div className="sa-chart-story-stat"><span>RECORDED REQUESTS</span><strong>{insight.totalCompleted.toLocaleString()} <small>/ {insight.totalArrivals.toLocaleString()}</small></strong><p>completed / arrived in displayed range</p></div>
    </div>}
    <p className="timeline-disclaimer"><Info size={15}/>{truncated?'The simulated run exceeded '+limit+' seconds, so the chart shows only the first '+limit+' one-second buckets. ':''}Elapsed time includes draining queued requests. Plotted CPU/RAM and connection pressure are time-integrated sampled occupancy; bandwidth is completed payload per bucket. The original engine verdict can use offered demand for overloaded resources.</p>
  </section>;
}
