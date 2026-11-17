import postgres from 'postgres';
import {canStore,type DemoActor,type StoredKind} from './persistence-rules';

let client:ReturnType<typeof postgres>|undefined;
function db(){
  const url=process.env.TWINPEAK_DATABASE_URL;
  if(!url)throw Error('Workspace database not configured');
  if(!client)client=postgres(url,{ssl:'require',max:2,idle_timeout:10,connect_timeout:8});
  return client;
}
export interface StoredRecord{kind:StoredKind; id:string; data:Record<string,unknown>; status:string;}
export async function readWorkspace(){
  const rows=await db().unsafe('SELECT kind,id,payload,record_status FROM twinpeak_workspace_records ORDER BY created_at DESC LIMIT 1000');
  return rows.map(row=>({kind:row.kind,id:row.id,data:row.payload,status:row.record_status})) as StoredRecord[];
}
export class StorageReject extends Error{constructor(public status:number,message:string){super(message);}}
export async function writeWorkspace(kind:StoredKind,actor:DemoActor,data:Record<string,unknown>){
  const id=String(data.id);
  const status=kind==='alignment'||kind==='incident'?String(data.status):'completed';
  const service=typeof data.service==='string'?data.service:(typeof data.label==='string'?data.label:'');
  return db().begin(async tx=>{
    const found=await tx.unsafe('SELECT payload,record_status FROM twinpeak_workspace_records WHERE kind=$1 AND id=$2 FOR UPDATE',[kind,id]);
    const previous=(found[0]?.payload??null) as Record<string,unknown>|null;
    if(!canStore(kind,actor,data,previous))throw new StorageReject(409,'This role cannot apply the requested record or workflow transition.');
    if(previous&&JSON.stringify(previous)===JSON.stringify(data))return {saved:true,unchanged:true};
    if(previous){
      await tx.unsafe('UPDATE twinpeak_workspace_records SET payload=$3::jsonb,record_status=$4,updated_at=now() WHERE kind=$1 AND id=$2',[kind,id,JSON.stringify(data),status]);
    }else{
      await tx.unsafe('INSERT INTO twinpeak_workspace_records(kind,id,payload,actor,record_status,service) VALUES($1,$2,$3::jsonb,$4,$5,$6)',[kind,id,JSON.stringify(data),actor,status,service.slice(0,180)]);
    }
    await tx.unsafe('INSERT INTO twinpeak_workspace_events(kind,record_id,actor,previous_status,new_status) VALUES($1,$2,$3,$4,$5)',[kind,id,actor,found[0]?.record_status??null,status]);
    return {saved:true,unchanged:false};
  });
}
