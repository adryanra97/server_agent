'use client';

import { useEffect, useMemo, useState } from 'react';
import { isHypothesisCase } from '../lib/quality-evidence';
import type {QualityBranch} from '../lib/quality-branch';
import {
  ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, CircleAlert,
  Clock3, FileCode2, Info, LoaderCircle, Search, TestTube2, XCircle,
} from 'lucide-react';

type TestStatus='passed'|'failed'|'skipped'|'error';
type TestCase={
  id:string;name:string;group:string;file:string;suite?:'backend'|'frontend'|'e2e';
  status:TestStatus;duration_seconds:number;
};
type TestReport={
  schema_version:number;run_id:number;commit_sha:string;branch:string;generated_at:string;
  summary:{total:number;passed:number;failed:number;skipped:number;errors:number;duration_seconds:number};
  tests:TestCase[];
  suites?:Record<string,{total:number;passed:number;failed:number;skipped:number;errors:number;duration_seconds:number;status:string}>;
  frontend_coverage?:{line:number|null;branch:number|null;functions:number|null;statements?:number|null;modules?:number|null;status:string};
  security?:{
    npm?:{critical:number|null;high:number|null;moderate:number|null;low:number|null;total:number|null;status:string};
    pip?:{vulnerabilities:number|null;packages_with_findings:number|null;status:string};
  };
};
type Filter='all'|TestStatus;
const filters:{value:Filter;label:string}[]=[
  {value:'all',label:'All tests'},{value:'passed',label:'Passed'},
  {value:'failed',label:'Failed'},{value:'skipped',label:'Skipped'},
  {value:'error',label:'Errors'},
];
const GITHUB_REPORT='https://raw.githubusercontent.com/adryanra97/server_agent/quality-reports';
const statusText:Record<TestStatus,string>={passed:'Passed',failed:'Failed',skipped:'Skipped',error:'Error'};
const pretty=(value:string)=>value.replace(/^test_/,'').replace(/_/g,' ').replace(/\[(.*?)\]/g,' · $1');
const formatSeconds=(n:number)=>n<1?Math.round(n*1000)+' ms':n.toFixed(2)+' s';
function validReport(value:unknown,run:number,sha:string|null,branch:QualityBranch):value is TestReport{
  if(!value||typeof value!=='object')return false;
  const v=value as Partial<TestReport>;
  return v.schema_version===1&&v.run_id===run&&v.branch===branch&&
    (!sha||v.commit_sha===sha)&&Array.isArray(v.tests)&&v.summary!==undefined&&
    typeof v.summary?.total==='number'&&v.tests.length===v.summary.total;
}
async function loadJson(url:string){
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json() as Promise<unknown>;
}

