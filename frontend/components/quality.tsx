'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowUpRight, CheckCircle2, Clock3, Code2, GitBranch,
  GitCommitHorizontal, Info, LoaderCircle, RefreshCw, ShieldAlert,
  ShieldCheck, TestTube2, Workflow, XCircle,
} from 'lucide-react';

type JobStep={name:string;status:string;conclusion:string|null};
type QualityJob={name:string;status:string;conclusion:string|null;url?:string|null;html_url?:string|null;steps:JobStep[]};
type BanditEvidence={high:number|null;medium:number|null;low:number|null;status:string};
type QualityEvidence={
  source:string;repository:string;branch?:string;status:string;conclusion:string|null;
  url:string;run_id:number|null;commit_sha?:string|null;run_started_at?:string|null;run_updated_at?:string|null;
  coverage:number|null;coverage_line?:number|null;coverage_branch?:number|null;coverage_status:string;
  bandit?:BanditEvidence;jobs?:QualityJob[];data_status?:string;
};

type CheckDefinition={key:string;name:string;description:string;job:string;step:string;command:string};
const checks:CheckDefinition[]=[
  {key:'pytest',name:'Pytest',description:'Simulation and API regression tests',job:'Backend tests & coverage',step:'Run model and API tests with coverage',command:'pytest -q --cov-branch'},
  {key:'black',name:'Black',description:'Python code formatting',job:'Python formatting & lint',step:'Black',command:'black --check'},
  {key:'ruff',name:'Ruff',description:'Python lint and static conventions',job:'Python formatting & lint',step:'Ruff',command:'ruff check'},
  {key:'typescript',name:'TypeScript',description:'Typed frontend validation',job:'TypeScript & Next.js',step:'Typecheck',command:'npm run lint'},
  {key:'nextjs',name:'Next.js build',description:'Production build validation',job:'TypeScript & Next.js',step:'Build',command:'npm run build'},
  {key:'bandit',name:'Bandit',description:'Python source security analysis',job:'Bandit security analysis',step:'Enforce security gate (medium severity and confidence or higher)',command:'bandit -r app main.py -ll -ii'},
];
const GITHUB='https://api.github.com/repos/adryanra97/server_agent';
const workflow='https://github.com/adryanra97/server_agent/actions/workflows/quality.yml';
const branch='feat/serveragent-platform';
const fallback:QualityEvidence={
  source:'GitHub Actions',repository:'adryanra97/server_agent',branch,status:'unavailable',conclusion:null,
  url:workflow,run_id:null,coverage:null,coverage_line:null,coverage_branch:null,coverage_status:'not-reported',
  bandit:{high:null,medium:null,low:null,status:'not-reported'},jobs:[],data_status:'unavailable',
};
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
function enrich(raw:QualityEvidence, jobs:QualityJob[]):QualityEvidence{
  const out:QualityEvidence={...raw,jobs,data_status:jobs.length?'live':raw.data_status??'run-only'};
  for(const job of jobs){
    for(const step of job.steps??[]){
      const coverage=/Coverage report:\s*([\d.]+)% line,\s*([\d.]+)% branch/.exec(step.name);
      if(coverage){
        out.coverage_line=Number(coverage[1]);
        out.coverage_branch=Number(coverage[2]);
        out.coverage=Number(coverage[1]);
        out.coverage_status='reported';
      }
      const security=/Bandit findings:\s*H(\d+)\s+M(\d+)\s+L(\d+)/.exec(step.name);
      if(security){
        out.bandit={high:Number(security[1]),medium:Number(security[2]),low:Number(security[3]),status:'reported'};
      }
    }
  }
  return out;
}
async function readGitHub():Promise<QualityEvidence>{
  const fetchJson=async (url:string)=>{
    const res=await fetch(url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw new Error('GitHub status request failed (HTTP '+res.status+').');
    return res.json();
  };
  const payload=await fetchJson(GITHUB+'/actions/workflows/quality.yml/runs?branch='+encodeURIComponent(branch)+'&per_page=1');
  const run=payload.workflow_runs?.[0];
  if(!run)return {...fallback,status:'not-run',data_status:'no-runs'};
  const quality:QualityEvidence={
    ...fallback,status:run.status??'unknown',conclusion:run.conclusion??null,
    run_id:run.id,commit_sha:run.head_sha,run_started_at:run.run_started_at,
    run_updated_at:run.updated_at,
    url:'https://github.com/adryanra97/server_agent/actions/runs/'+run.id,
    data_status:'run-only',
  };
  const jobsPayload=await fetchJson(GITHUB+'/actions/runs/'+run.id+'/jobs?per_page=100');
  const jobs=(jobsPayload.jobs??[]).map((j:{name:string;status:string;conclusion:string|null;html_url:string;steps:JobStep[]})=>({
    name:j.name,status:j.status,conclusion:j.conclusion,url:j.html_url,steps:j.steps??[],
  }));
  return enrich(quality,jobs);
}
function labelStatus(value:string|null|undefined){
  if(value==='success')return 'Passed';
  if(value==='failure')return 'Failed';
  if(value==='cancelled')return 'Cancelled';
  if(value==='skipped')return 'Skipped';
  if(value==='in_progress')return 'Running';
  if(value==='queued'||value==='waiting'||value==='pending')return 'Queued';
  return 'Not reported';
}
function statusClass(value:string|null|undefined){
  if(value==='success')return 'passed';
  if(value==='failure'||value==='cancelled')return 'failed';
  if(value==='in_progress'||value==='queued'||value==='pending'||value==='waiting')return 'running';
  return 'unknown';
}
function dateTime(value:string|null|undefined){
  if(!value)return 'Not available';
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?'Not available':parsed.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
}
export default function Quality(){
  const [quality,setQuality]=useState<QualityEvidence>(fallback);
  const [loading,setLoading]=useState(true);
  const [issue,setIssue]=useState('');
  const [origin,setOrigin]=useState<'service'|'github'|'unavailable'>('unavailable');
  const refresh=useCallback(async()=>{
    setLoading(true);setIssue('');
    let service:QualityEvidence|null=null;
    try{
      const response=await fetch('/api/v1/quality',{cache:'no-store',signal:AbortSignal.timeout(7000)});
      if(!response.ok)throw new Error('Service returned HTTP '+response.status);
      service=await response.json() as QualityEvidence;
    }catch{}
    if(service?.jobs?.length){
      setQuality(enrich(service,service.jobs));setOrigin('service');setLoading(false);return;
    }
    try{
      const github=await readGitHub();setQuality(github);setOrigin('github');
    }catch(error){
      setQuality(service??fallback);
      setOrigin(service?.status!=='unavailable'&&service?.status!==undefined?'service':'unavailable');
      setIssue(error instanceof Error?error.message:'Could not retrieve job details.');
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);

  const jobs=quality.jobs??[];
  const ready=quality.run_id!==null;
  const security=quality.bandit??fallback.bandit!;
  const statuses=checks.map(check=>{
    const job=jobs.find(j=>j.name===check.job);
    const step=job?.steps?.find(s=>s.name===check.step);
    const verdict=step?.conclusion??(step?.status==='in_progress'?'in_progress':step?.status==='queued'?'queued':null);
    return {...check,job,status:verdict,jobStatus:job?.status??'unavailable'};
  });
  const passed=statuses.filter(s=>s.status==='success').length;
  const failed=statuses.filter(s=>s.status==='failure').length;
  const completed=quality.status==='completed';
  const summary=quality.conclusion==='success'?'All checks passed':quality.conclusion==='failure'?'Action required':completed?'Run completed':'Checks in progress';
  const securityJob=jobs.find(j=>j.name==='Bandit security analysis');
  const overall=quality.conclusion??(quality.status==='in_progress'?'in_progress':null);
  return <div className="eq-page">
    <section className="eq-hero">
      <div><span className="eq-eyebrow"><span className={'eq-live-dot '+(ready?'online':'')}/> ENGINEERING ASSURANCE / VERIFIED CI</span>
        <h2>Quality you can <em>verify.</em></h2>
        <p>Inspect measured test coverage, build outcomes, code quality, and Python security scans from the latest engineering pipeline.</p>
        <div className="eq-hero-meta"><span><GitBranch size={15}/>{quality.branch??branch}</span><span><GitCommitHorizontal size={15}/>{quality.commit_sha?.slice(0,8)??'No run'}</span><span><Clock3 size={15}/>{dateTime(quality.run_updated_at)}</span></div>
      </div>
      <div className="eq-hero-actions"><button type="button" onClick={()=>void refresh()} disabled={loading}><RefreshCw className={loading?'spin':''} size={16}/>{loading?'Updating…':'Refresh results'}</button><a href={quality.url??workflow} target="_blank" rel="noopener noreferrer">View execution <ArrowUpRight size={16}/></a></div>
    </section>

    <div className="eq-trust">
      <div className={'eq-trust-indicator '+statusClass(overall)}>{loading?<LoaderCircle className="spin" size={22}/>:overall==='success'?<CheckCircle2 size={22}/>:overall==='failure'?<ShieldAlert size={22}/>:<Clock3 size={22}/>}</div>
      <div><strong>{loading&& !ready?'Connecting to engineering pipeline…':ready?summary:'No verified execution available'}</strong>
        <p>{ready?'Run #'+quality.run_id+' · '+(origin==='github'?'Live GitHub API fallback':'Engineering service')+' · '+(quality.status==='completed'?'Completed execution':'Running or queued execution'):'The dashboard will not substitute a placeholder metric when the source is unavailable.'}</p>
      </div>
      <span className={'eq-trust-badge '+statusClass(overall)}>{ready?labelStatus(overall):'Awaiting evidence'}</span>
    </div>

    <div className="eq-metrics">
      <div className="eq-metric"><span>LINE COVERAGE</span><strong>{num(quality.coverage_line??quality.coverage)===null?'—':Number(quality.coverage_line??quality.coverage).toFixed(1)+'%'}</strong><p>{quality.coverage_status==='reported'?'Measured from CI test report':'Not reported by this run'}</p></div>
      <div className="eq-metric"><span>BRANCH COVERAGE</span><strong>{num(quality.coverage_branch)===null?'—':Number(quality.coverage_branch).toFixed(1)+'%'}</strong><p>{quality.coverage_status==='reported'?'Measured execution branches':'Not reported by this run'}</p></div>
      <div className="eq-metric"><span>AUTOMATED CHECKS</span><strong>{jobs.length?passed+' / '+checks.length:'—'}</strong><p>{jobs.length?failed+' failed · '+(checks.length-passed-failed)+' pending / unavailable':'Awaiting job-level evidence'}</p></div>
      <div className="eq-metric"><span>BANDIT HIGH + MEDIUM</span><strong>{security.status==='reported'?Number(security.high)+Number(security.medium):'—'}</strong><p>{security.status==='reported'?'Findings across both severities':'Security scan not reported yet'}</p></div>
    </div>

    <div className="eq-content">
      <section className="eq-checks">
        <div className="eq-section-head"><div><span>01 / ENGINEERING PIPELINE</span><h3>Six checks. Independently verified.</h3><p>Each result corresponds to a real step in the latest GitHub Actions run.</p></div><Workflow size={23}/></div>
        <div className="eq-check-list">{statuses.map((check,index)=><div className="eq-check" key={check.key}>
          <span className="eq-check-number">{String(index+1).padStart(2,'0')}</span>
          <div className="eq-check-text"><strong>{check.name}</strong><p>{check.description}</p><code>{check.command}</code></div>
          <div className="eq-check-state"><span className={'eq-check-pill '+statusClass(check.status)}>{check.status==='success'?<CheckCircle2 size={15}/>:check.status==='failure'?<XCircle size={15}/>:<Clock3 size={15}/>} {labelStatus(check.status)}</span>
            {check.job?.url&&<a href={check.job.url} target="_blank" rel="noopener noreferrer" aria-label={'View '+check.name+' job'}>View job <ArrowUpRight size={14}/></a>}
          </div>
        </div>)}</div>
        <p className="eq-footnote"><Info size={16}/> A completed workflow can still contain skipped steps. A missing check is shown as not reported, never automatically counted as passed.</p>
      </section>

      <section className="eq-security">
        <div className="eq-section-head"><div><span>02 / SECURITY ANALYSIS</span><h3>Bandit Python scan.</h3><p>Source-code security findings grouped by severity.</p></div><ShieldCheck size={23}/></div>
        <div className="eq-security-status"><div className={'eq-trust-indicator '+statusClass(securityJob?.conclusion)}>{securityJob?.conclusion==='success'?<CheckCircle2 size={23}/>:securityJob?.conclusion==='failure'?<ShieldAlert size={23}/>:<Clock3 size={23}/>}</div>
          <div><strong>{securityJob?labelStatus(securityJob.conclusion??securityJob.status):'Scan awaiting results'}</strong><small>CI gate: medium severity and confidence or higher</small></div></div>
        <div className="eq-security-counts">
          <div><span>HIGH</span><strong>{num(security.high)??'—'}</strong><small>Highest severity</small></div>
          <div><span>MEDIUM</span><strong>{num(security.medium)??'—'}</strong><small>Review and remediate</small></div>
          <div><span>LOW</span><strong>{num(security.low)??'—'}</strong><small>Informational / lower risk</small></div>
        </div>
        <div className="eq-security-note"><Info size={18}/><p>Bandit performs static analysis of Python source. A clean result does not guarantee software security. The full JSON scan report is uploaded as an artifact with the CI execution.</p></div>
        <a className="eq-security-link" target="_blank" rel="noopener noreferrer" href={quality.url??workflow}>View security findings and report <ArrowUpRight size={16}/></a>

        <div className="eq-evidence"><span>03 / EVIDENCE & METHODOLOGY</span><h4>Where these numbers come from</h4>
          <p>Coverage percentages are extracted from the CI-generated coverage.xml. Check statuses are read from the corresponding workflow jobs. Bandit issue counts come from the exported JSON scan.</p>
          <p>All metrics belong to the displayed commit and branch; they are not live production performance telemetry.</p>
        </div>
      </section>
    </div>
    {issue&&<div className="eq-warning" role="status"><Info size={18}/><span>Live job details could not be refreshed: {issue} {ready?'The available run summary is shown above.':'Check the execution directly in GitHub Actions.'}</span><a href={workflow} target="_blank" rel="noopener noreferrer">Open Actions <ArrowUpRight size={15}/></a></div>}
  </div>;
}
