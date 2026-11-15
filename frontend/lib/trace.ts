/** Bounded, real SimPy event-derived samples for browser reports. */
export interface TraceSample {
  second:number;
  cpu_percent:number;
  ram_percent:number;
  network_percent:number;
  queue_avg:number;
  arrivals:number;
  completed:number;
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
  if(clean.length<=count)return clean.map(row=>({
    second:row.second,cpu_percent:row.cpu_percent,ram_percent:row.ram_percent,
    network_percent:row.network_percent,queue_avg:row.queue_avg,
    arrivals:row.arrivals,completed:row.completed,
  }));
  const result:TraceSample[]=[];
  for(let i=0;i<count;i++){
    const idx=Math.round(i*(clean.length-1)/(count-1));
    const row=clean[idx];
    result.push({
      second:row.second,cpu_percent:row.cpu_percent,ram_percent:row.ram_percent,
      network_percent:row.network_percent,queue_avg:row.queue_avg,
      arrivals:row.arrivals,completed:row.completed,
    });
  }
  return result;
}
