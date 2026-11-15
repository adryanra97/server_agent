'use client';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react';
import type { DemoAlignment } from '../lib/demo';

export default function AlignmentDecision({item,onSave}:{item:DemoAlignment;onSave:(decision:'returned'|'pending-signoff',note:string)=>void}){
  const unsafe=item.result.verdict==='will_crash';
  const [choice,setChoice]=useState<'returned'|'pending-signoff'>(unsafe?'returned':'pending-signoff');
  const [note,setNote]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [validation,setValidation]=useState('');
  function review(){
    if(!note.trim()){setValidation('Add the next-cycle action or decision rationale.');return;}
    setValidation('');setConfirm(true);
  }
  return <div className="tp-decision">
    <span className="tp-kicker">03 / CYCLE DECISION</span><h4>Choose the next step.</h4>
    <div className="tp-decision-options" role="radiogroup" aria-label="Release cycle decision">
      <label className={choice==='returned'?'selected':''}><input type="radio" name={'decision-'+item.id} checked={choice==='returned'} onChange={()=>{setChoice('returned');setConfirm(false);}}/><span><strong>Return to Dev</strong><small>Revise and test the candidate again</small></span></label>
      <label className={choice==='pending-signoff'?'selected':''}><input type="radio" name={'decision-'+item.id} checked={choice==='pending-signoff'} onChange={()=>{setChoice('pending-signoff');setConfirm(false);}}/><span><strong>Forward for sign-off</strong><small>Send the evidence to the Project Manager</small></span></label>
    </div>
    {unsafe&&choice==='pending-signoff'&&<p className="tp-decision-warning"><CircleAlert size={17}/> This scenario exceeds modeled capacity. Explain why you are forwarding it for sign-off.</p>}
    <label className="tp-decision-note">Next-cycle action / decision note
      <textarea rows={3} value={note} onChange={e=>{setNote(e.target.value);setValidation('');setConfirm(false);}} placeholder="Record the reasoning and required next steps"/>
    </label>
    {validation&&<p role="alert" className="tp-error">{validation}</p>}
    {confirm?<div className="tp-decision-confirm"><ShieldCheck size={21}/><div><strong>Confirm this decision?</strong><p>{item.release} · Cycle {item.cycle} · {choice==='returned'?'Return to Dev':'Forward for sign-off'}</p><p>{note}</p></div><div><button type="button" className="tp-decision-cancel" onClick={()=>setConfirm(false)}>Edit</button><button type="button" onClick={()=>{onSave(choice,note.trim());setConfirm(false);}}>Confirm & save <CheckCircle2 size={16}/></button></div></div>:
    <button type="button" className="tp-decision-save" onClick={review}>Review decision <ArrowRight size={16}/></button>}
  </div>;
}
