import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TracePreview from './trace-preview';
import type { TraceSample } from '../lib/trace';

const sample = (second:number, cpu_percent=20, ram_percent=30, network_percent=10):TraceSample => ({
  second, cpu_percent, ram_percent, network_percent,
  queue_avg:0, arrivals:45, completed:45,
});

describe('recorded SimPy timeline preview', () => {
  it('labels absent, empty and one-bucket traces as unavailable, never as a measured chart', () => {
    for (const points of [undefined, [], [sample(0)]]) {
      const view=render(<TracePreview points={points}/>);
      expect(screen.getByText(/No per-second SimPy trace was saved/)).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('renders three paths from actual saved CPU, RAM and network samples', () => {
    const points=[sample(0,20,35,8),sample(1,45,40,15),sample(2,30,42,12)];
    const {container}=render(<TracePreview points={points}/>);
    expect(screen.getByRole('img',{name:/Recorded SimPy CPU, memory, and network/})).toBeInTheDocument();
    expect(screen.getByText('3 sampled seconds')).toBeInTheDocument();
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('2s')).toBeInTheDocument();
    expect(screen.getByText(/not production telemetry/i)).toBeInTheDocument();
    const paths=Array.from(container.querySelectorAll('path'));
    expect(paths).toHaveLength(3);
    expect(paths.map(path=>path.getAttribute('d'))).toEqual([
      'M43.0 120.6 L343.5 90.1 L644.0 108.4',
      'M43.0 102.3 L343.5 96.2 L644.0 93.8',
      'M43.0 135.2 L343.5 126.7 L644.0 130.4',
    ]);
  });

  it('extends chart range above 100% without hiding an overloaded model sample', () => {
    const {container}=render(<TracePreview points={[sample(5,0,-10,110),sample(5,180,50,10)]}/>);
    expect(screen.getByText('200%')).toBeInTheDocument();
    expect(screen.getAllByText('5s')).toHaveLength(2);
    expect(container.querySelectorAll('path')).toHaveLength(3);
    for (const path of Array.from(container.querySelectorAll('path'))) {
      expect(path.getAttribute('d')).not.toContain('NaN');
      expect(path.getAttribute('d')).not.toContain('Infinity');
    }
  });
});
