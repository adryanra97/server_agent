'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

/** One consistent, accessible back-to-top control across long TwinPeak pages. */
export default function BackToTop(){
  const pathname=usePathname();
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const update=()=>{
      const root=document.documentElement;
      const offset=window.scrollY||root.scrollTop||0;
      const longPage=root.scrollHeight>window.innerHeight*3.5;
      setVisible(longPage&&offset>Math.max(500,window.innerHeight*.75));
    };
    update();
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[pathname]);
  if(!visible)return null;
  return <button type="button" className="tp-back-to-top" aria-label="Back to top"
    title="Back to top" onClick={()=>{
      window.scrollTo({top:0,left:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }}>
    <ArrowUp size={19} aria-hidden="true"/><span>Back to top</span>
  </button>;
}
