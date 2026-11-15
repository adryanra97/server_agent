'use client';

import { useCallback, useEffect, useState } from 'react';
import QualityTestReport from './quality-test-report';
import {
  Activity, ArrowUpRight, CheckCircle2, ChevronDown, Clock3, Code2, GitBranch,
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

type PublishedQuality={
  run_id:number;commit_sha:string;tests:{
    id:string;name:string;group:string;file:string;status:string;suite?:string;
  }[];
  suites?:Record<string,{total:number;passed:number;failed:number;skipped:number;errors:number;status:string}>;
  frontend_coverage?:{line:number|null;branch:number|null;functions:number|null;status:string};
  security?:{
    npm?:{critical:number|null;high:number|null;moderate:number|null;low:number|null;total:number|null;status:string};
    pip?:{vulnerabilities:number|null;packages_with_findings:number|null;status:string};
  };
};
type CheckDefinition={key:string;name:string;short:string;description:string;job:string;step:string;command:string};
const checks:CheckDefinition[]=[
  {key:'pytest',short:'Backend & API testing',name:'Pytest',description:'Simulation and API regression tests with Python branch coverage',job:'Backend tests & coverage',step:'Run model and API tests with coverage',command:'pytest --cov=app --cov=main --cov-branch'},
  {key:'vitest',short:'Frontend logic & components',name:'Vitest · Frontend',description:'TypeScript logic, React interactions, API contracts, LLM security regression',job:'Frontend unit & component tests',step:'Run Vitest component, contract and security regression tests',command:'npm run test:coverage'},
  {key:'playwright',short:'Real browser testing',name:'Playwright · Browser',description:'Chromium demo journey, role navigation and security headers',job:'Browser end-to-end tests',step:'Run real Chromium user journeys',command:'npm run test:e2e'},
  {key:'black',short:'Python code formatting',name:'Black',description:'Python code formatting',job:'Python formatting & lint',step:'Black',command:'black --check'},
  {key:'ruff',short:'Python code quality',name:'Ruff',description:'Python lint and static conventions',job:'Python formatting & lint',step:'Ruff',command:'ruff check'},
  {key:'typescript',short:'Type safety checks',name:'TypeScript',description:'Typed frontend validation',job:'TypeScript & Next.js',step:'Typecheck',command:'npm run lint'},
  {key:'nextjs',short:'Production build validation',name:'Next.js build',description:'Production build validation',job:'TypeScript & Next.js',step:'Build',command:'npm run build'},
  {key:'bandit',short:'Python security scanning',name:'Bandit',description:'Python static analysis with a medium-severity security gate',job:'Bandit security analysis',step:'Enforce security gate (medium severity and confidence or higher)',command:'bandit -r app main.py --severity-level medium'},
  {key:'npm-audit',short:'JavaScript dependency security',name:'npm audit · Dependencies',description:'Production JavaScript dependency vulnerabilities; high/critical fail the gate',job:'Frontend dependency audit',step:'Read severity counts and enforce high/critical gate',command:'npm audit --omit=dev'},
  {key:'pip-audit',short:'Python dependency security',name:'pip-audit · Dependencies',description:'Known vulnerability checks for declared Python dependencies',job:'Python dependency audit',step:'Audit declared Python dependencies',command:'pip-audit -r requirements.txt'},
];
const GITHUB='https://api.github.com/repos/adryanra97/server_agent';
const workflow='https://github.com/adryanra97/server_agent/actions/workflows/quality.yml';
const branch='main';
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
  const [published,setPublished]=useState<PublishedQuality|null>(null);
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
  useEffect(()=>{
    const run=quality.run_id;
    if(!run){setPublished(null);return;}
    let active=true;
    setPublished(null);
    async function load(){
      const urls=[
        '/api/v1/quality/tests?run_id='+run,
        'https://raw.githubusercontent.com/adryanra97/server_agent/quality-reports/runs/'+run+'.json',
      ];
      for(const url of urls){
        try{
          const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(9500)});
          if(!response.ok)continue;
          const data=await response.json() as PublishedQuality;
          if(data.run_id===run&&data.commit_sha===quality.commit_sha&&Array.isArray(data.tests)){
            if(active)setPublished(data);return;
          }
        }catch{}
      }
    }
    void load();
    return()=>{active=false;};
  },[quality.run_id,quality.commit_sha]);

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
  const npmJob=jobs.find(j=>j.name==='Frontend dependency audit');
  const pipJob=jobs.find(j=>j.name==='Python dependency audit');
  const npmAudit=published?.security?.npm;
  const pipAudit=published?.security?.pip;
  const frontendCoverage=published?.frontend_coverage;
  const suiteStats=published?.suites;
  const regressionCases=published?.tests.filter(test=>
    /(reasoning\/route|llm-session|next.config|security)/i.test(test.file+' '+test.group+' '+test.name)
  )??[];
  const overall=quality.conclusion??(quality.status==='in_progress'?'in_progress':null);
  return <div className="eq-page">
    <section className="eq-hero">
      <div><span className="eq-eyebrow"><span className={'eq-live-dot '+(ready?'online':'')}/> ENGINEERING ASSURANCE / VERIFIED CI</span>
        <h2>Quality you can <em>verify.</em></h2>
        <p>Inspect executed Python, TypeScript, and Chromium tests, measured coverage, dependency vulnerabilities, and security regression results from CI.</p>
        <div className="eq-hero-meta"><span><GitBranch size={15}/>{quality.branch??branch}</span><span><GitCommitHorizontal size={15}/>{quality.commit_sha?.slice(0,8)??'No run'}</span><span><Clock3 size={15}/>{dateTime(quality.run_updated_at)}</span></div>
      </div>
      <div className="eq-hero-actions"><button type="button" onClick={()=>void refresh()} disabled={loading}><RefreshCw className={loading?'spin':''} size={16}/>{loading?'Updating…':'Refresh results'}</button><a href={quality.url??workflow} target="_blank" rel="noopener noreferrer">View execution <ArrowUpRight size={16}/></a></div>
    </section>

    <div className="eq-trust">
      <div className={'eq-trust-indicator '+statusClass(overall)}>{loading?<LoaderCircle className="spin" size={22}/>:overall==='success'?<CheckCircle2 size={22}/>:overall==='failure'?<ShieldAlert size={22}/>:<Clock3 size={22}/>}</div>
      <div><strong>{loading&& !ready?'Connecting to engineering pipeline…':ready?summary:'No verified execution available'}</strong>
        <p>{ready?'Run #'+quality.run_id+' · '+(origin==='github'?'Live GitHub API fallback':'Engineering service')+' · '+(quality.status==='completed'?'Completed execution':'Running or queued execution'):'Check the latest execution status in GitHub Actions.'}</p>
      </div>
      <span className={'eq-trust-badge '+statusClass(overall)}>{ready?labelStatus(overall):'Awaiting evidence'}</span>
    </div>

    <div className="eq-metrics">
      <div className="eq-metric"><span>LINE COVERAGE</span><strong>{num(quality.coverage_line??quality.coverage)===null?'—':Number(quality.coverage_line??quality.coverage).toFixed(1)+'%'}</strong><p>{quality.coverage_status==='reported'?'Measured from CI test report':'Not reported by this run'}</p></div>
      <div className="eq-metric"><span>BRANCH COVERAGE</span><strong>{num(quality.coverage_branch)===null?'—':Number(quality.coverage_branch).toFixed(1)+'%'}</strong><p>{quality.coverage_status==='reported'?'Measured execution branches':'Not reported by this run'}</p></div>
      <div className="eq-metric"><span>AUTOMATED CHECKS</span><strong>{jobs.length?passed+' / '+checks.length:'—'}</strong><p>{jobs.length?failed+' failed · '+(checks.length-passed-failed)+' pending / unavailable':'Awaiting job-level evidence'}</p></div>
      <div className="eq-metric"><span>FRONTEND LINE COVERAGE</span><strong>{frontendCoverage?.status==='reported'&&frontendCoverage.line!==null?frontendCoverage.line?.toFixed(1)+'%':'—'}</strong><p>Vitest V8 · targeted frontend modules</p></div>
      <div className="eq-metric"><span>FRONTEND UNIT TESTS</span><strong>{suiteStats?.frontend?.status==='reported'?suiteStats.frontend.passed+' / '+suiteStats.frontend.total:'—'}</strong><p>Actual Vitest JUnit outcomes</p></div>
      <div className="eq-metric"><span>BROWSER E2E TESTS</span><strong>{suiteStats?.e2e?.status==='reported'?suiteStats.e2e.passed+' / '+suiteStats.e2e.total:'—'}</strong><p>Real Chromium · Playwright</p></div>
      <div className="eq-metric"><span>DEPENDENCY VULNERABILITIES</span><strong>{npmAudit?.status==='reported'&&pipAudit?.status==='reported'?Number(npmAudit.total)+Number(pipAudit.vulnerabilities):'—'}</strong><p>Production npm + Python advisories</p></div>
    </div>

    <div className="eq-content eq-content-pipeline">
      <section className="eq-checks">
        <div className="eq-section-head"><div><span>01 / ENGINEERING PIPELINE</span><h3>Ten quality checks. One verifiable pipeline.</h3><p>See what each check does, then open its command and GitHub Actions evidence. Section 02 contains the individual test cases.</p></div><Workflow size={23}/></div>
        <div className="eq-check-list">{statuses.map((check,index)=><details className="eq-check" key={check.key}>
          <summary className="eq-check-summary">
            <span className="eq-check-number">{String(index+1).padStart(2,'0')}</span>
            <span className="eq-check-text"><strong>{check.name}</strong><span className="eq-check-short"> · {check.short}</span></span>
            <span className={'eq-check-pill '+statusClass(check.status)}>{check.status==='success'?<CheckCircle2 size={15}/>:check.status==='failure'?<XCircle size={15}/>:<Clock3 size={15}/>} {labelStatus(check.status)}</span>
            <ChevronDown size={17} className="eq-check-chevron" aria-hidden="true"/>
          </summary>
          <div className="eq-check-detail">
            <p>{check.description}</p>
            <div className="eq-check-detail-meta"><span>CI job: <strong>{check.job?.name??'Not reported'}</strong></span><span>Command: <code>{check.command}</code></span></div>
            {check.job?.url?<a href={check.job.url} target="_blank" rel="noopener noreferrer" aria-label={'View '+check.name+' job'}>View GitHub Actions job <ArrowUpRight size={15}/></a>:<span className="eq-check-unavailable">Job evidence is not available for this run.</span>}
          </div>
        </details>)}</div>
        <p className="eq-footnote"><Info size={16}/> Check statuses reflect the latest GitHub Actions execution.</p>
      </section>
    </div>

    <QualityTestReport runId={quality.run_id} commitSha={quality.commit_sha??null}/>

    <div className="eq-content eq-content-security">
      <section className="eq-security">
        <div className="eq-section-head"><div><span>03 / SECURITY ANALYSIS</span><h3>Security across the stack.</h3><p>Python SAST, production dependency vulnerabilities, and executed frontend/API security regression tests.</p></div><ShieldCheck size={23}/></div>
        <div className="eq-security-status"><div className={'eq-trust-indicator '+statusClass(securityJob?.conclusion)}>{securityJob?.conclusion==='success'?<CheckCircle2 size={23}/>:securityJob?.conclusion==='failure'?<ShieldAlert size={23}/>:<Clock3 size={23}/>}</div>
          <div><strong>{securityJob?labelStatus(securityJob.conclusion??securityJob.status):'Scan awaiting results'}</strong><small>CI gate: medium severity and confidence or higher</small></div></div>
        <div className="eq-security-counts">
          <div><span>HIGH</span><strong>{num(security.high)??'—'}</strong><small>Highest severity</small></div>
          <div><span>MEDIUM</span><strong>{num(security.medium)??'—'}</strong><small>Review and remediate</small></div>
          <div><span>LOW</span><strong>{num(security.low)??'—'}</strong><small>Informational / lower risk</small></div>
        </div>
        <div className="eq-security-stack">
          <article>
            <div className="eq-security-stack-title"><strong>npm audit · production dependencies</strong><span className={'eq-check-pill '+statusClass(npmJob?.conclusion)}>{labelStatus(npmJob?.conclusion??npmJob?.status)}</span></div>
            <div className="eq-security-counts">
              <div><span>CRITICAL</span><strong>{npmAudit?.status==='reported'?npmAudit.critical:'—'}</strong></div>
              <div><span>HIGH</span><strong>{npmAudit?.status==='reported'?npmAudit.high:'—'}</strong></div>
              <div><span>MODERATE</span><strong>{npmAudit?.status==='reported'?npmAudit.moderate:'—'}</strong></div>
              <div><span>LOW</span><strong>{npmAudit?.status==='reported'?npmAudit.low:'—'}</strong></div>
            </div>
            <p>Fails CI for high or critical published npm advisories. Counts are read from the npm audit JSON generated by this run.</p>
          </article>
          <article>
            <div className="eq-security-stack-title"><strong>pip-audit · Python dependencies</strong><span className={'eq-check-pill '+statusClass(pipJob?.conclusion)}>{labelStatus(pipJob?.conclusion??pipJob?.status)}</span></div>
            <div className="eq-security-counts">
              <div><span>KNOWN VULNERABILITIES</span><strong>{pipAudit?.status==='reported'?pipAudit.vulnerabilities:'—'}</strong></div>
              <div><span>AFFECTED PACKAGES</span><strong>{pipAudit?.status==='reported'?pipAudit.packages_with_findings:'—'}</strong></div>
              <div><span>SECURITY REGRESSIONS</span><strong>{published?regressionCases.filter(t=>t.status==='passed').length+' / '+regressionCases.length:'—'}</strong></div>
            </div>
            <p>Frontend regression tests verify provider allowlists, SSRF resistance, credential cleanup, API errors, and Next.js security headers. These are tests, not a penetration test.</p>
          </article>
        </div>
        <div className="eq-security-note"><Info size={18}/><p>Static analysis, vulnerability advisories, and automated regression tests do not guarantee that an application is secure. See each GitHub Actions artifact for its exact scope.</p></div>
        <a className="eq-security-link" target="_blank" rel="noopener noreferrer" href={quality.url??workflow}>View security findings and report <ArrowUpRight size={16}/></a>

        <div className="eq-evidence"><span>04 / EVIDENCE & METHODOLOGY</span><h4>Where these numbers come from</h4>
          <p>Python coverage comes from coverage.xml; targeted frontend coverage comes from Vitest V8. Individual test outcomes are parsed from Pytest, Vitest, and Playwright JUnit XML. Check statuses come from GitHub Actions; Bandit, npm audit, and pip-audit counts come from their respective scan artifacts.</p>
          <p>All metrics belong to the displayed commit and branch; they are not live production performance telemetry.</p>
        </div>
      </section>
    </div>
    {issue&&<div className="eq-warning" role="status"><Info size={18}/><span>Live job details could not be refreshed: {issue} {ready?'The available run summary is shown above.':'Check the execution directly in GitHub Actions.'}</span><a href={workflow} target="_blank" rel="noopener noreferrer">Open Actions <ArrowUpRight size={15}/></a></div>}
  </div>;
}
