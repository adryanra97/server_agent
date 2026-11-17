/** Recover PostgreSQL JSONB values and old browser caches that were JSON-encoded twice.
 * Keep all stored data intact; callers choose how to handle an invalid record.
 */
export type WorkspaceKind='run'|'alignment'|'incident'|'report';
export function decodeWorkspaceRecord(value:unknown):Record<string,unknown>|null{
  try{
    const decoded=typeof value==='string'?JSON.parse(value) as unknown:value;
    return decoded!==null&&typeof decoded==='object'&&!Array.isArray(decoded)
      ?decoded as Record<string,unknown>:null;
  }catch{return null;}
}
export function normalizeWorkspaceRecord(kind:WorkspaceKind,value:unknown):Record<string,unknown>|null{
  const record=decodeWorkspaceRecord(value);
  if(!record||typeof record.id!=='string'||!record.id)return null;
  if(kind==='run')return typeof record.created_at==='string'&&
    typeof record.result==='object'&&record.result!==null&&
    typeof (record.result as Record<string,unknown>).verdict==='string' ?record:null;
  if(kind==='report')return typeof record.createdAt==='string'?record:null;
  return typeof record.updatedAt==='string'&&typeof record.status==='string'?record:null;
}
