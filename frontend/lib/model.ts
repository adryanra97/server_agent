import type { TraceSample } from './trace';

export type Engine = 'rules' | 'simpy';
export type Verdict = 'will_survive' | 'at_risk' | 'will_crash' | 'not_assessable';

export interface ServerSpec {
  cpu: { cores: number; clock_ghz: number };
  ram: { total_mb: number };
  network: { bandwidth_mbps: number; max_connections: number };
}
export interface Load {
  rps: number; avg_cpu_ms_per_req: number; avg_mem_mb_per_req: number;
  concurrent_connections: number; payload_kb: number;
}
export interface Resource { utilization: number; status:'ok'|'warning'|'critical'; }
export interface VerdictResult {
  verdict:Verdict; confidence:number; engine:Engine;
  bottleneck:'cpu'|'ram'|'network'|null;
  resources:{cpu:Resource;ram:Resource;network:Resource};
  reasons:string[];
}
export interface VerdictRequest { engine:Engine; spec:ServerSpec; load:Load; }
export interface HistoryItem { id:string; created_at:string; label:string; request:VerdictRequest; result:VerdictResult; timeline?:TraceSample[]; }
export const defaultSpec:ServerSpec = {
  cpu:{cores:4,clock_ghz:2.5},ram:{total_mb:8192},
  network:{bandwidth_mbps:1000,max_connections:10000},
};
export const defaultLoad:Load = {
  rps:100,avg_cpu_ms_per_req:10,avg_mem_mb_per_req:5,
  concurrent_connections:100,payload_kb:10,
};
export const verdictLabels:Record<Verdict,string> = {
  will_survive:'Lolos',at_risk:'Lolos Bersyarat',will_crash:'Tidak Lolos',not_assessable:'Tidak Dapat Dinilai',
};
export const verdictNotes:Record<Verdict,string> = {
  will_survive:'All modeled resources remain below 80% utilization.',
  at_risk:'At least one resource is between 80% and 100% utilization.',
  will_crash:'At least one resource exceeds modeled capacity.',
  not_assessable:'The engine did not return a completed evaluation. No capacity verdict is inferred.',
};
export function history():HistoryItem[]{
  if(typeof window==='undefined')return [];
  try{return JSON.parse(window.localStorage.getItem('serveragent-copdash-runs')||'[]') as HistoryItem[];}
  catch{return [];}
}
export function saveRun(record:HistoryItem){
  if(typeof window==='undefined')return;
  localStorage.setItem('serveragent-copdash-runs',JSON.stringify([record,...history()].slice(0,50)));
  window.dispatchEvent(new Event('serveragent-history'));
}
export async function requestVerdict(body:VerdictRequest):Promise<VerdictResult>{
  const response=await fetch('/verdict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const json=await response.json().catch(()=>null);
  if(!response.ok){
    const error=json?.detail;
    throw new Error(typeof error==='string'?error:`Evaluation failed (HTTP ${response.status}). Review the input parameters.`);
  }
  return json as VerdictResult;
}
export interface SimPyInspection {
  engine:'simpy';
  result:VerdictResult;
  simulation:{
    timeline:TraceSample[];
    timeline_truncated:boolean;
    timeline_limit_seconds:number;
    simulated_elapsed_seconds:number;
  };
  execution_ms:number;
}
export async function inspectSimPy(body:VerdictRequest):Promise<SimPyInspection>{
  const response=await fetch('/api/v1/simpy/inspect',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({...body,engine:'simpy'}),
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.result||!Array.isArray(data?.simulation?.timeline)){
    throw new Error(typeof data?.detail==='string'?data.detail:
      'SimPy inspection could not provide a recorded timeline.');
  }
  return data as SimPyInspection;
}
export function csvHistory(items:HistoryItem[]) {
  const cols=['id','created_at','label','engine','rps','cores','cpu','ram','network','verdict','bottleneck','confidence'];
  const encode=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
  const lines=[cols.join(','),...items.map(x=>[x.id,x.created_at,x.label,x.result.engine,x.request.load.rps,x.request.spec.cpu.cores,x.result.resources.cpu.utilization,x.result.resources.ram.utilization,x.result.resources.network.utilization,x.result.verdict,x.result.bottleneck,x.result.confidence].map(encode).join(','))];
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='serveragent-verdict-history.csv';a.click();
  URL.revokeObjectURL(url);
}
