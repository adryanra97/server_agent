import type { DemoRecords } from './demo';
import type { HistoryItem } from './model';
import type { TraceSample } from './trace';

type Plot={label:string;points:TraceSample[]};
type Section={heading:string;lines:string[];plots?:Plot[]};
type Series={key:keyof TraceSample;label:string;color:[number,number,number]};

const readable:Record<string,string>={
  will_survive:'Lolos',at_risk:'Lolos Bersyarat',will_crash:'Tidak Lolos',
  not_assessable:'Tidak Dapat Dinilai',
};
const label=(value:string)=>readable[value]??value.replaceAll('-',' ');
function printable(value:unknown){
  return String(value??'-').normalize('NFKD').replace(/[^\x20-\x7E\n]/g,'-');
}
function usefulTrace(points:TraceSample[]|undefined):points is TraceSample[]{
  return Array.isArray(points)&&points.length>=2&&points.every(p=>Number.isFinite(p.second));
}
function sectionsFor(records:DemoRecords,evaluations:HistoryItem[]):Section[]{
  const sections:Section[]=[];
  for(const record of records.alignments){
    const traces:(Plot[])=(record.whatIf??[])
      .filter(x=>usefulTrace(x.timeline))
      .map(x=>({label:x.factor+'x demand · '+x.rps+' RPS',points:x.timeline!}));
    if(!traces.length){
      const saved=evaluations.find(x=>x.id===record.runId);
      if(usefulTrace(saved?.timeline))traces.push({label:'Recorded SimPy baseline · '+record.rps+' RPS',points:saved!.timeline!});
    }
    sections.push({
      heading:record.release+' / Cycle '+record.cycle+' / '+record.service,
      lines:[
        'Category: Release alignment  |  Status: '+label(record.status),
        'Submitted: '+record.createdAt+'  |  Workload: '+record.rps+' RPS',
        'Verdict: '+label(record.result.verdict)+'  |  Limiting resource: '+(record.result.bottleneck??'none'),
        'CPU: '+(record.result.resources.cpu.utilization*100).toFixed(1)+
          '%  |  RAM: '+(record.result.resources.ram.utilization*100).toFixed(1)+
          '%  |  Network: '+(record.result.resources.network.utilization*100).toFixed(1)+'%',
        'Model evidence: '+record.result.reasons.join('; '),
        'QA testing note: '+record.qaNotes,
        record.reviewerNote?'Technical Lead decision: '+record.reviewerNote:'',
        record.signoffNote?'Manager sign-off: '+record.signoffNote:'',
        record.signedVersion?'Approved version: '+record.signedVersion+'  |  '+record.signedAt:'',
        ...(record.whatIf??[]).map(x=>'Scenario '+x.factor+'x / '+x.rps+' RPS: '+label(x.verdict)+
          (x.explanation?' / '+x.explanation:'')),
      ].filter(Boolean),
      plots:traces.slice(0,3),
    });
  }
  for(const record of records.incidents){
    const plots:Plot[]=[];
    if(usefulTrace(record.beforeTimeline))plots.push({label:'Before mitigation · '+record.peakRps+' RPS',points:record.beforeTimeline});
    if(usefulTrace(record.afterTimeline))plots.push({label:'After mitigation · '+record.peakRps+' RPS',points:record.afterTimeline});
    sections.push({
      heading:'Incident / '+record.service+' / '+record.incidentType,
      lines:[
        'Status: '+label(record.status)+'  |  Peak: '+record.peakRps+' RPS',
        'Detected: '+record.detectedAt,
        'Reported symptoms: '+record.symptom,
        record.before?'Before: '+label(record.before.verdict)+
          '  |  CPU '+(record.before.resources.cpu.utilization*100).toFixed(1)+'%':'',
        record.after?'After mitigation: '+label(record.after.verdict)+
          '  |  CPU '+(record.after.resources.cpu.utilization*100).toFixed(1)+'%':'',
        record.mitigatedCores?'Proposed CPU cores: '+record.mitigatedCores:'',
        record.engineerNotes?'Engineer analysis: '+record.engineerNotes:'',
      ].filter(Boolean),
      plots,
    });
  }
  if(evaluations.length){
    const standalone=evaluations.filter(r=>!records.alignments.some(a=>a.runId===r.id));
    sections.push({
      heading:'Recorded capacity evaluations',
      lines:evaluations.map(x=>
        x.created_at+'  |  '+x.label+'  |  '+x.request.load.rps+' RPS  |  '+
        x.result.engine.toUpperCase()+'  |  '+label(x.result.verdict)+
        '  |  Bottleneck: '+(x.result.bottleneck??'none')),
      plots:standalone.filter(r=>usefulTrace(r.timeline)).slice(0,2)
        .map(x=>({label:x.label,points:x.timeline!})),
    });
  }
  return sections;
}
export async function downloadTwinPeakPDF(
  records:DemoRecords,evaluations:HistoryItem[],
  narrative?:{text:string;generated:boolean}
){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const pageW=210,left=18,right=192,bottom=278,width=right-left;
  let y=0;
  function newPage(){
    doc.addPage();doc.setFillColor(247,251,254);doc.rect(0,0,210,297,'F');y=23;
  }
  function ensureSpace(required:number){
    if(y+required>bottom)newPage();
  }
  function textBlock(content:string,size=10,bold=false,gap=1){
    if(!content)return;
    doc.setFont('helvetica',bold?'bold':'normal');
    doc.setFontSize(size);
    doc.setTextColor(bold?18:53,bold?63:90,bold?96:119);
    const lines=doc.splitTextToSize(printable(content),width) as string[];
    for(const line of lines){
      ensureSpace(size>=12?7.5:6);
      doc.text(line,left,y);
      y+=size>=12?6.5:5.4;
    }
    y+=gap;
  }
  function plot(title:string,points:TraceSample[],series:Series[],unit:string){
    // All vertices below are actual recorded SimPy seconds; no interpolated metric points.
    if(!usefulTrace(points))return;
    ensureSpace(83);
    const top=y,px=left+17,py=top+26,pw=width-27,ph=43;
    doc.setFillColor(245,250,254);
    doc.setDrawColor(204,224,236);
    doc.roundedRect(left,top,width,77,2,2,'FD');
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(23,72,104);
    doc.text(printable(title),left+8,top+9);
    const number=(p:TraceSample,k:keyof TraceSample)=>Number(p[k]);
    const maximum=Math.max(...points.flatMap(p=>series.map(s=>Math.max(0,number(p,s.key)))),0.01);
    const maxY=unit==='%'?Math.max(100,Math.ceil(maximum/20)*20):Math.max(1,Math.ceil(maximum*1.12));
    const minSecond=points[0].second,maxSecond=points[points.length-1].second;
    for(let k=0;k<=4;k++){
      const gy=py+ph-(k/4)*ph;
      doc.setDrawColor(218,231,241);doc.setLineWidth(.18);
      doc.line(px,gy,px+pw,gy);
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(84,111,131);
      const tick=maxY*k/4;
      doc.text((unit==='%'?tick.toFixed(0):Number(tick.toFixed(1)))+unit,px-2,gy+1.2,{align:'right'});
    }
    for(const s of series){
      doc.setDrawColor(...s.color);doc.setLineWidth(.72);
      let last:[number,number]|null=null;
      for(const point of points){
        const value=Math.max(0,number(point,s.key));
        const x=px+((point.second-minSecond)/Math.max(1,maxSecond-minSecond))*pw;
        const yy=py+ph-Math.min(1,value/maxY)*ph;
        if(last)doc.line(last[0],last[1],x,yy);
        last=[x,yy];
      }
    }
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(85,111,130);
    doc.text('t = '+minSecond+' s',px,py+ph+6);
    doc.text('t = '+maxSecond+' s',px+pw,py+ph+6,{align:'right'});
    let lx=left+8;
    for(const s of series){
      doc.setDrawColor(...s.color);doc.setLineWidth(1.3);
      doc.line(lx,top+16,lx+6,top+16);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(63,95,116);
      doc.text(s.label,lx+9,top+17);
      lx+=Math.max(37,9+s.label.length*1.72);
    }
    y=top+84;
  }
  function chartGroup(record:Plot){
    if(!usefulTrace(record.points))return;
    ensureSpace(24);
    textBlock('RECORDED SIMPY TIME SERIES  /  '+record.label,10,true,2);
    textBlock(record.points.length+' sampled buckets, '+record.points[0].second+
      ' to '+record.points[record.points.length-1].second+
      ' seconds. Events represent simulated elapsed time.',8,false,3);
    plot('Resource occupancy over time',record.points,[
      {key:'cpu_percent',label:'CPU',color:[25,112,184]},
      {key:'ram_percent',label:'RAM',color:[0,147,134]},
      {key:'network_percent',label:'Network',color:[199,128,58]},
    ],'%');
    plot('Request arrivals and completions per second',record.points,[
      {key:'arrivals',label:'Arrived',color:[25,112,184]},
      {key:'completed',label:'Completed',color:[0,147,134]},
    ],'');
    plot('Average waiting queue over time',record.points,[
      {key:'queue_avg',label:'Queued requests',color:[199,128,58]},
    ],'');
    textBlock('Source: SimPy event-derived timeline saved with this evaluation. '+
      'Displayed points are sampled actual buckets, not interpolated telemetry.',8,false,5);
  }
  // Cover / summary page.
  doc.setFillColor(235,246,252);doc.rect(0,0,pageW,297,'F');
  doc.setFillColor(9,107,168);doc.rect(0,0,8,297,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(9,107,168);
  doc.text('TWINPEAK / SERVERAGENT',left,32);
  doc.setFontSize(27);doc.setTextColor(18,63,97);
  doc.text('Capacity & Release',left,54);doc.text('Evidence Report',left,67);
  doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(66,100,122);
  doc.text('Decision history, performance assessment and',left,85);
  doc.text('event-derived simulation time series',left,92);
  doc.setDrawColor(181,212,230);doc.line(left,107,right,107);
  const countTimeSeries=records.alignments.filter(a=>(a.whatIf??[]).some(c=>usefulTrace(c.timeline))).length+
    records.incidents.filter(i=>usefulTrace(i.beforeTimeline)||usefulTrace(i.afterTimeline)).length+
    evaluations.filter(i=>usefulTrace(i.timeline)).length;
  const metrics=[
    {value:records.alignments.length,label:'RELEASE ALIGNMENTS'},
    {value:records.incidents.length,label:'INCIDENTS'},
    {value:evaluations.length,label:'EVALUATIONS'},
    {value:countTimeSeries,label:'SAVED TRACES'},
  ];
  metrics.forEach((m,i)=>{
    const x=left+i*44;
    doc.setFillColor(255,255,255);doc.roundedRect(x,121,40,32,2,2,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(19);doc.setTextColor(18,77,113);
    doc.text(String(m.value),x+5,135);
    doc.setFont('helvetica','normal');doc.setFontSize(6.7);doc.setTextColor(81,112,135);
    doc.text(m.label,x+5,144);
  });
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(56,93,119);
  doc.text('Report generated: '+new Date().toLocaleString('en-GB'),left,182);
  doc.text('Metrics describe model scenarios, not production telemetry.',left,190);
  doc.text('Cases without recorded traces are labeled in their sections.',left,198);
  doc.setFontSize(9);doc.setTextColor(88,125,144);
  doc.text('Prepared for review and release decision support',left,258);
  newPage();
  const sections=sectionsFor(records,evaluations);
  if(!sections.length)textBlock('No capacity evaluations or decisions match the current report selection.');
  sections.forEach((section,index)=>{
    ensureSpace(40);
    doc.setDrawColor(197,221,237);doc.line(left,y-7,right,y-7);
    textBlock(String(index+1).padStart(2,'0')+' / '+section.heading,14,true,4);
    section.lines.forEach(line=>textBlock(line,9,false,1));
    const traces=section.plots??[];
    if(traces.length){
      y+=6;traces.forEach(chartGroup);
    }else{
      y+=5;
      textBlock('Time-series charts are unavailable for this record. '+
        'Run a new SimPy inspection to collect event-derived data.',9,false,4);
    }
    y+=12;
  });
  if(narrative?.text){
    ensureSpace(35);
    doc.setDrawColor(198,222,238);doc.line(left,y-6,right,y-6);
    textBlock(narrative.generated?'AI-assisted interpretation':'Model-based explanation',13,true,4);
    textBlock(narrative.text,10,false,5);
    textBlock('Narrative is supplemental; final verdicts come from the simulation engine.',8);
  }
  for(let p=1;p<=doc.getNumberOfPages();p++){
    doc.setPage(p);
    doc.setDrawColor(206,227,238);doc.line(left,283,right,283);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(89,118,140);
    doc.text('TwinPeak / ServerAgent / Simulation evidence',left,290);
    doc.text(p+' / '+doc.getNumberOfPages(),right,290,{align:'right'});
  }
  doc.save('TwinPeak_Capacity_Report_'+new Date().toISOString().slice(0,10)+'.pdf');
}
export async function downloadUnassessablePDF(rps:number,description:string,generated:boolean){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({unit:'mm',format:'a4'});
  doc.setFillColor(233,246,253);doc.rect(0,0,210,58,'F');
  doc.setFont('helvetica','bold');doc.setTextColor(18,63,97);doc.setFontSize(21);
  doc.text('TwinPeak / Scenario Assessment',18,28);
  doc.setFontSize(12);doc.setTextColor(155,76,59);
  doc.text('Tidak Dapat Dinilai',18,44);
  doc.setFont('helvetica','normal');doc.setTextColor(54,91,118);doc.setFontSize(11);
  doc.text('QRIS Payment  |  '+rps+' RPS  |  Model evaluation incomplete',18,71);
  doc.setFontSize(10);
  const lines=doc.splitTextToSize(printable(description),174) as string[];
  doc.text(lines,18,88);
  const row=Math.min(255,88+lines.length*5+15);
  doc.setTextColor(88,114,129);
  doc.text(generated?'Narrative: AI-assisted explanation':'Narrative: scenario guidance',18,row);
  doc.text('No simulated time series was produced for this unsuccessful evaluation.',18,row+8);
  doc.save('TwinPeak_Not_Assessable_'+rps+'RPS.pdf');
}
