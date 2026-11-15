'use client';

import { useState } from 'react';
import { Activity, ArrowRight, BarChart3, RefreshCw } from 'lucide-react';
import { Outcome } from './ui';
import SimulationTimeline, { type TimelinePoint } from './simpy-timeline';
import TracePreview from './trace-preview';
import { hasFullReplay, type TraceSample } from '../lib/trace';
import type { Verdict } from '../lib/model';

export interface ReplayCase {
  factor:number;
  rps:number;
  verdict:Verdict;
  timeline?:TraceSample[];
}
export default function AlignmentScenarioReplay({
  cases,sectionId,onLoadReplay,heading='Explore each load scenario',
}:{
  cases:ReplayCase[];
  sectionId:string;
  heading?:string;
  onLoadReplay?:(factor:number)=>Promise<TraceSample[]>;
}){
  const [selected,setSelected]=useState<number>(cases[0]?.factor??1);
  const [loaded,setLoaded]=useState<Record<number,TraceSample[]>>({});
  const [loading,setLoading]=useState<number|null>(null);
  const [error,setError]=useState('');
  const current=cases.find(item=>item.factor===selected)??cases[0];
  if(!current)return null;
  const trace=loaded[current.factor]??current.timeline??[];
  const canAnimate=hasFullReplay(trace);
  const hasSamples=trace.length>=2;
  async function loadReplay(){
    setLoading(current.factor);setError('');
    try{
      const result=await onLoadReplay!(current.factor);
      if(!hasFullReplay(result))throw new Error('This scenario has no complete replay data. Please run the model again.');
      setLoaded(old=>({...old,[current.factor]:result}));
    }catch(error){
      setError(error instanceof Error?error.message:'SimPy could not load this replay.');
    }finally{setLoading(null);}
  }
  return <section className="tp-scenario-replay" aria-label="Interactive workload replay">
    <div className="tp-replay-heading">
      <div><span>RECORDED ENGINE VISUALIZATION</span><h3>{heading}</h3>
        <p>Select Normal, 2×, or 3× to watch the real SimPy scenario unfold over simulated seconds.</p></div>
      <BarChart3 size={24}/>
    </div>
    <div className="tp-replay-tabs" role="group" aria-label="Select workload scenario">
      {cases.slice().sort((a,b)=>a.factor-b.factor).map(item=>
        <button key={item.factor} type="button" className={item.factor===current.factor?'active':''}
          onClick={()=>{setSelected(item.factor);setError('');}} aria-pressed={item.factor===current.factor}>
          <span className="tp-replay-tab-eyebrow">{item.factor===1?'NORMAL DEMAND':item.factor+'× DEMAND'}</span>
          <span className="tp-replay-tab-main"><strong>{item.rps.toLocaleString('en-US')} RPS</strong><ArrowRight size={16}/></span>
          <Outcome verdict={item.verdict}/>
        </button>)}
    </div>
    <div className="tp-replay-panel">
      <div className="tp-replay-panel-head">
        <div><Activity size={18}/><strong>{current.factor===1?'Normal workload':current.factor+'× workload'} · {current.rps} RPS</strong></div>
        <span>{canAnimate?'ENGINE REPLAY READY':hasSamples?'RECORDED TREND AVAILABLE':'TIME SERIES NOT RECORDED'}</span>
      </div>
      {canAnimate?
        <SimulationTimeline
          key={sectionId+'-'+current.factor+'-'+trace.length}
          sectionId={sectionId+'-scenario-'+current.factor}
          replayLabel="SCENARIO REPLAY / ANIMATED SIMPY"
          analyticsLabel="SCENARIO ANALYTICS / RECORDED TIME SERIES"
          trace={trace as TimelinePoint[]}
          running={false} truncated={false} limit={trace[trace.length-1].second}
        />
      :<div className="tp-replay-fallback">
        <TracePreview points={hasSamples?trace:undefined}/>
        <p>{hasSamples?
          'A previously saved record contains a resource trend, but not all playback fields. A fresh SimPy inspection can produce the full animated replay.':
          'The selected scenario has no stored time-series replay. No animation is generated from a verdict alone.'}</p>
        {onLoadReplay&&current.verdict!=='not_assessable'&&
          <button type="button" className="tp-replay-load" onClick={()=>void loadReplay()} disabled={loading!==null}>
            {loading===current.factor?<><RefreshCw size={17}/> Loading recorded replay…</>:<><RefreshCw size={17}/> Generate replay from SimPy</>}
          </button>}
      </div>}
      {error&&<p className="tp-error" role="alert">{error}</p>}
    </div>
  </section>;
}
