import {describe,expect,it} from 'vitest';
import {render,screen} from '@testing-library/react';
import QaSubmissionNotes from './qa-submission-notes';

const submission={
  qaNotes:'Development Notes\nAfter the patch, CPU utilization stayed below threshold.',
  createdAt:'2026-11-17T12:00:00.000Z',
  createdBy:'qa' as const,
};

describe('QA-to-Technical-Lead handoff',()=>{
  it('makes the provenance and content of the submitted QA notes explicit',()=>{
    render(<QaSubmissionNotes item={submission}/>);
    const section=screen.getByRole('region',{name:'QA submission notes'});
    expect(section).toHaveTextContent('QA testing notes');
    expect(section).toHaveTextContent('Submitted by QA Tester');
    expect(section).toHaveTextContent('Development Notes');
    expect(section).toHaveTextContent('After the patch, CPU utilization stayed below threshold.');
    // DOM textContent preserves the exact line breaks; jest-dom toHaveTextContent normalizes whitespace.
    expect(section.querySelector('.tp-qa-submission-text')?.textContent).toBe(submission.qaNotes);
  });
  it('displays a specific empty state for legacy submissions with no notes',()=>{
    render(<QaSubmissionNotes item={{...submission,qaNotes:''}}/>);
    expect(screen.getByRole('region',{name:'QA submission notes'}))
      .toHaveTextContent('No QA testing notes were included in this submission.');
  });
  it('does not crash if legacy imported data has an unreadable timestamp',()=>{
    render(<QaSubmissionNotes item={{...submission,createdAt:'unknown'}}/>);
    expect(screen.getByText(/Date unavailable/)).toBeInTheDocument();
  });
});
