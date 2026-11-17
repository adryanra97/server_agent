/** Browser-side cache and cloud sync for the guided demo.
 * The server is authoritative only after a validated cloud session and successful read.
 * Local-only entries are deliberately NOT imported automatically.
 */
export type WorkspaceStorage='local'|'connecting'|'cloud'|'error';
export type PersistedKind='run'|'alignment'|'incident'|'report';
type Item={kind:PersistedKind;id:string;data:Record<string,unknown>};
let state:WorkspaceStorage='local';
let activeRole:string|null=null;
let inFlight:Promise<boolean>|null=null;
let writeTail:Promise<unknown>=Promise.resolve();
let pendingWrites=0;
const localRuns='serveragent-copdash-runs';
const localRecords='serveragent-demo-records-v1';
const localReports='twinpeak-report-export-records-v1';
export const storageStatus=()=>state;
const notify=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('twinpeak-storage-status'));};
function change(next:WorkspaceStorage){state=next;notify();}
function installSnapshot(items:Item[]){
  if(typeof window==='undefined')return;
  const pick=(kind:PersistedKind)=>items.filter(item=>item.kind===kind).map(item=>item.data);
  const runs=pick('run').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  const alignments=pick('alignment').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const incidents=pick('incident').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const reports=pick('report').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  window.localStorage.setItem(localRuns,JSON.stringify(runs));
  window.localStorage.setItem(localRecords,JSON.stringify({alignments,incidents}));
  window.localStorage.setItem(localReports,JSON.stringify(reports));
  for(const event of ['serveragent-history','serveragent-demo-records','twinpeak-report-history'])window.dispatchEvent(new Event(event));
}
async function retrieveSnapshot(){
  const response=await fetch('/api/workspace/data',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Cloud history unavailable');
  const result=await response.json() as {items?:Item[]};
  if(!Array.isArray(result.items))throw Error('Cloud history response invalid');
  if(pendingWrites===0)installSnapshot(result.items);
}
export async function startWorkspaceSession(role:string,password='demo123'):Promise<boolean>{
  if(typeof window==='undefined')return false;
  if(state==='cloud'&&role===activeRole){await refreshWorkspace();return state==='cloud';}
  if(inFlight&&role===activeRole)return inFlight;
  activeRole=role;
  change('connecting');
  const task=(async()=>{
    try{
      const response=await fetch('/api/workspace/session',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({role,password})});
      if(!response.ok){change('local');return false;}
      await retrieveSnapshot();
      change('cloud');
      return true;
    }catch{change('error');return false;}
  })();
  inFlight=task;
  try{return await task;}finally{if(inFlight===task)inFlight=null;}
}
export async function refreshWorkspace():Promise<void>{
  if(state!=='cloud'||pendingWrites>0||!activeRole)return;
  try{await retrieveSnapshot();}catch{change('error');}
}
export function persistWorkspaceRecord(kind:PersistedKind,data:Record<string,unknown>):Promise<boolean>{
  if(typeof window==='undefined')return Promise.resolve(false);
  pendingWrites++;
  const work=writeTail.then(async()=>{
    if(inFlight)await inFlight;
    if(state!=='cloud')return false;
    try{
      const response=await fetch('/api/workspace/data',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,data})});
      if(!response.ok){change('error');return false;}
      return true;
    }catch{change('error');return false;}
  }).finally(()=>{pendingWrites--;notify();});
  writeTail=work;
  return work;
}
export async function closeWorkspaceSession(){
  activeRole=null;change('local');
  try{await fetch('/api/workspace/session',{method:'DELETE',credentials:'same-origin'});}catch{/* browser-only logout continues */}
}
export function getSavedReports():Record<string,unknown>[]{
  if(typeof window==='undefined')return [];
  try{
    const parsed=JSON.parse(window.localStorage.getItem(localReports)||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch{return [];}
}
export function storeReport(record:Record<string,unknown>){
  if(typeof window==='undefined')return;
  const reports=getSavedReports();
  window.localStorage.setItem(localReports,JSON.stringify([record,...reports.filter(item=>item.id!==record.id)]));
  window.dispatchEvent(new Event('twinpeak-report-history'));
  void persistWorkspaceRecord('report',record);
}
