'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Minus, ShieldCheck } from 'lucide-react';
import { allowedPages, demoPersonas, getPersona, selectDemoPersona, type DemoRole } from '../lib/demo';

const entries=[
  {href:'/dashboard',title:'Overview',description:'Release status and work queue'},
  {href:'/alignment',title:'Release alignment',description:'Submit evidence and decide next cycle'},
  {href:'/incident',title:'Incident response',description:'Escalate incidents and assess mitigation'},
  {href:'/signoff',title:'Sign-off',description:'Review technical recommendations'},
  {href:'/reports',title:'Report',description:'Find decisions and download reports'},
  {href:'/access',title:'Access & roles',description:'Role permissions and perspective'},
];
export default function AccessRoles({role}:{role:DemoRole}){
  const router=useRouter();
  function enter(id:DemoRole){selectDemoPersona(id);router.push('/dashboard');}
  return <div className="tp-access">
    <section className="tp-access-hero"><span className="tp-kicker"><ShieldCheck size={16}/> ROLE ACCESS / FIVE PERSPECTIVES</span>
      <h2>Every decision has an owner.</h2><p>Explore responsibilities for alignment, incident response, sign-off, and reporting. Change perspective to follow the complete release journey.</p>
    </section>
    <section className="tp-access-matrix"><div className="tp-access-heading"><h3>Menu access by role</h3><span>✓ Available · — Not assigned</span></div>
      <div className="tp-access-scroll"><table><thead><tr><th scope="col">Workspace</th>{demoPersonas.map(p=><th key={p.id} scope="col">{p.shortRole}</th>)}</tr></thead>
        <tbody>{entries.map(page=><tr key={page.href}><th scope="row"><strong>{page.title}</strong><small>{page.description}</small></th>{demoPersonas.map(p=><td key={p.id} aria-label={allowedPages(p.id).some(v=>v.href===page.href)?'Available':'Not assigned'}>{allowedPages(p.id).some(v=>v.href===page.href)?<Check size={20} className="tp-permitted"/>:<Minus size={18} className="tp-unassigned"/>}</td>)}</tr>)}</tbody></table></div>
    </section>
    <section className="tp-access-roles"><div className="tp-access-heading"><h3>Explore another role</h3><span>Current: {getPersona(role).shortRole}</span></div>
      <div className="tp-access-role-grid">{demoPersonas.map(p=><button key={p.id} type="button" className={'tp-access-role '+(role===p.id?'active':'')} onClick={()=>enter(p.id)}>
        <span>{p.initial}</span><div><strong>{p.shortRole}</strong><small>{p.mission}</small></div><ArrowRight size={17}/>
      </button>)}</div>
    </section>
  </div>;
}
