import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AlignmentScenarioReplay, { type ReplayCase } from './alignment-scenario-replay';
import type { TraceSample } from '../lib/trace';

vi.mock('./simpy-timeline',()=>({
  default:({trace}:{trace:TraceSample[]})=><div data-testid="animation">{trace.length} recorded points</div>,
}));
const record=(second:number):TraceSample=>({
  second,cpu_percent:30,ram_percent:20,network_percent:10,queue_avg:0,
  arrivals:45,completed:45,duration_seconds:1,in_flight:0,
  connection_percent:5,network_mbps:2,cpu_queue_avg:0,
});
const cases:ReplayCase[]=[
  {factor:1,rps:45,verdict:'will_survive',timeline:[record(0),record(1)]},
  {factor:2,rps:90,verdict:'at_risk',timeline:[record(0),record(1)]},
  {factor:3,rps:135,verdict:'will_crash',timeline:[]},
];
describe('QA/Technical Lead simulation visualization',()=>{
  it('renders real timeline replay for normal load',()=>{
    render(<AlignmentScenarioReplay cases={cases} sectionId="test-replay"/>);
    expect(screen.getByTestId('animation')).toHaveTextContent('2 recorded points');
    expect(screen.getByText(/Normal workload/)).toBeInTheDocument();
  });
  it('switches between normal, double and triple demand',()=>{
    render(<AlignmentScenarioReplay cases={cases} sectionId="test-replay"/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    expect(screen.getByText(/2× workload/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/3× DEMAND/}));
    expect(screen.getByText(/3× workload/)).toBeInTheDocument();
  });
  it('does not invent a replay for missing event data',()=>{
    render(<AlignmentScenarioReplay cases={cases} sectionId="test-replay"/>);
    fireEvent.click(screen.getByRole('button',{name:/3× DEMAND/}));
    expect(screen.queryByTestId('animation')).not.toBeInTheDocument();
    expect(screen.getByText(/no stored time-series replay/i)).toBeInTheDocument();
  });
  it('can fetch an actual replay for older saved cases',async()=>{
    const fetchReplay=vi.fn().mockResolvedValue([record(0),record(1)]);
    render(<AlignmentScenarioReplay cases={cases} sectionId="test-replay" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/3× DEMAND/}));
    fireEvent.click(screen.getByRole('button',{name:/Generate replay from SimPy/}));
    await waitFor(()=>expect(fetchReplay).toHaveBeenCalledWith(3));
    expect(await screen.findByTestId('animation')).toBeInTheDocument();
  });
  it('does not trigger a network replay without the user's click',()=>{
    const fetchReplay=vi.fn();
    render(<AlignmentScenarioReplay cases={cases} sectionId="test-replay" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/3× DEMAND/}));
    expect(fetchReplay).not.toHaveBeenCalled();
  });
});
