import {describe,expect,it} from 'vitest';
import {nextReplayIndex} from './replay-step';
describe('recorded replay stepping',()=>{
  it('starts again at the first recorded sample when looping',()=>{
    expect(nextReplayIndex(3,3,true)).toBe(0);
    expect(nextReplayIndex(2,3,true)).toBe(3);
    expect(nextReplayIndex(0,3,true)).toBe(1);
  });
  it('stays at the end when repeat is turned off',()=>{
    expect(nextReplayIndex(3,3,false)).toBe(3);
  });
  it('does not animate an empty or single-sample trace',()=>{
    expect(nextReplayIndex(0,0,true)).toBe(0);
  });
});
