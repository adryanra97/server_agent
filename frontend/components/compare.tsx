'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, ChevronDown,
  CircleAlert, Cpu, Download, Gauge, Info, LoaderCircle, Network, Play,
  RotateCcw, Server, TrendingUp, Waves,
} from 'lucide-react';
import {
  defaultSpec, defaultLoad, requestVerdict, saveRun,
  type ServerSpec, type Load, type Engine, type VerdictResult, type VerdictRequest,
} from '../lib/model';
import { Outcome, ResourceBars } from './ui';

type Profile = {
  id:'baseline'|'spike'|'scale';
  label:string;
  description:string;
  multiplier:number;
  cores:number;
  ramMB:number;
  bandwidthMbps:number;
  maxConnections:number;
};
type Evaluated={profile:Profile;request:VerdictRequest;result:VerdictResult};
const baseProfiles:Profile[]=[
  {id:'baseline',label:'Current baseline',description:'Normal traffic on the current server',multiplier:1,cores:4,ramMB:8192,bandwidthMbps:1000,maxConnections:10000},
  {id:'spike',label:'Peak demand',description:'Double traffic without added capacity',multiplier:2,cores:4,ramMB:8192,bandwidthMbps:1000,maxConnections:10000},
  {id:'scale',label:'Capacity adjustment',description:'Test more traffic with an upgraded server',multiplier:3,cores:8,ramMB:16384,bandwidthMbps:1000,maxConnections:10000},
];
type ProfileField='multiplier'|'cores'|'ramMB'|'bandwidthMbps'|'maxConnections';
type CapacityField={label:string;key:ProfileField;unit:string;min:number;step?:number;hint:string};
const capacityFields:CapacityField[]=[
  {label:'CPU cores',key:'cores',unit:'cores',min:.01,hint:'Available compute slots'},
  {label:'Memory',key:'ramMB',unit:'MB',min:.01,hint:'Total server memory'},
  {label:'Bandwidth',key:'bandwidthMbps',unit:'Mbps',min:.01,hint:'Network link capacity'},
  {label:'Max connections',key:'maxConnections',unit:'slots',min:1,step:1,hint:'Concurrent connection slots'},
];
const loadFields:{label:string;key:keyof Load;unit:string;min:number;step?:number;hint:string}[]=[
  {label:'Base request rate',key:'rps',unit:'RPS',min:0,hint:'Arrival frequency'},
  {label:'CPU work / request',key:'avg_cpu_ms_per_req',unit:'ms',min:0,hint:'Processing effort'},
  {label:'Memory / request',key:'avg_mem_mb_per_req',unit:'MB',min:0,hint:'Memory allocation'},
  {label:'Concurrent connections',key:'concurrent_connections',unit:'slots',min:0,step:1,hint:'Declared concurrency'},
  {label:'Response payload',key:'payload_kb',unit:'KB',min:0,hint:'Bytes per completed response'},
];
const n=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:1});
const percent=(value:number)=>n(value*100)+'%';
const peak=(result:VerdictResult)=>Math.max(...Object.values(result.resources).map(x=>x.utilization));
function CountInput({value,onChange,label,unit,min,step=0.1,disabled=false}:{value:number;onChange:(v:number)=>void;label:string;unit:string;min:number;step?:number;disabled?:boolean}){
  return <label className="qa-compare-input">
    <span>{label}</span><span className="qa-compare-value"><input type="number" value={value} min={min} step={step} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} aria-label={label}/><small>{unit}</small></span>
  </label>;
}
function ProfileStatus({record}:{record:Evaluated|undefined}){
  if(!record)return <span className="qa-compare-placeholder">Ready for evaluation</span>;
  return <Outcome verdict={record.result.verdict}/>;
}
export default function Compare(){
  const [engine,setEngine]=useState<Engine>('simpy');
  const [load,setLoad]=useState<Load>({...defaultLoad});
  const [profiles,setProfiles]=useState<Profile[]>(baseProfiles.map(p=>({...p})));
  const [evaluated,setEvaluated]=useState<Evaluated[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [showAdvanced,setShowAdvanced]=useState(true);
  const byId=(id:string)=>evaluated.find(x=>x.profile.id===id);
  const hasResults=evaluated.length===profiles.length;

  const best=useMemo(()=>{
    if(!hasResults)return null;
    return evaluated.reduce((a,b)=>peak(a.result)<peak(b.result)?a:b);
  },[evaluated,hasResults]);

  function updateProfile(id:Profile['id'],field:ProfileField,value:number){
    setProfiles(prev=>prev.map(p=>p.id===id?{...p,[field]:value}:p));
    setEvaluated([]);setError('');
  }
  function updateLoad(field:keyof Load,value:number){
    setLoad(prev=>({...prev,[field]:value}));setEvaluated([]);setError('');
  }
  function reset(){
    setEngine('simpy');setLoad({...defaultLoad});
    setProfiles(baseProfiles.map(p=>({...p})));setEvaluated([]);setError('');
  }
  function validate():string|null{
    if(Object.values(load).some(x=>!Number.isFinite(x)||x<0))return 'All workload values must be non-negative numbers.';
    if(!Number.isInteger(load.concurrent_connections))return 'Concurrent connections must be a whole number.';
    for(const p of profiles){
      if(!Number.isFinite(p.multiplier)||p.multiplier<0)return p.label+': request multiplier must be at least zero.';
      if(!Number.isFinite(p.cores)||p.cores<=0||!Number.isFinite(p.ramMB)||p.ramMB<=0||!Number.isFinite(p.bandwidthMbps)||p.bandwidthMbps<=0||!Number.isInteger(p.maxConnections)||p.maxConnections<=0)return p.label+': server capacity must contain valid positive values.';
      if(load.rps*p.multiplier>0&&load.avg_mem_mb_per_req>p.ramMB&&engine==='simpy')return p.label+': request memory exceeds the server RAM allocation.';
      if(load.concurrent_connections*p.multiplier>100000000)return p.label+': concurrent connections exceeds the supported comparison range.';
    }
    return null;
  }
  function buildRequest(profile:Profile):VerdictRequest{
    const spec:ServerSpec={
      cpu:{cores:profile.cores,clock_ghz:defaultSpec.cpu.clock_ghz},
      ram:{total_mb:profile.ramMB},
      network:{bandwidth_mbps:profile.bandwidthMbps,max_connections:profile.maxConnections},
    };
    const adjusted:Load={
      ...load,
      rps:load.rps*profile.multiplier,
      concurrent_connections:Math.round(load.concurrent_connections*profile.multiplier),
    };
    return {engine,spec,load:adjusted};
  }
  async function run(){
    const problem=validate();
    if(problem){setError(problem);return;}
    setLoading(true);setError('');setEvaluated([]);
    try{
      const responses=await Promise.all(profiles.map(async profile=>{
        const request=buildRequest(profile);
        const result=await requestVerdict(request);
        return {profile:{...profile},request,result};
      }));
      setEvaluated(responses);
      for(const entry of [...responses].reverse()){
        saveRun({id:crypto.randomUUID(),created_at:new Date().toISOString(),
          label:'Comparison · '+entry.profile.label,
          request:entry.request,result:entry.result});
      }
    }catch(e){setError(e instanceof Error?e.message:'The evaluation service did not return a valid comparison.');}
    finally{setLoading(false);}
  }
  const rows=[
    {key:'cpu' as const,label:'CPU utilization'},
    {key:'ram' as const,label:'RAM utilization'},
    {key:'network' as const,label:'Network utilization'},
  ];
  return <div className="qa-compare">
    <section className="qa-compare-banner">
      <div><span className="role-eyebrow">CAPACITY PLANNING / WHAT-IF ANALYSIS</span>
        <h2>Change the server. <em>Change the outcome.</em></h2>
        <p>Compare three independent scenarios using an editable workload and hardware profile. Every result comes from the selected calculation engine.</p>
      </div>
      <span className="qa-compare-banner-meta"><CheckCircle2 size={17}/> Evaluated on demand</span>
    </section>

    <section className="qa-compare-setup">
      <div className="qa-compare-setup-head">
        <div><span className="role-eyebrow">01 / WORKLOAD DEFINITION</span><h3>Start with the real workload.</h3>
          <p>Define processing demand once. Each scenario can then adjust request rate and the capacity available to serve it.</p>
        </div>
        <div className="qa-compare-setup-actions">
          <label>CALCULATION ENGINE<select value={engine} onChange={e=>{setEngine(e.target.value as Engine);setEvaluated([]);}}>
            <option value="simpy">SimPy · Discrete event</option><option value="rules">Rules · Deterministic</option>
          </select></label>
          <button type="button" onClick={reset}><RotateCcw size={16}/> Reset</button>
        </div>
      </div>
      <div className="qa-compare-workload">
        {loadFields.map(field=><CountInput key={field.key} label={field.label} value={load[field.key]}
          onChange={v=>updateLoad(field.key,v)} unit={field.unit} min={field.min} step={field.step??.1}/>)}
      </div>
      <div className="qa-compare-explainer"><Info size={17}/><p>In each scenario, <strong>request rate and declared concurrency</strong> are scaled together. CPU time, memory per request, and payload size remain constant so the effect of demand and capacity is easier to interpret.</p></div>
    </section>

    <section className="qa-compare-scenarios">
      <div className="qa-compare-section-title"><span className="role-eyebrow">02 / SCENARIO DESIGN</span><h3>Three configurations. One decision.</h3>
        <p>Adjust hardware independently for every scenario. Use the capacity scenario to test whether an upgrade makes a difference.</p>
      </div>
      <div className="qa-compare-profile-grid">
        {profiles.map((profile,index)=>{
          const record=byId(profile.id);
          return <article className={'qa-compare-profile '+(record?'has-result':'')} key={profile.id}>
            <div className="qa-compare-profile-top">
              <span>SCENARIO 0{index+1}</span>
              <ProfileStatus record={record}/>
            </div>
            <h4>{profile.label}</h4><p>{profile.description}</p>
            <div className="qa-compare-demand">
              <strong>{n(load.rps*profile.multiplier)} <small>RPS</small></strong>
              <span>{n(load.concurrent_connections*profile.multiplier)} connections</span>
            </div>
            <CountInput label="Traffic multiplier" value={profile.multiplier} min={0} step={.1} unit="×" onChange={v=>updateProfile(profile.id,'multiplier',v)}/>
            <div className="qa-compare-capacity-toggle"><Cpu size={17}/> SERVER CAPACITY <span>Editable</span></div>
            <div className="qa-compare-capacity-fields">
              {capacityFields.map(field=><CountInput key={field.key} label={field.label} value={profile[field.key]} min={field.min} step={field.step??.1} unit={field.unit} onChange={v=>updateProfile(profile.id,field.key,v)}/>)}
            </div>
            {record?<div className="qa-compare-outcome">
              <div className="qa-compare-outcome-head"><span>PEAK REPORTED PRESSURE</span><strong>{percent(peak(record.result))}</strong></div>
              <ResourceBars result={record.result}/>
              <div className="qa-compare-bottleneck"><span>Limiting resource</span><strong>{record.result.bottleneck??'none'}</strong></div>
            </div>:<div className="qa-compare-pending"><Waves size={17}/> Configure then evaluate</div>}
          </article>;
        })}
      </div>
    </section>

    <div className="qa-compare-run">
      <div><span>READY TO COMPARE</span><strong>{profiles.length} independent capacity evaluations</strong>
        <small>Current configuration · sampled outcomes, not live infrastructure measurements</small></div>
      <button type="button" onClick={run} disabled={loading}>{loading?<><LoaderCircle className="spin" size={19}/> Evaluating scenarios…</>:<><Play size={18} fill="currentColor"/> Compare all scenarios <ArrowRight size={18}/></>}</button>
    </div>
    {error&&<div role="alert" className="qa-compare-error"><CircleAlert size={18}/>{error}</div>}

    {hasResults&&<section className="qa-compare-analysis">
      <div className="qa-compare-section-title"><span className="role-eyebrow">03 / DECISION EVIDENCE</span><h3>See what changed — and why.</h3>
        <p>Each bar shows the engine's reported resource demand relative to the configured server capacity. The 80% mark indicates the model's risk threshold.</p>
      </div>
      <div className="qa-compare-analysis-grid">
        <div className="qa-compare-matrix">
          <div className="qa-compare-matrix-head"><span>RESOURCE / SCENARIO</span>{evaluated.map(x=><span key={x.profile.id}>{x.profile.label}</span>)}</div>
          {rows.map(row=><div className="qa-compare-matrix-row" key={row.key}>
            <span>{row.label}</span>{evaluated.map(entry=>{
              const resource=entry.result.resources[row.key];
              return <div key={entry.profile.id} className="qa-compare-meter">
                <div className="qa-compare-meter-rail"><span className={'qa-compare-meter-fill '+(resource.status==='critical'?'critical':resource.status==='warning'?'warn':'')} style={{width:Math.min(100,resource.utilization*100)+'%'}}/></div>
                <strong>{percent(resource.utilization)}</strong>
              </div>;
            })}
          </div>)}
          <div className="qa-compare-matrix-row qa-compare-matrix-verdict"><span>Model verdict</span>
            {evaluated.map(x=><div key={x.profile.id}><Outcome verdict={x.result.verdict}/></div>)}
          </div>
        </div>
        <div className="qa-compare-recommendation"><span className="role-eyebrow">INTERPRETATION</span><Gauge size={25}/>
          <h4>{best?.profile.label} has the lowest peak resource pressure.</h4>
          <p>Its limiting resource is <strong>{best?.result.bottleneck??'none'}</strong> at <strong>{best?percent(peak(best.result)):'—'}</strong> of the model's reported capacity ratio. This is a comparison among the scenarios entered, not an automatic release approval.</p>
          <div className="qa-compare-note"><Info size={16}/><span>Results are saved to local run history, so QA can attach an actual comparison result to a release-alignment review.</span></div>
          <Link href="/alignment">Continue to release alignment <ArrowUpRight size={16}/></Link>
        </div>
      </div>
    </section>}
    <p className="qa-compare-disclosure"><Info size={16}/> SimPy uses a fixed random seed. The workload window is bounded and may be capped at 20,000 arrivals. Reported utilization above 100% reflects the engine's offered-demand estimate. Clock speed is reserved in the underlying model and is not treated as an effective tuning knob.</p>
  </div>;
}
