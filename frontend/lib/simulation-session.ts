/** Reuse a completed SimPy configuration within this browser tab only.
 * Never read the shared database to select a "latest" run: different demo users
 * may be working concurrently. A role switch cannot claim another role's inputs.
 */
import {getDemoRole} from './demo';
import {validateAlignmentInputs} from './alignment-input-validation';
import type {VerdictRequest} from './model';

export type SessionSimulation={completedAt:string;request:VerdictRequest};
const key=(role:string)=>'twinpeak:last-completed-simpy-settings:v1:'+role;
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);

export function validSimulationForAlignment(value:unknown):value is SessionSimulation{
  if(!value||typeof value!=='object')return false;
  const item=value as Partial<SessionSimulation>;
  if(typeof item.completedAt!=='string'||!Number.isFinite(Date.parse(item.completedAt)))return false;
  const request=item.request;
  if(!request||request.engine!=='simpy'||!request.spec||!request.load)return false;
  const {cpu,ram,network}=request.spec,load=request.load;
  if(!cpu||!ram||!network||!finite(cpu.clock_ghz)||cpu.clock_ghz<=0)return false;
  if(!finite(cpu.cores)||!finite(ram.total_mb)||!finite(network.bandwidth_mbps)||
    !finite(network.max_connections)||!finite(load.rps)||!finite(load.avg_cpu_ms_per_req)||
    !finite(load.avg_mem_mb_per_req)||!finite(load.concurrent_connections)||
    !finite(load.payload_kb))return false;
  return validateAlignmentInputs({
    peak:load.rps,cores:cpu.cores,ram:ram.total_mb,cpuMs:load.avg_cpu_ms_per_req,
    memPerReq:load.avg_mem_mb_per_req,concurrent:load.concurrent_connections,
    payload:load.payload_kb,bandwidth:network.bandwidth_mbps,
    maxConnections:network.max_connections,clockGhz:cpu.clock_ghz,
  })===null;
}
export function rememberLastSimulationSettings(request:VerdictRequest,completedAt:string):boolean{
  if(typeof window==='undefined')return false;
  try{
    const role=getDemoRole();
    const record={request,completedAt};
    if(!role||!validSimulationForAlignment(record))return false;
    window.sessionStorage.setItem(key(role),JSON.stringify(record));
    window.dispatchEvent(new Event('twinpeak-last-simpy-settings'));
    return true;
  }catch{return false;}
}
export function lastSimulationSettings():SessionSimulation|null{
  if(typeof window==='undefined')return null;
  try{
    const role=getDemoRole();
    if(!role)return null;
    const saved=window.sessionStorage.getItem(key(role));
    if(!saved)return null;
    const record=JSON.parse(saved) as unknown;
    return validSimulationForAlignment(record)?record:null;
  }catch{return null;}
}
