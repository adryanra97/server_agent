import Link from 'next/link';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, BookOpenText, Braces,
  FileCode2, FileJson, GitBranch, Layers3, Network, Settings2, ShieldCheck, Workflow,
  type LucideIcon,
} from 'lucide-react';

type ShowcaseCard={
  index:string;category:string;title:string;description:string;
  href:string;cta:string;icon:LucideIcon;featured?:boolean;
};
const capabilities:ShowcaseCard[]=[
  {
    index:'01',category:'DISCRETE-EVENT ENGINE',title:'SimPy Workbench',
    description:'Configure a workload, run the original simulation engine, and inspect the recorded request flow, resource occupancy, and time-series charts.',
    href:'/simulation',cta:'Run simulation',icon:Activity,featured:true,
  },
  {
    index:'02',category:'CAPACITY PLANNING',title:'Compare Workloads',
    description:'Compare normal, 2× and 3× demand using real evaluations, without assuming a fixed request-per-second limit or inventing measurements.',
    href:'/compare',cta:'Compare scenarios',icon:BarChart3,
  },
  {
    index:'03',category:'CONTINUOUS VERIFICATION',title:'Engineering Quality',
    description:'Inspect GitHub Actions jobs, Python and frontend tests, browser journeys, measured coverage, and security audit evidence.',
    href:'/quality',cta:'Review CI/CD evidence',icon:Workflow,featured:true,
  },
  {
    index:'04',category:'API CONTRACT',title:'API Explorer',
    description:'Browse the existing evaluation endpoints and inspect live JSON responses. Open the actual Swagger interface and OpenAPI specification.',
    href:'/developer',cta:'Inspect the APIs',icon:Braces,
  },
  {
    index:'05',category:'SYSTEM DESIGN',title:'Engine Methodology',
    description:'Understand how Rules and SimPy produce verdicts, which assumptions they make, and what the models do not claim.',
    href:'/methodology',cta:'Read methodology',icon:BookOpenText,
  },
  {
    index:'06',category:'OPTIONAL EXPLANATION',title:'LLM Settings',
    description:'Show how temporary, session-only AI configuration can add interpretation while the simulation remains the source of every capacity verdict.',
    href:'/settings',cta:'See AI configuration',icon:Settings2,
  },
];

const references=[
  {title:'CI/CD execution history',detail:'GitHub Actions · real job runs',href:'https://github.com/adryanra97/server_agent/actions/workflows/quality.yml',icon:Workflow},
  {title:'CI pipeline definition',detail:'GitHub Actions · quality.yml source',href:'https://github.com/adryanra97/server_agent/blob/main/.github/workflows/quality.yml',icon:GitBranch},
  {title:'Test evidence JSON',detail:'Published per-run reports · quality-reports',href:'https://github.com/adryanra97/server_agent/blob/quality-reports/latest.json',icon:FileJson},
  {title:'OpenAPI specification',detail:'GET /openapi.json · machine-readable schema',href:'/openapi.json',icon:FileCode2},
  {title:'Swagger API documentation',detail:'GET /docs · interactive endpoint reference',href:'/docs',icon:Network},
  {title:'Backend quality JSON',detail:'GET /api/v1/quality · measured CI metadata',href:'/api/v1/quality',icon:ShieldCheck},
];

export default function PlatformShowcase(){
  return <div className="tp-showcase">
    <section className="tp-showcase-hero" aria-labelledby="tp-showcase-title">
      <div className="tp-showcase-intro">
        <div className="tp-showcase-overline"><Layers3 size={16}/> PLATFORM SHOWCASE / TECHNICAL DEMO</div>
        <h1 id="tp-showcase-title">See what powers <em>every release decision.</em></h1>
        <p>Explore the engineering behind TwinPeak: genuine simulations, verifiable CI/CD results, JSON interfaces and model documentation. All five demo personas can access this technical showcase.</p>
        <div className="tp-showcase-hero-actions">
          <Link href="/quality" className="tp-showcase-primary">View engineering evidence <ArrowRight size={17}/></Link>
          <Link href="/developer" className="tp-showcase-secondary">Inspect API contracts <ArrowUpRight size={16}/></Link>
        </div>
      </div>
      <div className="tp-showcase-diagram" aria-label="Illustrative engineering evidence flow">
        <div className="tp-showcase-diagram-label"><span>HOW THE PLATFORM IS VERIFIED</span><ShieldCheck size={17}/></div>
        <div className="tp-showcase-diagram-steps">
          <div><GitBranch size={18}/><span>Source</span><small>Git repository</small></div>
          <span className="tp-showcase-connector" aria-hidden="true"/>
          <div><Workflow size={18}/><span>CI checks</span><small>Actions jobs</small></div>
          <span className="tp-showcase-connector" aria-hidden="true"/>
          <div><FileJson size={18}/><span>Evidence</span><small>Recorded results</small></div>
        </div>
        <p>A map of the verification flow, not a claim about the current run. Open Engineering Quality for live evidence.</p>
      </div>
    </section>

    <section className="tp-showcase-section" aria-labelledby="tp-capabilities-title">
      <div className="tp-showcase-section-heading"><div>
        <span className="tp-showcase-eyebrow">LIVE FUNCTIONAL DEMONSTRATIONS</span>
        <h2 id="tp-capabilities-title">Explore the capabilities.</h2>
        <p>Each item opens a real TwinPeak workspace tool, not a screenshot or static mockup.</p>
      </div><span className="tp-showcase-counter">06 MODULES</span></div>
      <div className="tp-showcase-grid">
        {capabilities.map(item=>{
          const Icon=item.icon;
          return <Link key={item.href} href={item.href} className={'tp-showcase-card'+(item.featured?' tp-showcase-card-featured':'')}>
            <div className="tp-showcase-card-top"><span>{item.category}</span><span>{item.index} / 06</span></div>
            <div className="tp-showcase-card-icon"><Icon size={23} strokeWidth={1.8}/></div>
            <h3>{item.title}</h3><p>{item.description}</p>
            <span className="tp-showcase-card-cta">{item.cta} <ArrowUpRight size={16}/></span>
          </Link>;
        })}
      </div>
    </section>

    <section className="tp-showcase-section tp-showcase-proof" aria-labelledby="tp-evidence-title">
      <div className="tp-showcase-section-heading"><div>
        <span className="tp-showcase-eyebrow">INSPECT THE ACTUAL EVIDENCE</span>
        <h2 id="tp-evidence-title">Source, pipeline and JSON.</h2>
        <p>Open the original sources and inspect what the system actually exposes.</p>
      </div></div>
      <div className="tp-showcase-reference-grid">
        {references.map(item=>{
          const Icon=item.icon;
          return <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="tp-showcase-reference">
            <span className="tp-showcase-reference-icon"><Icon size={19}/></span>
            <span className="tp-showcase-reference-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
            <ArrowUpRight size={18} className="tp-showcase-reference-arrow"/>
          </a>;
        })}
      </div>
    </section>
    <div className="tp-showcase-footnote">
      <ShieldCheck size={21}/>
      <div><strong>One technical showcase, every perspective.</strong><p>Platform Showcase is an examiner-facing demonstration area, not an additional business use case or UAM role. Operational actions and sign-off remain scoped to each guided persona. Permissions in this demo are browser-local, not production authorization.</p></div>
      <Link href="/dashboard">Role workspace <ArrowRight size={15}/></Link>
    </div>
  </div>;
}
