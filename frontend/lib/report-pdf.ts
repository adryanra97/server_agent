import type { DemoAlignment, DemoIncident, DemoRecords } from './demo';
import type { HistoryItem } from './model';

type Section={heading:string;lines:string[]};
function printable(value:unknown){return String(value??'—').normalize('NFKD').replace(/[^\x20-\x7E\n]/g,'-');}
function sectionsFor(records:DemoRecords,evaluations:HistoryItem[]):Section[]{
  const sections:Section[]=[];
  for(const record of records.alignments){
    const status=record.status.replaceAll('-',' ').toUpperCase();
    sections.push({heading:record.release+' · Cycle '+record.cycle+' · '+record.service,lines:[
      'Category: Release alignment | Status: '+status,
      'Submitted at: '+record.createdAt+' | QA evidence: '+record.rps+' RPS',
      'Model verdict: '+record.result.verdict+' | Bottleneck: '+(record.result.bottleneck??'none'),
      'CPU: '+(record.result.resources.cpu.utilization*100).toFixed(1)+'% | RAM: '+(record.result.resources.ram.utilization*100).toFixed(1)+'%',
      'Model reasons: '+record.result.reasons.join('; '),
      'QA notes: '+record.qaNotes,
      record.reviewerNote?'Technical Lead: '+record.reviewerNote:'',
      record.signoffNote?'Manager: '+record.signoffNote:'',
      record.signedVersion?'Signed version: '+record.signedVersion+' | '+record.signedAt:'',
      ...(record.whatIf??[]).map(x=>'What-if '+x.factor+'x: '+x.rps+' RPS | '+x.verdict+(x.explanation?' | '+x.explanation:'')),
    ].filter(Boolean)});
  }
  for(const record of records.incidents){
    sections.push({heading:'Incident · '+record.service,lines:[
      'Type: '+record.incidentType+' | Status: '+record.status+' | Peak: '+record.peakRps+' RPS',
      'Detected: '+record.detectedAt,'Symptoms: '+record.symptom,
      record.before?'Before: '+record.before.verdict+'; CPU '+(record.before.resources.cpu.utilization*100).toFixed(1)+'%':'',
      record.after?'After mitigation: '+record.after.verdict+'; CPU '+(record.after.resources.cpu.utilization*100).toFixed(1)+'%':'',
      record.engineerNotes?'Engineer: '+record.engineerNotes:'',
    ].filter(Boolean)});
  }
  if(evaluations.length){
    sections.push({heading:'Capacity evaluation history',lines:evaluations.map(x=>
      x.created_at+' | '+x.label+' | '+x.request.load.rps+' RPS | '+x.result.engine+' | '+x.result.verdict+
      ' | bottleneck '+(x.result.bottleneck??'none'))});
  }
  return sections;
}
export async function downloadTwinPeakPDF(
  records:DemoRecords,evaluations:HistoryItem[],narrative?:{text:string;generated:boolean}
){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const pageWidth=210, left=19, right=191, bottom=275;
  let y=31;
  const newPage=()=>{doc.addPage();y=25;};
  const textBlock=(content:string,size=10,bold=false)=>{
    if(!content)return;
    doc.setFont('helvetica',bold?'bold':'normal');
    doc.setFontSize(size);doc.setTextColor(bold?20:54,bold?62:89,bold?92:119);
    const lines=doc.splitTextToSize(printable(content),right-left) as string[];
    for(const line of lines){
      if(y+6>bottom)newPage();
      doc.text(line,left,y);y+=size>=12?6.5:5.4;
    }
  };
  doc.setFillColor(229,244,252);doc.rect(0,0,pageWidth,55,'F');
  doc.setTextColor(12,100,158);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('TWINPEAK  /  SERVERAGENT',left,20);
  doc.setFontSize(23);doc.setTextColor(18,63,97);doc.text('Capacity & Release Report',left,35);
  doc.setFontSize(9);doc.setTextColor(68,105,128);doc.text('Generated '+new Date().toLocaleString('en-GB'),left,46);
  y=67;
  const contents=sectionsFor(records,evaluations);
  if(!contents.length)textBlock('No evaluations or decisions match the selected report filters.');
  contents.forEach((section,index)=>{
    if(y>247)newPage();
    doc.setDrawColor(206,228,239);doc.line(left,y-5,right,y-5);
    textBlock(String(index+1).padStart(2,'0')+' / '+section.heading,13,true);
    y+=2;section.lines.forEach(line=>textBlock(line));
    y+=9;
  });
  if(narrative?.text){
    if(y>238)newPage();
    doc.setDrawColor(206,228,239);doc.line(left,y-5,right,y-5);
    textBlock(narrative.generated?'AI-assisted interpretation':'Model-based explanation',13,true);
    textBlock(narrative.text);
  }
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);doc.setDrawColor(208,228,239);doc.line(left,285,right,285);
    doc.setTextColor(94,126,147);doc.setFontSize(9);
    doc.text('TwinPeak · Capacity evidence',left,292);doc.text(i+' / '+total,right,292,{align:'right'});
  }
  doc.save('TwinPeak_Capacity_Report_'+new Date().toISOString().slice(0,10)+'.pdf');
}
export async function downloadUnassessablePDF(rps:number,description:string,generated:boolean){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF();
  doc.setFillColor(232,246,253);doc.rect(0,0,210,55,'F');
  doc.setFont('helvetica','bold');doc.setTextColor(18,62,95);doc.setFontSize(21);
  doc.text('TwinPeak — Scenario Assessment',18,27);
  doc.setFontSize(12);doc.text('Status: Tidak Dapat Dinilai',18,45);
  doc.setFont('helvetica','normal');doc.setTextColor(54,91,118);doc.setFontSize(11);
  doc.text('QRIS Payment  |  '+rps+' RPS  |  Model evaluation incomplete',18,67);
  const lines=doc.splitTextToSize(printable(description),174) as string[];
  doc.text(lines,18,84);
  const y=Math.min(255,84+lines.length*5+16);
  doc.text(generated?'Narrative: AI-assisted explanation':'Narrative: scenario guidance',18,y);
  doc.save('TwinPeak_Not_Assessable_'+rps+'RPS.pdf');
}
