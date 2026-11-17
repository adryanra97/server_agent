import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {isActor} from '../../../../lib/persistence-rules';
import {makeSession,getSessionRole,sameOrigin,sessionCookie,sessionTTL,workspaceConfigured} from '../../../../lib/workspace-auth';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  const role=getSessionRole(request);
  return NextResponse.json({connected:workspaceConfigured(),role},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
  if(!workspaceConfigured())return NextResponse.json({error:'Cloud storage is not configured. Local demo remains available.'},{status:503});
  const raw=await request.text();
  if(raw.length>2048)return NextResponse.json({error:'Invalid request'},{status:413});
  let body:unknown;
  try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
  if(!body||typeof body!=='object')return NextResponse.json({error:'Invalid request'},{status:400});
  const {role,password}=body as Record<string,unknown>;
  if(!isActor(role)||typeof password!=='string')return NextResponse.json({error:'Invalid credentials'},{status:401});
  // Deliberately public guided DEMO password. Never accept sensitive/production records.
  const correct=process.env.TWINPEAK_DEMO_PASSWORD||'demo123';
  const input=Buffer.from(password);
  const expected=Buffer.from(correct);
  if(input.length!==expected.length||!timingSafeEqual(input,expected))
    return NextResponse.json({error:'Invalid credentials'},{status:401});
  const response=NextResponse.json({connected:true,role},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(sessionCookie,makeSession(role),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:sessionTTL});
  return response;
}
export async function DELETE(request:NextRequest){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
  const response=NextResponse.json({connected:false});
  response.cookies.set(sessionCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  return response;
}
