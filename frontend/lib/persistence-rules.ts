/** Server-side validation for the shared, *demo-only* workflow. */
export type DemoActor='qa'|'lead'|'engineer'|'manager'|'support';
export type StoredKind='run'|'alignment'|'incident'|'report';
export const ACTORS:DemoActor[]=['qa','lead','engineer','manager','support'];
export const KINDS:StoredKind[]=['run','alignment','incident','report'];
export function isActor(value:unknown):value is DemoActor{return typeof value==='string'&&ACTORS.includes(value as DemoActor);}
export function isKind(value:unknown):value is StoredKind{return typeof value==='string'&&KINDS.includes(value as StoredKind);}
type RecordData=Record<string,unknown>;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function sameFields(a:RecordData,b:RecordData,fields:string[]){return fields.every(field=>equal(a[field],b[field]));}
const alignmentCore=['id','type','createdAt','release','cycle','service','qaNotes','createdBy','runId','result','rps'];
const incidentCore=['id','type','createdAt','service','symptom','incidentType','peakRps','detectedAt','createdBy','spec','load'];
export function canStore(kind:StoredKind,actor:DemoActor,next:RecordData,previous:RecordData|null):boolean{
  const id=next.id;
  if(typeof id!=='string'||id.length<1||id.length>160)return false;
  if(previous&&previous.id!==id)return false;
  if(kind==='run'){
    if(!next.request||!next.result||typeof next.created_at!=='string')return false;
    return !previous||equal(previous,next);
  }
  if(kind==='report'){
    if(typeof next.createdAt!=='string'||typeof next.title!=='string'||!Array.isArray(next.runIds)||!Array.isArray(next.alignmentIds)||!Array.isArray(next.incidentIds))return false;
    return (!previous&&next.createdBy===actor)||!!previous&&equal(previous,next);
  }
  if(kind==='alignment'){
    if(next.type!=='alignment'||!next.result||typeof next.service!=='string'||typeof next.runId!=='string')return false;
    const status=next.status;
    if(!previous)return actor==='qa'&&next.createdBy==='qa'&&status==='review';
    if(!sameFields(previous,next,alignmentCore))return false;
    if(actor==='qa'&&previous.status==='review'&&status==='review'){
      return sameFields(previous,next,['reviewerNote','reviewedAt','signoffNote','signedAt','signedVersion']);
    }
    if(actor==='lead'&&previous.status==='review'&&(status==='returned'||status==='pending-signoff')){
      return sameFields(previous,next,['whatIf','signoffNote','signedAt','signedVersion']);
    }
    if(actor==='manager'&&previous.status==='pending-signoff'&&(status==='approved'||status==='rejected')){
      return sameFields(previous,next,['whatIf','reviewerNote','reviewedAt']);
    }
    return equal(previous,next);
  }
  if(kind==='incident'){
    if(next.type!=='incident'||!next.spec||!next.load||typeof next.service!=='string')return false;
    if(!previous)return actor==='support'&&next.createdBy==='support'&&next.status==='open';
    if(!sameFields(previous,next,incidentCore))return false;
    if(actor==='engineer'&&(previous.status==='open'||previous.status==='escalated')&&(next.status==='analyzed'||next.status==='escalated'))return true;
    return equal(previous,next);
  }
  return false;
}
