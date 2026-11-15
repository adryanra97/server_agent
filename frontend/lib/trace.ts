/** Bounded, real SimPy event-derived samples for browser reports.
 * Extras are optional to support records saved before the interactive replay.
 */
export interface TraceSample {
  second:number;
  cpu_percent:number;
  ram_percent:number;
  network_percent:number;
  queue_avg:number;
  arrivals:number;
  completed:number;
  duration_seconds?:number;
  in_flight?:number;
  connection_percent?:number;
  network_mbps?:number;
  cpu_queue_avg?:number;
}
function preserveBucket(row:TraceSample):TraceSample {
  // Keep every measured field used by SimPy Workbench's existing animation;
  // never fill absent historical fields with invented zeroes.
  return {
    second:row.second,cpu_percent:row.cpu_percent,ram_percent:row.ram_percent,
    network_percent:row.network_percent,queue_avg:row.queue_avg,
    arrivals:row.arrivals,completed:row.completed,
    ...(typeof row.duration_seconds==='number'&&Number.isFinite(row.duration_seconds)?{duration_seconds:row.duration_seconds}:{}),
    ...(typeof row.in_flight==='number'&&Number.isFinite(row.in_flight)?{in_flight:row.in_flight}:{}),
    ...(typeof row.connection_percent==='number'&&Number.isFinite(row.connection_percent)?{connection_percent:row.connection_percent}:{}),
    ...(typeof row.network_mbps==='number'&&Number.isFinite(row.network_mbps)?{network_mbps:row.network_mbps}:{}),
    ...(typeof row.cpu_queue_avg==='number'&&Number.isFinite(row.cpu_queue_avg)?{cpu_queue_avg:row.cpu_queue_avg}:{}),
  };
}
export function hasFullReplay(trace:TraceSample[]|null|undefined):boolean {
  return Array.isArray(trace)&&trace.length>=2&&trace.every(row=>
    row&&Number.isFinite(row.second)&&
    ['duration_seconds','in_flight','connection_percent','network_mbps','cpu_queue_avg']
      .every(field=>Number.isFinite(row[field as keyof TraceSample])));
}
export function compactTimeline(
  raw:TraceSample[]|null|undefined,
  maxPoints=150,
):TraceSample[]{
  if(!Array.isArray(raw)||!raw.length)return [];
  // Pick actual recorded buckets (no interpolation or invented measurements).
  const clean=raw.filter(row=>
    row&&Number.isFinite(row.second)&&
    ['cpu_percent','ram_percent','network_percent','queue_avg','arrivals','completed']
      .every(key=>Number.isFinite(row[key as keyof TraceSample]))
  );
  const count=Math.min(Math.max(2,maxPoints),200);
  if(clean.length<=count)return clean.map(preserveBucket);
  const result:TraceSample[]=[];
  for(let i=0;i<count;i++){
    const idx=Math.round(i*(clean.length-1)/(count-1));
    result.push(preserveBucket(clean[idx]));
  }
  return result;
}
