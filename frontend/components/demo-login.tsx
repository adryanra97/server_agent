'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown,
  Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, Waves,
} from 'lucide-react';
import { Brand } from './ui';
import {
  DEMO_PASSWORD,demoLogin,demoPersonas,getPersona,
  type DemoRole,
} from '../lib/demo';

export default function DemoLogin(){
  const router=useRouter();
  const [role,setRole]=useState<DemoRole>('qa');
  const [password,setPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const persona=getPersona(role);
  function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');
    if(!demoLogin(role,password)){setError('Password demo tidak sesuai. Gunakan demo123 untuk semua persona.');return;}
    router.push('/dashboard');
  }
  return <div className="demo-login">
    <header className="demo-login-header">
      <Brand dark/>
      <Link href="/" className="demo-login-back">Back to website <ArrowUpRight size={16}/></Link>
    </header>
    <main className="demo-login-main">
      <div className="demo-login-story">
        <div className="demo-login-overline"><span/> SERVERAGENT / ROLE-BASED WORKSPACE</div>
        <h1>One platform.<br/><em>Different decisions.</em></h1>
        <p>Experience a capacity assessment as five people across one release workflow. Select a user to see how their responsibilities, permissions and decisions differ.</p>
        <div className="demo-login-path">
          <div><span>01</span><div><strong>QA runs the model</strong><small>Configure SimPy and submit performance evidence</small></div></div>
          <div><span>02</span><div><strong>Technical Lead reviews</strong><small>Decide whether the release candidate can progress</small></div></div>
          <div><span>03</span><div><strong>Manager signs off</strong><small>Accept or reject the recommendation</small></div></div>
          <div><span>04</span><div><strong>Support & Engineer investigate</strong><small>Escalate incidents and compare mitigation options</small></div></div>
        </div>
        <div className="demo-login-bottom"><ShieldCheck size={18}/><span>Evaluation workspace · Scenario-based decisions, no production access</span></div>
      </div>
      <div className="demo-login-side">
        <section className="demo-login-panel" aria-labelledby="demo-login-title">
          <div className="demo-login-panel-head"><span>WORKSPACE ACCESS</span><span className="demo-login-environment"><i/> GUIDED ACCESS</span></div>
          <h2 id="demo-login-title">Choose your perspective.</h2>
          <p>Choose one of five guided roles. Each has its own workspace, responsibilities and decisions.</p>
          <form onSubmit={submit}>
            <label className="demo-login-label" htmlFor="demo-role">DEMO USER</label>
            <div className="demo-login-picker">
              <UserRound size={19}/>
              <select id="demo-role" value={role} onChange={event=>{setRole(event.target.value as DemoRole);setError('');}}>
                {demoPersonas.map(user=><option key={user.id} value={user.id}>{user.name} — {user.shortRole}</option>)}
              </select>
              <ChevronDown size={16}/>
            </div>
            <div className="demo-persona-preview">
              <div className="demo-persona-avatar">{persona.initial}</div>
              <div><span>YOUR DEMO ROLE</span><strong>{persona.role}</strong><p>{persona.mission}</p></div>
            </div>
            <label className="demo-login-label" htmlFor="demo-password">ACCESS PASSWORD</label>
            <div className="demo-login-password"><LockKeyhole size={18}/>
              <input id="demo-password" autoComplete="off" type={showPassword?'text':'password'} value={password}
                onChange={event=>{setPassword(event.target.value);setError('');}} placeholder="Enter shared demo password" required/>
              <button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div>
            <div className="demo-login-hint"><span>Shared presentation access: <strong>{DEMO_PASSWORD}</strong></span><button type="button" onClick={()=>setPassword(DEMO_PASSWORD)}>Use demo password</button></div>
            {error&&<p className="demo-login-error" role="alert">{error}</p>}
            <button className="demo-login-submit" type="submit">Continue as {persona.shortRole}<ArrowRight size={19}/></button>
          </form>
          <div className="demo-login-foot"><Waves size={18}/><span>Role views reflect the defined release workflow. Simulation calculations use the same validated evaluation engine.</span></div>
        </section>
        <div className="demo-login-help"><CheckCircle2 size={17}/><span>Switch users at any time. Records from this browser remain available when you change roles.</span></div>
      </div>
    </main>
  </div>;
}
