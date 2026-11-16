/** Interprets recorded occupancy, not a model verdict or a server failure. */
export type PressureLevel = 'idle'|'normal'|'warning'|'critical';

export function pressureLevel(percent:number|undefined|null):PressureLevel {
  if(percent==null||!Number.isFinite(percent))return 'idle';
  if(percent>=100)return 'critical';
  if(percent>=80)return 'warning';
  return 'normal';
}

export function pressureLabel(level:PressureLevel):string {
  return {
    idle:'Awaiting data',
    normal:'Normal',
    warning:'Elevated',
    critical:'At capacity',
  }[level];
}
