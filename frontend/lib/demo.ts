import { defaultLoad, defaultSpec, history, inspectSimPy, saveRun, type ServerSpec, type Load, type VerdictResult } from './model';
import { compactTimeline, hasFullReplay, type TraceSample } from './trace';
import { clearLLMSession } from './llm-session';

/**
 * Educational role-play ONLY. These identities and client-side permissions are
 * not authentication or server-side authorization. Never use real or sensitive data.
 */
export type DemoRole = 'lead' | 'qa' | 'engineer' | 'manager' | 'support';
export const DEMO_PASSWORD = 'demo123';
export const DEMO_SESSION_KEY = 'serveragent-demo-identity-v1';
const DATA_KEY = 'serveragent-demo-records-v1';
export interface DemoPersona {
  id: DemoRole;
  name: string;
  role: string;
  shortRole: string;
  initial: string;
  mission: string;
  next: string;
}
export const demoPersonas: DemoPersona[] = [
  {id:'qa',name:'Nadia Putri',role:'QA / Performance Tester',shortRole:'QA Tester',initial:'NP',mission:'Menyiapkan parameter, menjalankan simulasi, dan menyerahkan bukti kepada Technical Lead.',next:'Jalankan SimPy dan kirim hasil untuk alignment.'},
  {id:'lead',name:'Raka Pratama',role:'Technical Lead / Technical Specialist',shortRole:'Technical Lead',initial:'RP',mission:'Memimpin alignment rilis, meninjau verdict, dan menentukan lanjut atau kembali ke Dev.',next:'Review submission QA dan catat keputusan cycle.'},
  {id:'engineer',name:'Dina Maharani',role:'Integration Engineer / Developer',shortRole:'Integration Engineer',initial:'DM',mission:'Mereproduksi insiden dan menguji opsi mitigasi dengan simulasi yang aman.',next:'Review eskalasi dan bandingkan kondisi awal vs mitigasi.'},
  {id:'manager',name:'Alya Wibowo',role:'Project / Technical Manager',shortRole:'Project Manager',initial:'AW',mission:'Meninjau dokumen sign-off dan mencatat keputusan approval sebelum deployment.',next:'Tinjau pengajuan yang telah direkomendasikan Technical Lead.'},
  {id:'support',name:'Bima Santoso',role:'Support & Monitoring',shortRole:'Support & Monitoring',initial:'BS',mission:'Mencatat eskalasi, mengumpulkan laporan, dan melihat riwayat lintas cycle.',next:'Catat gejala insiden dan ekspor laporan.'},
];
export const allDemoRoutes = [
  {href:'/dashboard',label:'Overview'},
  {href:'/alignment',label:'Release Alignment'},
  {href:'/incident',label:'Incident Response'},
  {href:'/signoff',label:'Sign-Off'},
  {href:'/reports',label:'Report'},
  {href:'/access',label:'Access & Roles'},
  {href:'/simulation',label:'SimPy Workbench'},
  {href:'/compare',label:'Compare Loads'},
  {href:'/methodology',label:'Model Methodology'},
  {href:'/developer',label:'API Explorer'},
  {href:'/quality',label:'Engineering Quality'},
  {href:'/settings',label:'LLM Settings'},
] as const;
const allowed: Record<DemoRole, string[]> = {
  qa:['/dashboard','/alignment','/access','/simulation','/compare','/reports','/methodology','/developer','/quality','/settings'],
  lead:['/dashboard','/alignment','/incident','/signoff','/reports','/access','/methodology','/quality','/settings'],
  engineer:['/dashboard','/incident','/access','/simulation','/compare','/developer','/methodology','/quality','/settings'],
  manager:['/dashboard','/alignment','/signoff','/reports','/access','/methodology','/settings'],
  support:['/dashboard','/incident','/reports','/access','/methodology','/settings'],
};
export function allowedPages(role:DemoRole){return allDemoRoutes.filter(page=>allowed[role].includes(page.href));}
export function canVisit(role:DemoRole,path:string){return allowed[role].includes(path);}
export function getPersona(role:DemoRole){return demoPersonas.find(p=>p.id===role)??demoPersonas[0];}
export function getDemoRole(): DemoRole|null {
  if(typeof window==='undefined')return null;
  try {
    const id=window.sessionStorage.getItem(DEMO_SESSION_KEY);
    return demoPersonas.some(p=>p.id===id)?id as DemoRole:null;
  }catch{return null;}
}
export function demoLogin(role:DemoRole,password:string){
  if(!demoPersonas.some(p=>p.id===role)||password!==DEMO_PASSWORD)return false;
  window.sessionStorage.setItem(DEMO_SESSION_KEY,role);
  window.dispatchEvent(new Event('serveragent-demo-user'));
  return true;
}
export function demoLogout(){
  clearLLMSession();
  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  window.dispatchEvent(new Event('serveragent-demo-user'));
}
export type AlignmentStatus = 'review'|'returned'|'pending-signoff'|'approved'|'rejected';
export interface DemoWhatIf {
  factor:number;rps:number;verdict:'will_survive'|'at_risk'|'will_crash'|'not_assessable';
  result?:VerdictResult;timeline?:TraceSample[];explanation?:string;explanationSource?:'llm'|'model';
}
export interface DemoAlignment {
  id:string;
  type:'alignment';
  createdAt:string;
  updatedAt:string;
  release:string;
  cycle:number;
  service:string;
  qaNotes:string;
  createdBy:DemoRole;
  status:AlignmentStatus;
  runId:string;
  result:VerdictResult;
  rps:number;
  whatIf?:DemoWhatIf[];
  reviewerNote?:string;
  reviewedAt?:string;
  signoffNote?:string;
  signedAt?:string;
  signedVersion?:string;
}
export interface DemoIncident {
  id:string;
  type:'incident';
  createdAt:string;
  updatedAt:string;
  service:string;
  symptom:string;
  incidentType:string;
  peakRps:number;
  detectedAt:string;
  createdBy:DemoRole;
  status:'open'|'analyzed'|'escalated';
  spec:ServerSpec;
  load:Load;
  before?:VerdictResult;
  after?:VerdictResult;
  beforeTimeline?:TraceSample[];
  afterTimeline?:TraceSample[];
  mitigatedCores?:number;
  engineerNotes?:string;
  analyzedAt?:string;
}
export interface DemoRecords {alignments:DemoAlignment[];incidents:DemoIncident[];}
const EMPTY: DemoRecords = {alignments:[],incidents:[]};
export function demoRecords():DemoRecords {
  if(typeof window==='undefined')return EMPTY;
  try {
    const parsed=JSON.parse(window.localStorage.getItem(DATA_KEY)||'{}');
    return {
      alignments:Array.isArray(parsed.alignments)?parsed.alignments:[],
      incidents:Array.isArray(parsed.incidents)?parsed.incidents:[],
    };
  }catch{return EMPTY;}
}
export function saveDemoRecords(value:DemoRecords){
  if(typeof window==='undefined')return;
  window.localStorage.setItem(DATA_KEY,JSON.stringify(value));
  window.dispatchEvent(new Event('serveragent-demo-records'));
}
export function saveAlignment(record:DemoAlignment){
  const state=demoRecords();
  saveDemoRecords({...state,alignments:[record,...state.alignments.filter(x=>x.id!==record.id)]});
}
export function saveIncident(record:DemoIncident){
  const state=demoRecords();
  saveDemoRecords({...state,incidents:[record,...state.incidents.filter(x=>x.id!==record.id)]});
}
export function demoCsv(records:DemoRecords){
  const header=['type','id','service','release_or_type','status','created_at','updated_at'];
  const lines=[header,
    ...records.alignments.map(x=>['alignment',x.id,x.service,x.release,x.status,x.createdAt,x.updatedAt]),
    ...records.incidents.map(x=>['incident',x.id,x.service,x.incidentType,x.status,x.createdAt,x.updatedAt]),
  ];
  const csv=lines.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='serveragent-demo-workflow.csv';link.click();
  URL.revokeObjectURL(url);
}

