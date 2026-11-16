import { describe, expect, it } from 'vitest';
import { pressureLevel, pressureLabel } from './resource-pressure';

describe('recorded resource pressure',()=>{
  it('does not infer load before the model returns a sample',()=>{
    expect(pressureLevel(undefined)).toBe('idle');
    expect(pressureLevel(null)).toBe('idle');
    expect(pressureLevel(Number.NaN)).toBe('idle');
  });
  it('uses the recorded 80% and 100% thresholds',()=>{
    expect(pressureLevel(0)).toBe('normal');
    expect(pressureLevel(79.99)).toBe('normal');
    expect(pressureLevel(80)).toBe('warning');
    expect(pressureLevel(99.99)).toBe('warning');
    expect(pressureLevel(100)).toBe('critical');
    expect(pressureLevel(124)).toBe('critical');
  });
  it('labels occupancy without claiming that the server crashed',()=>{
    expect(pressureLabel('warning')).toBe('Elevated');
    expect(pressureLabel('critical')).toBe('At capacity');
  });
});
