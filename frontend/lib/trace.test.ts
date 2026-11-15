import { describe, expect, it } from 'vitest';
import { compactTimeline, hasFullReplay, type TraceSample } from './trace';

const sample=(second:number):TraceSample=>({
  second,cpu_percent:second*2,ram_percent:second/2,network_percent:second,
  queue_avg:second/4,arrivals:second+1,completed:second,
  duration_seconds:1,in_flight:2,connection_percent:22,network_mbps:3,cpu_queue_avg:0,
});
describe('SimPy evidence integrity',()=>{
  it('retains the real input buckets when already within the sample limit',()=>{
    const data=Array.from({length:12},(_,i)=>sample(i));
    expect(compactTimeline(data)).toEqual(data);
  });
  it('samples a bounded trace using actual endpoints and no fabricated buckets',()=>{
    const data=Array.from({length:500},(_,i)=>sample(i));
    const result=compactTimeline(data,100);
    expect(result).toHaveLength(100);
    expect(result[0].second).toBe(0);
    expect(result.at(-1)?.second).toBe(499);
    for(const row of result)expect(data).toContainEqual(row);
  });
  it('preserves optional animation fields for the hardware replay',()=>{
    const result=compactTimeline([sample(0),sample(1)]);
    expect(hasFullReplay(result)).toBe(true);
    expect(result[0].connection_percent).toBe(22);
    expect(result[0].in_flight).toBe(2);
  });
  it('identifies incomplete historical traces without inventing zero values',()=>{
    const old=[sample(0),sample(1)].map(({second,cpu_percent,ram_percent,network_percent,queue_avg,arrivals,completed})=>
      ({second,cpu_percent,ram_percent,network_percent,queue_avg,arrivals,completed}));
    const result=compactTimeline(old);
    expect(hasFullReplay(result)).toBe(false);
    expect('in_flight' in result[0]).toBe(false);
  });
  it('removes malformed and NaN bucket data',()=>{
    const input=[sample(0),{...sample(1),cpu_percent:NaN},sample(2)];
    expect(compactTimeline(input).map(x=>x.second)).toEqual([0,2]);
  });
  it('treats null, empty and single-point traces as non-replayable',()=>{
    expect(compactTimeline(null)).toEqual([]);
    expect(compactTimeline([])).toEqual([]);
    expect(hasFullReplay([sample(0)])).toBe(false);
  });
  it('limits user-requested samples to 200',()=>{
    const rows=Array.from({length:500},(_,i)=>sample(i));
    expect(compactTimeline(rows,500).length).toBe(200);
  });
});
