/** Select CI evidence by deployed source branch, not by a hard-coded count. */
export type QualityBranch='main'|'staging';
export function resolveQualityBranch(gitRef:string|undefined):QualityBranch{
  return gitRef==='staging'?'staging':'main';
}
export function githubRunsUrl(branch:QualityBranch):string{
  return 'https://api.github.com/repos/adryanra97/server_agent/actions/workflows/quality.yml/runs?branch='+
    encodeURIComponent(branch)+'&event=push&per_page=1';
}
export function qualityLatestPath(branch:QualityBranch):string{
  return branch==='staging'?'staging-latest.json':'latest.json';
}
/** Skipped test cases are registered but not executed. */
export function executedTestTotal(summary:{passed:number;failed:number;errors:number}):number{
  return summary.passed+summary.failed+summary.errors;
}