export default function QualityTestReport({runId,commitSha,branch='main'}:{runId:number|null;commitSha:string|null;branch?:QualityBranch}){
  const [report,setReport]=useState<TestReport|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [suiteFilter,setSuiteFilter]=useState<'all'|'backend'|'frontend'|'e2e'|'hypothesis'>('all');
  const [search,setSearch]=useState('');
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [retry,setRetry]=useState(0);

  useEffect(()=>{
    if(!runId){setReport(null);setError('');setLoading(false);return;}
    let active=true;
    setReport(null);setLoading(true);setError('');
    const run=runId;
    async function retrieve(){
      try{
        let raw:unknown;
        try{raw=await loadJson('/api/v1/quality/tests?run_id='+run);}
        catch{raw=await loadJson(GITHUB_REPORT+'/runs/'+run+'.json');}
        if(!validReport(raw,run,commitSha,branch))throw new Error('The published test report does not match this run and branch.');
        if(active)setReport(raw);
      }catch{
        if(active)setError('Per-test report is not available for this execution yet. Open the CI artifacts or refresh when publication completes.');
      }finally{if(active)setLoading(false);}
    }
    void retrieve();
    return()=>{active=false;};
  },[runId,commitSha,branch,retry]);

  const visible=useMemo(()=>{
    if(!report)return [];
    const query=search.toLowerCase().trim();
    return report.tests.filter(test=>(suiteFilter==='all'||(suiteFilter==='hypothesis'?isHypothesisCase(test):(test.suite??'backend')===suiteFilter))&&
      (filter==='all'||test.status===filter)&&
      (!query||(test.name+' '+test.group+' '+test.id+' '+test.file).toLowerCase().includes(query)));
  },[report,search,filter,suiteFilter]);
  const groups=useMemo(()=>{
    const map=new Map<string,TestCase[]>();
    for(const test of visible){
      const rows=map.get(test.group)??[];
      rows.push(test);map.set(test.group,rows);
    }
    return [...map.entries()].sort(([a],[b])=>a.localeCompare(b));
  },[visible]);
  const total=report?.summary.total??0;
  const pct=(n:number)=>total?Math.round(n/total*1000)/10:0;
  const toggle=(id:string)=>setExpanded(old=>({...old,[id]:!old[id]}));
  const statusIcon=(value:TestStatus)=>value==='passed'?<CheckCircle2 size={16}/>:value==='skipped'?<Clock3 size={16}/>:<XCircle size={16}/>;

  return <section className="eq-detail" id="pytest-details" aria-labelledby="eq-detail-heading">
    <div className="eq-section-head eq-detail-heading">
      <div><span>02 / DETAILED TEST EXECUTION</span><h3 id="eq-detail-heading">Explore every executed test.</h3>
        <p>Source-linked Pytest, Vitest, and Chromium test cases from the selected CI run. Filter by suite, outcome, or module.</p>
      </div><TestTube2 size={24}/>
    </div>
    {!runId?<div className="eq-detail-empty"><Info size={25}/><strong>No execution selected</strong><p>The report appears after GitHub Actions has started a test run.</p></div>:
      loading?<div className="eq-detail-empty"><LoaderCircle className="spin" size={24}/><strong>Loading test results…</strong><p>Retrieving the measured report for run #{runId}.</p></div>:
      !report?<div className="eq-detail-empty"><CircleAlert size={26}/><strong>Detailed test evidence is pending</strong><p>{error||'The report has not been published for this run.'}</p><a href={'https://github.com/adryanra97/server_agent/actions/runs/'+runId} target="_blank" rel="noopener noreferrer">View GitHub run and test artifacts <ArrowUpRight size={16}/></a><button type="button" className="eq-test-retry" onClick={()=>setRetry(v=>v+1)}>Retry loading results</button></div>:
      <>
        <div className="eq-test-summary">
          <div><span>TOTAL EXECUTED</span><strong>{total}</strong><small>Recorded test cases</small></div>
          <div><span>PASSED</span><strong className="eq-passed">{report.summary.passed}</strong><small>{pct(report.summary.passed)}% of execution</small></div>
          <div><span>FAILED</span><strong className={report.summary.failed?'eq-failed':''}>{report.summary.failed}</strong><small>Failed assertions</small></div>
          <div><span>SKIPPED / ERRORS</span><strong>{report.summary.skipped} <small>/ {report.summary.errors}</small></strong><small>Skipped or execution errors</small></div>
          <div><span>RUN DURATION</span><strong>{formatSeconds(report.summary.duration_seconds)}</strong><small>Reported JUnit suite time</small></div>
        </div>
        <div className="eq-outcome-track" role="img" aria-label={report.summary.passed+' passed, '+report.summary.failed+' failed, '+report.summary.skipped+' skipped, '+report.summary.errors+' errors, out of '+total+' tests'}>
          {([
            ['passed',report.summary.passed],['failed',report.summary.failed],
            ['skipped',report.summary.skipped],['error',report.summary.errors],
          ] as [TestStatus,number][]).map(([key,count])=>count>0?<span key={key} className={'eq-outcome-'+key} style={{width:count/Math.max(1,total)*100+'%'}}/>:null)}
        </div>
        <div className="eq-report-context"><span><CheckCircle2 size={15}/> Published JUnit evidence</span><span>Run #{report.run_id}</span><span>Commit {report.commit_sha.slice(0,8)}</span></div>
        <div className="eq-suite-tabs" role="group" aria-label="Filter testing framework">
          {([
            ['all','All suites'],['backend','Python · Pytest'],
            ['frontend','TypeScript · Vitest'],['e2e','Browser · Playwright'],
            ['hypothesis','Hypothesis · Properties'],
          ] as const).map(([key,label])=>{
            const count=report.tests.filter(test=>key==='all'||(key==='hypothesis'?isHypothesisCase(test):(test.suite??'backend')===key)).length;
            return <button key={key} type="button" aria-pressed={suiteFilter===key}
              className={suiteFilter===key?'active':''} onClick={()=>{setSuiteFilter(key);setExpanded({});}}>
              <strong>{label}</strong><span>{count} tests</span>
            </button>;
          })}
        </div>
        {suiteFilter==='hypothesis'&&<p className="eq-hypothesis-note">Each row is one recorded Pytest test case. Hypothesis runs many generated examples inside each case; those examples are not counted as separate tests.</p>}
        {report.frontend_coverage?.status==='reported'&&<div className="eq-frontend-coverage">
          <div><span>FRONTEND LINE COVERAGE</span><strong>{report.frontend_coverage.line?.toFixed(1)??'—'}%</strong></div>
          <div><span>FRONTEND BRANCH COVERAGE</span><strong>{report.frontend_coverage.branch?.toFixed(1)??'—'}%</strong></div>
          <div><span>FRONTEND FUNCTION COVERAGE</span><strong>{report.frontend_coverage.functions?.toFixed(1)??'—'}%</strong></div>
          <div><span>FRONTEND STATEMENT COVERAGE</span><strong>{report.frontend_coverage.statements?.toFixed(1)??'—'}%</strong></div>
          <p>Measured by Vitest V8 across {report.frontend_coverage.modules??'selected'} targeted production modules. Each included module must individually satisfy the 100% coverage gate. This is not whole-application coverage.</p>
        </div>}
        <div className="eq-test-toolbar">
          <div className="eq-test-filters" role="group" aria-label="Filter test results">
            {filters.map(item=>{
              const count=item.value==='all'?total:item.value==='error'?report.summary.errors:
                report.summary[item.value];
              return <button type="button" key={item.value} aria-pressed={filter===item.value} className={filter===item.value?'active':''} onClick={()=>setFilter(item.value)}>{item.label}<span>{count}</span></button>;
            })}
          </div>
          <label className="eq-test-search"><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search test or module…" aria-label="Search test or module"/></label>
        </div>
        <div className="eq-test-list-head"><span>{visible.length} of {total} tests</span><span>{groups.length} modules</span></div>
        <div className="eq-test-groups">
          {groups.length?groups.map(([group,items])=>{
            const groupName=group.replace(/^test_/,'').replace(/_/g,' ');
            const failing=items.some(item=>item.status==='failed'||item.status==='error');
            const open=expanded['group:'+group]??false;
            return <div className="eq-test-group" key={group}>
              <button className="eq-test-group-head" type="button" onClick={()=>toggle('group:'+group)} aria-expanded={open}>
                {open?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
                <FileCode2 size={18}/><span><strong>{groupName}</strong><small>{items[0]?.file||group}</small></span>
                <span className={'eq-test-group-count '+(failing?'has-failure':'')}>{items.length} cases {failing?'· failures':''}</span>
              </button>
              {open&&<div className="eq-test-case-list">
                {items.map(test=>{
                  const openCase=expanded['case:'+test.id]??false;
                  const source= (test.file.startsWith('backend/tests/')||test.file.startsWith('frontend/'))&&/^[a-zA-Z0-9_./-]+$/.test(test.file)
                    ?'https://github.com/adryanra97/server_agent/blob/'+report.commit_sha+'/'+test.file
                    :null;
                  return <div className="eq-test-case" key={test.id}>
                    <button className="eq-test-case-head" type="button" onClick={()=>toggle('case:'+test.id)} aria-expanded={openCase}>
                      <span className={'eq-test-status-icon '+test.status}>{statusIcon(test.status)}</span>
                      <span className="eq-test-case-name"><strong>{pretty(test.name)}</strong><small>{test.name}</small></span>
                      <span className={'eq-test-result '+test.status}>{statusText[test.status]}</span>
                      <span className="eq-test-duration">{formatSeconds(test.duration_seconds)}</span>
                      {openCase?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
                    </button>
                    {openCase&&<div className="eq-test-case-detail">
                      <p><strong>Test identifier:</strong> <code>{test.id}</code></p>
                      <p><strong>Recorded outcome:</strong> {statusText[test.status]} · <strong>Execution time:</strong> {formatSeconds(test.duration_seconds)}</p>
                      <p><strong>Source module:</strong> {test.file||'Unavailable'}</p>
                      {source&&<a href={source} target="_blank" rel="noopener noreferrer">Read source and assertions <ArrowUpRight size={15}/></a>}
                    </div>}
                  </div>;
                })}
              </div>}
            </div>;
          }):<div className="eq-test-no-match"><Search size={22}/><strong>No tests match the filter.</strong><p>Try a different status or search term.</p><button onClick={()=>{setFilter('all');setSearch('');}}>Clear filters</button></div>}
        </div>
        <div className="eq-detail-footer"><Info size={17}/><p>All outcomes and durations come from JUnit reports generated by actual CI test execution. A passing test is evidence for that tested behavior, not proof of complete application correctness. Full logs and artifacts are linked in GitHub Actions.</p>
          <a href={'https://github.com/adryanra97/server_agent/actions/runs/'+report.run_id} target="_blank" rel="noopener noreferrer">Open full report <ArrowUpRight size={16}/></a>
        </div>
      </>}
  </section>;
}
