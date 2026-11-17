/** Preflight for demo inputs, independent of the SimPy engine's status. */
export type AlignmentInputs={
  peak:number;cores:number;ram:number;cpuMs:number;memPerReq:number;
  concurrent:number;payload:number;bandwidth:number;maxConnections:number;
};
export function validateAlignmentInputs(values:AlignmentInputs):string|null{
  const fields:{label:string;value:number;min:number}[]=[
    {label:'Normal demand (RPS)',value:values.peak,min:1},
    {label:'Production CPU cores',value:values.cores,min:1},
    {label:'Production RAM (MB)',value:values.ram,min:1},
    {label:'CPU time / request (ms)',value:values.cpuMs,min:1},
    {label:'Memory / request (MB)',value:values.memPerReq,min:0},
    {label:'Concurrent connections',value:values.concurrent,min:0},
    {label:'Response payload (KB)',value:values.payload,min:0},
    {label:'Network bandwidth (Mbps)',value:values.bandwidth,min:1},
    {label:'Maximum connections',value:values.maxConnections,min:1},
  ];
  for(const field of fields){
    if(!Number.isSafeInteger(field.value)||field.value<field.min){
      return 'Input needs correction: '+field.label+' must be a whole number'+
        (field.min===0?' of zero or greater.':' greater than zero.')+
        ' No request was sent to SimPy.';
    }
  }
  if(values.memPerReq>values.ram){
    return 'Input needs correction: memory per request ('+values.memPerReq+
      ' MB) exceeds total server RAM ('+values.ram+
      ' MB). A single request cannot reserve more memory than the server has. '+
      'Reduce memory per request or increase production RAM. No request was sent to SimPy.';
  }
  return null;
}
