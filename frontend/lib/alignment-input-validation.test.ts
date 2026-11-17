import {describe,expect,it} from 'vitest';
import {validateAlignmentInputs,type AlignmentInputs} from './alignment-input-validation';
const good:AlignmentInputs={peak:45,cores:4,ram:512,cpuMs:11,memPerReq:5,concurrent:20,payload:10,bandwidth:100,maxConnections:1000};
describe('Alignment input preflight',()=>{
  it('accepts valid whole-number input',()=>expect(validateAlignmentInputs(good)).toBeNull());
  it('blocks one request that needs more memory than the server holds',()=>{
    const message=validateAlignmentInputs({...good,memPerReq:2312312});
    expect(message).toMatch(/memory per request.*exceeds total server RAM/i);
    expect(message).toMatch(/No request was sent to SimPy/);
  });
  it('flags a cleared field',()=>expect(validateAlignmentInputs({...good,peak:NaN})).toMatch(/Normal demand.*whole number/));
  it('does not accept fractional inputs',()=>expect(validateAlignmentInputs({...good,cpuMs:1.5})).toMatch(/CPU time.*whole number/));
  it('allows overload scenarios to reach SimPy',()=>expect(validateAlignmentInputs({...good,concurrent:100000,maxConnections:10})).toBeNull());
});

// Visual error feedback should identify the actual field, not blame the engine.
import {alignmentFieldIssues} from './alignment-input-validation';
describe('Alignment field-level validation feedback',()=>{
  it('attaches impossible per-request memory to its input',()=>{
    const issues=alignmentFieldIssues({...good,ram:512,memPerReq:2312312});
    expect(issues.memPerReq).toMatch(/Exceeds production RAM/);
    expect(issues.ram).toBeUndefined();
  });
  it('identifies a missing workload field',()=>{
    expect(alignmentFieldIssues({...good,peak:NaN}).peak).toMatch(/whole number/);
  });
});
