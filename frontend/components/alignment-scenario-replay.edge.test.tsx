import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AlignmentScenarioReplay, { type ReplayCase } from './alignment-scenario-replay';
import type { TraceSample } from '../lib/trace';

vi.mock('./simpy-timeline',()=>({
  default:({trace}:{trace:TraceSample[]})=><div data-testid="full-replay">{trace.length} measured buckets</div>,
}));
const row=(second:number):TraceSample=>({
  second,cpu_percent:25,ram_percent:20,network_percent:3,queue_avg:0,
  arrivals:12,completed:11,duration_seconds:1,in_flight:0,
  connection_percent:5,network_mbps:1,cpu_queue_avg:0,
});
const recorded:ReplayCase[]=[
  {factor:1,rps:50,verdict:'will_survive',timeline:[row(0),row(1)]},
  {factor:2,rps:100,verdict:'at_risk',timeline:[
    {second:0,cpu_percent:50,ram_percent:20,network_percent:3,queue_avg:0,arrivals:20,completed:19},
    {second:1,cpu_percent:55,ram_percent:20,network_percent:3,queue_avg:1,arrivals:20,completed:18},
  ]},
  {factor:3,rps:150,verdict:'not_assessable'},
];
describe('Simulation playback degradation and error recovery',()=>{
  it('renders nothing for an empty scenario list',()=>{
    const {container}=render(<AlignmentScenarioReplay cases={[]} sectionId="empty"/>);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders custom headings for saved release evidence',()=>{
    render(<AlignmentScenarioReplay cases={recorded} heading="Technical Lead evidence" sectionId="case-A"/>);
    expect(screen.getByRole('heading',{name:'Technical Lead evidence'})).toBeInTheDocument();
    expect(screen.getByTestId('full-replay')).toBeInTheDocument();
  });
  it('shows a real trend for older scenarios that lack full replay fields',()=>{
    render(<AlignmentScenarioReplay cases={recorded} sectionId="older"/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    expect(screen.getByText('RECORDED TREND AVAILABLE')).toBeInTheDocument();
    expect(screen.getByText(/previously saved record contains a resource trend/i)).toBeInTheDocument();
    expect(screen.queryByTestId('full-replay')).not.toBeInTheDocument();
  });
  it('never offers synthetic playback for an unassessable workload',()=>{
    render(<AlignmentScenarioReplay cases={recorded} sectionId="unavailable" onLoadReplay={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:/3× DEMAND/}));
    expect(screen.queryByRole('button',{name:/Generate replay/i})).not.toBeInTheDocument();
    expect(screen.getByText('TIME SERIES NOT RECORDED')).toBeInTheDocument();
  });
  it('shows a progress state until an actual model inspection resolves',async()=>{
    let resolve!:(value:TraceSample[])=>void;
    const deferred=new Promise<TraceSample[]>(done=>{resolve=done;});
    const fetchReplay=vi.fn().mockReturnValue(deferred);
    render(<AlignmentScenarioReplay cases={recorded} sectionId="progress" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    fireEvent.click(screen.getByRole('button',{name:/Generate replay/i}));
    expect(screen.getByRole('button',{name:/Loading recorded replay/i})).toBeDisabled();
    resolve([row(0),row(1)]);
    expect(await screen.findByTestId('full-replay')).toBeInTheDocument();
    expect(fetchReplay).toHaveBeenCalledWith(2);
  });
  it('rejects an incomplete backend trace instead of fabricating animation',async()=>{
    const fetchReplay=vi.fn().mockResolvedValue([row(0)]);
    render(<AlignmentScenarioReplay cases={recorded} sectionId="invalid" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    fireEvent.click(screen.getByRole('button',{name:/Generate replay/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent('no complete replay data');
    expect(screen.queryByTestId('full-replay')).not.toBeInTheDocument();
  });
  it('shows the backend error and supports retry',async()=>{
    const fetchReplay=vi.fn().mockRejectedValueOnce(Error('Backend not ready'))
      .mockResolvedValueOnce([row(0),row(1)]);
    render(<AlignmentScenarioReplay cases={recorded} sectionId="retry" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    fireEvent.click(screen.getByRole('button',{name:/Generate replay/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend not ready');
    fireEvent.click(screen.getByRole('button',{name:/Generate replay/i}));
    expect(await screen.findByTestId('full-replay')).toBeInTheDocument();
    expect(fetchReplay).toHaveBeenCalledTimes(2);
  });
  it('does not display internal non-Error thrown objects to users',async()=>{
    const fetchReplay=vi.fn().mockRejectedValue('backend-private-object');
    render(<AlignmentScenarioReplay cases={recorded} sectionId="bad-error" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    fireEvent.click(screen.getByRole('button',{name:/Generate replay/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent('SimPy could not load this replay.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('backend-private-object');
  });
  it('falls back to another available scenario if the selected one disappears',()=>{
    const {rerender}=render(<AlignmentScenarioReplay cases={recorded} sectionId="rerender"/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    rerender(<AlignmentScenarioReplay cases={[recorded[0]]} sectionId="rerender"/>);
    expect(screen.getByText(/Normal workload/i)).toBeInTheDocument();
    expect(screen.getByTestId('full-replay')).toBeInTheDocument();
  });
  it('clears visible replay failures after selecting another scenario',async()=>{
    const fetchReplay=vi.fn().mockRejectedValue(Error('Temporary offline'));
    render(<AlignmentScenarioReplay cases={recorded} sectionId="tabs" onLoadReplay={fetchReplay}/>);
    fireEvent.click(screen.getByRole('button',{name:/2× DEMAND/}));
    fireEvent.click(screen.getByRole('button',{name:/Generate replay/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary offline');
    fireEvent.click(screen.getByRole('button',{name:/NORMAL DEMAND/}));
    await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
