import type {VerdictRequest} from './model';

/** Names match visible form labels so errors are attached to their exact controls. */
export function simulationFieldIssues(body:VerdictRequest):Record<string,string>{
  const {spec,load}=body;
  const fields:{label:string;value:number;min:number}[]=[
    {label:'CPU cores',value:spec.cpu.cores,min:1},
    {label:'Total RAM',value:spec.ram.total_mb,min:1},
    {label:'Network bandwidth',value:spec.network.bandwidth_mbps,min:1},
    {label:'Maximum connections',value:spec.network.max_connections,min:1},
    {label:'Arrival rate',value:load.rps,min:0},
    {label:'CPU time / request',value:load.avg_cpu_ms_per_req,min:0},
    {label:'RAM / request',value:load.avg_mem_mb_per_req,min:0},
    {label:'Concurrent connections',value:load.concurrent_connections,min:0},
    {label:'Response payload',value:load.payload_kb,min:0},
  ];
  const issues:Record<string,string>={};
  for(const {label,value,min} of fields){
    if(!Number.isSafeInteger(value)||value<min){
      issues[label]='Enter a whole number '+(min?'greater than zero.':'of zero or greater.');
    }
  }
  if(!issues['RAM / request']&&!issues['Total RAM']&&load.rps>0&&load.avg_mem_mb_per_req>spec.ram.total_mb){
    issues['RAM / request']='Exceeds available RAM ('+spec.ram.total_mb+' MB). Reduce this value or increase total RAM.';
  }
  return issues;
}
