'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleHelp, CircleMinus, Clock3, Code2, GitBranch, GitCommitHorizontal, Info, LoaderCircle, ShieldCheck, ShieldAlert, Sparkles, Terminal, TestTube2, Workflow, XCircle } from 'lucide-react';
import { Eyebrow } from './ui';
type QualityResult={source:string;repository:string;status:string;conclusion:string|null;url:string;run_id:number|null;coverage:number|null;coverage_status:string};
const checks=[
  {name:'Pytest',desc:'Backend unit tests & model edge cases',cmd:'pytest --cov=app --cov=main --cov-branch'},
  {name:'Black',desc:'Consistent Python formatting',cmd:'black --check app main.py tests'},
  {name:'Ruff',desc:'Linting, imports, and static checks',cmd:'ruff check app main.py tests'},
  {name:'TypeScript',desc:'Strict frontend type validation',cmd:'npm run lint'},
  {name:'Next.js build',desc:'Catch app compilation and integration issues',cmd:'npm run build'},
];
export default function Quality(){
  const [quality,setQuality]=useState<QualityResult|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let cancelled=false;fetch('/api/v1/quality').then(r=>{if(!r.ok)throw new Error('Quality endpoint unavailable');return r.json()}).then(d=>{if(!cancelled)setQuality(d)}).catch(e=>{if(!cancelled)setError(e.message)});return()=>{cancelled=true}},[]);
  const passed=quality?.conclusion==='success';const failed=quality?.conclusion==='failure';
  return <div className="page-stack"><div className="notice notice-technical"><span className="notice-icon"><ShieldCheck size={19}/></span><div><strong>Quality gates belong in the workflow, not just a dashboard.</strong><span>CI results are read from GitHub Actions. A 100% coverage target is not displayed as achieved until measured and reported.</span></div><a href="https://github.com/adryanra97/server_agent/actions" className="notice-link" target="_blank" rel="noopener noreferrer">GitHub Actions <ArrowUpRight size={16}/></a></div>
    <div className="quality-stats"><div className="panel quality-stat"><span className="kicker">LATEST CI RUN</span><strong className={passed?'text-success':failed?'text-danger':''}>{!quality?'Checking…':passed?'Passed':failed?'Failed':quality.conclusion??quality.status}</strong><p>{quality?.run_id?`Workflow run #${quality.run_id}`:'Awaiting a completed run'}</p></div>
      <div className="panel quality-stat"><span className="kicker">LINE COVERAGE</span><strong>{quality?.coverage==null?'—':`${quality.coverage}%`}</strong><p>Measured value not yet published to API</p></div>
      <div className="panel quality-stat"><span className="kicker">TARGET COVERAGE</span><strong>100%</strong><p>Line and branch coverage goal</p></div>
      <div className="panel quality-stat"><span className="kicker">QUALITY CHECKS</span><strong>{checks.length.toString().padStart(2,'0')}</strong><p>Automated pipeline categories</p></div>
    </div>
    <div className="quality-grid"><section className="panel"><div className="panel-heading"><div><span className="kicker">CONTINUOUS INTEGRATION</span><h3>Quality gate registry</h3></div><span className="icon-frame"><Workflow size={19}/></span></div>
      <div className="quality-checks">{checks.map((c,i)=><div className="quality-check" key={c.name}><span className="check-index">{String(i+1).padStart(2,'0')}</span><div><strong>{c.name}</strong><p>{c.desc}</p><code>{c.cmd}</code></div><span className="check-status">CI CHECK</span></div>)}</div>
      <div className="quality-footer">Check the linked GitHub run for each step's real status and logs.</div>
    </section><section className="panel quality-right"><div className="panel-heading"><div><span className="kicker">RELEASE ASSURANCE</span><h3>Evidence over badges</h3></div><span className="icon-frame"><GitBranch size={19}/></span></div>
      <div className="quality-signal"><div className="quality-signal-icon">{passed?<CheckCircle2 size={25}/>:failed?<XCircle size={25}/>:<Clock3 size={25}/>}</div><span className="kicker">WORKFLOW CONCLUSION</span><h3>{passed?'Checks passed':failed?'Action required':'Not yet verified'}</h3><p>{passed?'The latest CI workflow completed successfully. Review coverage and individual checks in GitHub.':failed?'One or more jobs failed. Inspect the GitHub Actions logs before release.':'Run the GitHub Actions workflow to collect evidence. No success is assumed in advance.'}</p><a className="btn btn-outline" href={quality?.url??'https://github.com/adryanra97/server_agent/actions'} target="_blank" rel="noopener noreferrer">Inspect CI execution <ArrowUpRight size={17}/></a></div>
      <div className="quality-principles"><span className="kicker">QUALITY PRINCIPLES</span><div><CheckCircle2 size={16}/> Repeatable simulation outcomes</div><div><CheckCircle2 size={16}/> Explicit coverage thresholds</div><div><CheckCircle2 size={16}/> Independent formatter & linter checks</div><div><CheckCircle2 size={16}/> No fabricated CI data</div></div>
    </section></div>
    {error&&<p className="error-box">{error}. <a href="https://github.com/adryanra97/server_agent/actions" target="_blank" rel="noopener noreferrer">Open GitHub Actions</a></p>}
    <div className="insight-bar"><span className="insight-symbol"><Info size={19}/></span><div><strong>Coverage is only one measure of engineering quality.</strong><span>Model calibration, security, observability, accessibility, integration tests and boundary scenarios matter alongside branch and line coverage.</span></div></div>
  </div>;
}
