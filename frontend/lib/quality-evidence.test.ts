import { describe, expect, it } from 'vitest';
import { hypothesisCaseStats, isHypothesisCase } from './quality-evidence';

describe('Hypothesis evidence',()=>{
  it('identifies Python property tests, not unrelated files',()=>{
    expect(isHypothesisCase({suite:'backend',file:'backend/tests/test_rules_properties.py',status:'passed'})).toBe(true);
    expect(isHypothesisCase({suite:'backend',file:'backend/tests/test_simpy_properties.py',status:'passed'})).toBe(true);
    expect(isHypothesisCase({suite:'backend',file:'backend/tests/test_simpy.py',status:'passed'})).toBe(false);
    expect(isHypothesisCase({suite:'frontend',file:'backend/tests/test_rules_properties.py',status:'passed'})).toBe(false);
    expect(isHypothesisCase({suite:'backend',file:'backend/tests/test_bad_properties.py/extra',status:'passed'})).toBe(false);
  });
  it('calculates totals only from recorded property cases',()=>{
    const cases=[
      {suite:'backend',file:'backend/tests/test_rules_properties.py',status:'passed'},
      {suite:'backend',file:'backend/tests/test_rules_properties.py',status:'failed'},
      {suite:'backend',file:'backend/tests/test_simpy_properties.py',status:'error'},
      {suite:'backend',file:'backend/tests/test_simpy_properties.py',status:'skipped'},
      {suite:'frontend',file:'frontend/lib/model.test.ts',status:'passed'},
    ];
    expect(hypothesisCaseStats(cases)).toEqual({total:4,passed:1,failed:2,skipped:1});
  });
  it('returns zero counts when there is no evidence',()=>{
    expect(hypothesisCaseStats([])).toEqual({total:0,passed:0,failed:0,skipped:0});
  });
});
