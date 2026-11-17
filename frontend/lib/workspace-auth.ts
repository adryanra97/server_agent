import {createHmac,timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {isActor,type DemoActor} from './persistence-rules';
const COOKIE='tp-demo-session';
const TTL_SECONDS=60*60*12;
export const workspaceConfigured=()=>Boolean((process.env.DATABASE_URL||process.env.POSTGRES_URL)&&process.env.TWINPEAK_SESSION_SECRET);
function sign(payload:string){
  return createHmac('sha256',process.env.TWINPEAK_SESSION_SECRET||'unconfigured').update(payload).digest('hex');
}
export function makeSession(role:DemoActor){
  const payload=role+':'+String(Date.now()+TTL_SECONDS*1000);
  return payload+':'+sign(payload);
}
export function getSessionRole(request:NextRequest):DemoActor|null{
  if(!workspaceConfigured())return null;
  const raw=request.cookies.get(COOKIE)?.value;
  if(!raw)return null;
  const parts=raw.split(':');
  if(parts.length!==3||!isActor(parts[0]))return null;
  const [role,expiry,signature]=parts;
  if(!/^\d{13}$/.test(expiry)||Number(expiry)<Date.now())return null;
  const expected=sign(role+':'+expiry);
  if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  return role as DemoActor;
}
export const sessionCookie=COOKIE;
export const sessionTTL=TTL_SECONDS;
export function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{return new URL(origin).host===new URL(request.url).host&&new URL(origin).protocol===new URL(request.url).protocol;}
  catch{return false;}
}
