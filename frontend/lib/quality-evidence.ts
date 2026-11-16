/** Detect executed Hypothesis property-test cases from their recorded source. */
export type QualityCase={suite?:string;file:string;status:string};
export function isHypothesisCase(item:QualityCase):boolean{
  return (item.suite??'backend')==='backend' &&
    /^backend\/tests\/test_[a-z0-9_]+_properties\.py$/.test(item.file);
}
export function hypothesisCaseStats(cases:readonly QualityCase[]){
  const items=cases.filter(isHypothesisCase);
  return {
    total:items.length,
    passed:items.filter(item=>item.status==='passed').length,
    failed:items.filter(item=>item.status==='failed'||item.status==='error').length,
    skipped:items.filter(item=>item.status==='skipped').length,
  };
}