/** Select a guided role. This browser-only demo is not account authorization. */
export function selectDemoPersona(role:DemoRole){
  if(typeof window==='undefined'||!demoPersonas.some(person=>person.id===role))return;
  window.sessionStorage.setItem(DEMO_SESSION_KEY,role);
  window.dispatchEvent(new Event('serveragent-demo-user'));
}
const STARTER_KEY='twinpeak-starter-qris-v1';
let starterPromise:Promise<boolean>|null=null;
/** Populate example evidence from a real engine call; never fabricate a verdict. */
export function ensureDemoStarter():Promise<boolean>{
  if(typeof window==='undefined')return Promise.resolve(false);
  const starter=demoRecords().alignments.find(item=>item.id==='starter-qris-cycle03');
  if(starter){
    window.localStorage.setItem(STARTER_KEY,'generated');
    const factors=[1,2,3];
    const previous=starter.whatIf??[];
    const ready=factors.every(factor=>previous.some(item=>
      item.factor===factor&&(hasFullReplay(item.timeline)||item.verdict==='not_assessable')
    ));
    if(ready)return Promise.resolve(true);
    if(starterPromise)return starterPromise;
    starterPromise=(async()=>{
      const saved=history().find(item=>item.id===starter.runId);
      if(!saved||saved.request.engine!=='simpy')return true;
      const scenarios=await Promise.all(factors.map(async factor=>{
        const old=previous.find(c=>c.factor===factor);
        if(old&&(hasFullReplay(old.timeline)||old.verdict==='not_assessable'))return old;
        const rps=saved.request.load.rps*factor;
        try{
          const inspected=await inspectSimPy({
            ...saved.request,engine:'simpy',
            load:{...saved.request.load,rps},
          });
          const expected=old?.verdict??(factor===1?starter.result.verdict:null);
          // Saved decision evidence never changes if a fresh simulation differs.
          if(expected&&inspected.result.verdict!==expected)return old??{
            factor,rps,verdict:starter.result.verdict,result:starter.result,
          };
          const timeline=compactTimeline(inspected.simulation.timeline);
          return {
            ...old,factor,rps,verdict:inspected.result.verdict,result:inspected.result,timeline,
          };
        }catch{
          return old??{
            factor,rps,verdict:'not_assessable' as const,
            explanation:'This SimPy scenario could not be evaluated. Retry with a new QA evaluation.',
            explanationSource:'model' as const,
          };
        }
      }));
      const latest=demoRecords().alignments.find(item=>item.id===starter.id);
      if(latest)saveAlignment({...latest,whatIf:scenarios});
      return true;
    })().finally(()=>{starterPromise=null;});
    return starterPromise;
  }
  if(starterPromise)return starterPromise;
  starterPromise=(async()=>{
    const spec:ServerSpec={
      ...structuredClone(defaultSpec),
      cpu:{cores:4,clock_ghz:2.5},
      ram:{total_mb:16384},
    };
    const load:Load={...defaultLoad,rps:45,avg_cpu_ms_per_req:15};
    const request={engine:'simpy' as const,spec,load};
    const inspection=await inspectSimPy(request);
    const result=inspection.result;
    const timeline=compactTimeline(inspection.simulation.timeline);
    const stamp=new Date().toISOString();
    const runId='starter-qris-cycle03-simpy';
    saveRun({id:runId,created_at:stamp,label:'QRIS Payment · Cycle 03 · baseline 45 RPS',request,result,timeline});
    // One connected release case, with three independently measured scenarios.
    const followups=await Promise.all([2,3].map(async factor=>{
      const rps=load.rps*factor;
      try{
        const measured=await inspectSimPy({
          ...request,load:{...load,rps},
        });
        return {
          factor,rps,verdict:measured.result.verdict,result:measured.result,
          timeline:compactTimeline(measured.simulation.timeline),
        };
      }catch{
        return {
          factor,rps,verdict:'not_assessable' as const,
          explanation:'SimPy could not complete this workload. Run a new evaluation to retry.',
          explanationSource:'model' as const,
        };
      }
    }));
    saveAlignment({
      id:'starter-qris-cycle03',type:'alignment',createdAt:stamp,updatedAt:stamp,
      release:'QRIS-RC03',cycle:3,service:'QRIS Payment',
      qaNotes:'Baseline performance scenario for the release alignment demo. Review the measured model evidence before deciding the next cycle.',
      createdBy:'qa',status:'review',runId,result,rps:45,
      whatIf:[{factor:1,rps:45,verdict:result.verdict,result,timeline},...followups],
    });
    saveIncident({
      id:'starter-qris-incident',type:'incident',createdAt:stamp,updatedAt:stamp,
      service:'QRIS Payment',symptom:'Response times increased during peak payment traffic. Reproduce the workload and evaluate CPU mitigation.',
      incidentType:'Response timeout',peakRps:135,detectedAt:stamp,createdBy:'support',status:'open',
      spec,load:{...load,rps:135},
    });
    window.localStorage.setItem(STARTER_KEY,'generated');
    return true;
  })().catch(()=>false).finally(()=>{starterPromise=null;});
  return starterPromise;
}
