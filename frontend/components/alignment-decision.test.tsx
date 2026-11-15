import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AlignmentDecision from './alignment-decision';
import type { DemoAlignment } from '../lib/demo';

const sample=(verdict:'will_survive'|'will_crash'='will_survive'):DemoAlignment=>({
  id:'cycle-03',type:'alignment',createdAt:'2026-11-15',updatedAt:'2026-11-15',
  release:'QRIS-RC03',cycle:3,service:'QRIS',qaNotes:'Load test',createdBy:'qa',
  status:'review',runId:'run-01',rps:45,
  result:{
    verdict,confidence:.9,engine:'simpy',bottleneck:null,
    resources:{
      cpu:{utilization:.3,status:'ok'},ram:{utilization:.2,status:'ok'},
      network:{utilization:.1,status:'ok'},
    },reasons:['Test scenario'],
  },
});
describe('Technical Lead release decision controls',()=>{
  it('requires a review note before confirmation',()=>{
    const save=vi.fn();
    render(<AlignmentDecision item={sample()} onSave={save}/>);
    fireEvent.click(screen.getByRole('button',{name:/review decision/i}));
    expect(screen.getByRole('alert')).toHaveTextContent('Add the next-cycle action');
    expect(save).not.toHaveBeenCalled();
  });
  it('shows confirmation before committing sign-off recommendation',()=>{
    const save=vi.fn();
    render(<AlignmentDecision item={sample()} onSave={save}/>);
    fireEvent.change(screen.getByPlaceholderText(/required next steps/i),{target:{value:'CPU profile verified'}});
    fireEvent.click(screen.getByRole('button',{name:/review decision/i}));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm this decision?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/confirm & save/i}));
    expect(save).toHaveBeenCalledWith('pending-signoff','CPU profile verified');
  });
  it('allows returning a cycle to Development',()=>{
    const save=vi.fn();
    render(<AlignmentDecision item={sample()} onSave={save}/>);
    fireEvent.click(screen.getByRole('radio',{name:/Return to Dev/i}));
    fireEvent.change(screen.getByPlaceholderText(/required next steps/i),{target:{value:'Re-run after patch'}});
    fireEvent.click(screen.getByRole('button',{name:/review decision/i}));
    fireEvent.click(screen.getByRole('button',{name:/confirm & save/i}));
    expect(save).toHaveBeenCalledWith('returned','Re-run after patch');
  });
  it('warns when forwarding an overloaded model outcome',()=>{
    render(<AlignmentDecision item={sample('will_crash')} onSave={vi.fn()}/>);
    expect(screen.getByRole('radio',{name:/Return to Dev/i})).toBeChecked();
    fireEvent.click(screen.getByRole('radio',{name:/Forward for sign-off/i}));
    expect(screen.getByText(/exceeds modeled capacity/i)).toBeInTheDocument();
  });
  it('lets the reviewer edit the rationale before confirming',()=>{
    const save=vi.fn();
    render(<AlignmentDecision item={sample()} onSave={save}/>);
    fireEvent.change(screen.getByPlaceholderText(/required next steps/i),{target:{value:'First note'}});
    fireEvent.click(screen.getByRole('button',{name:/review decision/i}));
    fireEvent.click(screen.getByRole('button',{name:'Edit'}));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('First note')).toBeInTheDocument();
  });
});
