import {NextRequest,NextResponse} from 'next/server';
import {isKind} from '../../../../lib/persistence-rules';
import {getSessionRole,sameOrigin,workspaceConfigured} from '../../../../lib/workspace-auth';
import {readWorkspace,writeWorkspace,StorageReject} from '../../../../lib/workspace-db';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest){
  if(!workspaceConfigured())return NextResponse.json({error:'Cloud storage unavailable'},{status:503,headers});
  const actor=getSessionRole(request);
  if(!actor)return NextResponse.json({error:'Demo session required'},{status:401,headers});
  try{return NextResponse.json({items:await readWorkspace(),role:actor},{headers});}
  catch{return NextResponse.json({error:'Database read unavailable. Local history was not changed.'},{status:503,headers});}
}
export async function POST(request:NextRequest){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403,headers});
  if(!workspaceConfigured())return NextResponse.json({error:'Cloud storage unavailable'},{status:503,headers});
  const actor=getSessionRole(request);
  if(!actor)return NextResponse.json({error:'Demo session required'},{status:401,headers});
  const raw=await request.text();
  if(raw.length>1024*1024)return NextResponse.json({error:'Record exceeds 1 MB limit'},{status:413,headers});
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400,headers});}
  if(!input||typeof input!=='object')return NextResponse.json({error:'Invalid record'},{status:400,headers});
  const {kind,data}=input as Record<string,unknown>;
  if(!isKind(kind)||!data||typeof data!=='object'||Array.isArray(data))
    return NextResponse.json({error:'Invalid record kind or payload'},{status:422,headers});
  try{return NextResponse.json(await writeWorkspace(kind,actor,data as Record<string,unknown>),{headers});}
  catch(error){
    if(error instanceof StorageReject)return NextResponse.json({error:error.message},{status:error.status,headers});
    return NextResponse.json({error:'Database write failed. Keep this record locally and retry.'},{status:503,headers});
  }
}
