import { ClipboardList } from 'lucide-react';
import type { DemoAlignment } from '../lib/demo';

/** Present QA's original submission as review context, never as a generic paragraph
 * or an editable Technical Lead decision note.
 */
export default function QaSubmissionNotes({item}:{
  item:Pick<DemoAlignment,'qaNotes'|'createdAt'|'createdBy'>;
}){
  const note=typeof item.qaNotes==='string'?item.qaNotes.trim():'';
  const timestamp=Date.parse(item.createdAt);
  const submitted=Number.isFinite(timestamp)
    ?new Date(timestamp).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})
    :'Date unavailable';
  return <section className="tp-qa-submission-notes" aria-label="QA submission notes">
    <div className="tp-qa-submission-heading">
      <ClipboardList size={19} aria-hidden="true"/>
      <div>
        <span>SUBMITTED EVIDENCE / QA TESTER</span>
        <h5>QA testing notes</h5>
        <small>Submitted by QA Tester · {submitted}</small>
      </div>
    </div>
    {note?<p className="tp-qa-submission-text">{note}</p>:
      <p className="tp-qa-submission-empty">No QA testing notes were included in this submission.</p>}
  </section>;
}
