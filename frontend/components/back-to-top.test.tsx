import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import BackToTop from './back-to-top';
vi.mock('next/navigation',()=>({usePathname:()=>'/reports'}));
describe('Back-to-top affordance',()=>{
  beforeEach(()=>{
    Object.defineProperty(window,'innerHeight',{configurable:true,value:800});
    Object.defineProperty(window,'scrollY',{configurable:true,writable:true,value:0});
    Object.defineProperty(document.documentElement,'scrollHeight',{configurable:true,value:4100});
    Object.defineProperty(window,'scrollTo',{configurable:true,value:vi.fn()});
    Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:false})});
  });
  afterEach(()=>{cleanup();vi.restoreAllMocks();});
  it('stays out of the way at the top and appears after scrolling a long page',async()=>{
    render(<BackToTop/>);
    expect(screen.queryByRole('button',{name:'Back to top'})).toBeNull();
    Object.defineProperty(window,'scrollY',{configurable:true,value:850});
    fireEvent.scroll(window);
    expect(await screen.findByRole('button',{name:'Back to top'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Back to top'}));
    expect(window.scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'smooth'});
  });
  it('respects reduced motion and hides on short pages',async()=>{
    Object.defineProperty(window,'scrollY',{configurable:true,value:900});
    Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true})});
    const {rerender}=render(<BackToTop/>);
    fireEvent.click(screen.getByRole('button',{name:'Back to top'}));
    expect(window.scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'auto'});
    Object.defineProperty(document.documentElement,'scrollHeight',{configurable:true,value:1200});
    fireEvent.resize(window);
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Back to top'})).toBeNull());
  });
});
