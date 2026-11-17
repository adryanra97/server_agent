'use client';
import type { InputHTMLAttributes } from 'react';

/** Empty is NaN, not zero. Non-integer input is rejected without reinterpretation. */
export function WholeNumberInput({value,onChange,...props}:
  Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'type'> & {
    value:number;onChange:(value:number)=>void;
  }){
  return <input {...props} type="text" inputMode="numeric" pattern="[0-9]*"
    autoComplete="off" value={Number.isSafeInteger(value)&&value>=0?String(value):''}
    onChange={event=>{
      const raw=event.currentTarget.value;
      if(raw===''){onChange(Number.NaN);return;}
      if(!/^\d+$/.test(raw))return;
      const parsed=Number(raw);
      if(Number.isSafeInteger(parsed))onChange(parsed);
    }}/>;
}
