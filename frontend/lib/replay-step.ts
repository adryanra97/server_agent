/** Pure step helper so repeat and stop boundaries can be checked independently. */
export function nextReplayIndex(current:number,last:number,looping:boolean):number{
  if(last<=0)return 0;
  return current>=last?(looping?0:last):current+1;
}
