import type { ServerSpec, Load, VerdictResult } from './model';

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
  {href:'/simulation',label:'SimPy Workbench'},
  {href:'/compare',label:'Compare Loads'},
  {href:'/alignment',label:'Release Alignment'},
  {href:'/incident',label:'Incident Response'},
  {href:'/signoff',label:'Sign-Off'},
  {href:'/reports',label:'Reports & History'},
  {href:'/methodology',label:'Model Methodology'},
  {href:'/developer',label:'API Explorer'},
  {href:'/quality',label:'Engineering Quality'},
] as const;
const allowed: Record<DemoRole, string[]> = {
  qa:['/dashboard','/simulation','/compare','/alignment','/reports','/methodology'],
  lead:['/dashboard','/alignment','/incident','/reports','/methodology','/quality'],
  engineer:['/dashboard','/incident','/simulation','/compare','/reports','/developer','/methodology','/quality'],
  manager:['/dashboard','/signoff','/reports','/methodology'],
  support:['/dashboard','/incident','/reports','/methodology'],
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
  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  window.dispatchEvent(new Event('serveragent-demo-user'));
}
export type AlignmentStatus = 'review'|'returned'|'pending-signoff'|'approved'|'rejected';
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
