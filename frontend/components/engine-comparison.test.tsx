import {describe,expect,it} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import EngineComparison from './engine-comparison';
import type {VerdictResult} from '../lib/model';
const base:VerdictResult={
  verdict:'will_survive',confidence:.92,engine:'simpy',bottleneck:'cpu',
  resources:{cpu:{status:'ok',utilization:.246},ram:{status:'ok',utilization:.001},network:{status:'ok',utilization:.008}},
  reasons:['Recorded scenario'],
};
const rules:VerdictResult={
  ...base,engine:'rules',
  resources:{cpu:{status:'ok',utilization:.25},ram:{status:'ok',utilization:.061},network:{status:'ok',utilization:.01}},
};
describe('Engine cross-check visual comparison',()=>{
  it('highlights the largest difference while retaining exact model values',()=>{
    render(<EngineComparison simpy={base} rules={rules}/>);
    expect(screen.getByText('Same capacity verdict')).toBeInTheDocument();
    const ram=within(screen.getByRole('group',{name:'RAM comparison'}));
    expect(ram.getByText('0.1%')).toBeInTheDocument();
    expect(ram.getByText('6.1%')).toBeInTheDocument();
    const cpu=within(screen.getByRole('group',{name:'CPU comparison'}));
    expect(cpu.getByText('24.6%')).toBeInTheDocument();
    expect(cpu.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByText(/Largest utilization gap: RAM · 6.0 percentage points/)).toBeInTheDocument();
    const cards=screen.getByRole('list',{name:'Engine resource utilization comparison'});
    expect(within(cards).getAllByRole('listitem')).toHaveLength(3);
  });
  it('shows a clear message when verdicts disagree',()=>{
    render(<EngineComparison simpy={base} rules={{...rules,verdict:'will_crash'}}/>);
    expect(screen.getByText('Different capacity verdicts')).toBeInTheDocument();
  });
  it('uses a shared scale for ratios over capacity, without hiding the percentage',()=>{
    const high={...base,resources:{...base.resources,cpu:{status:'critical' as const,utilization:1.5}}};
    const {container}=render(<EngineComparison simpy={high} rules={rules}/>);
    expect(screen.getByText('150.0%')).toBeInTheDocument();
    expect(screen.getByText('SHARED BAR SCALE 0–150%')).toBeInTheDocument();
    const fill=container.querySelector('.simpy-compare-metric .simpy-compare-fill.simpy');
    expect(fill).toHaveStyle('width: 100%');
  });
});
