export type Engine = 'rules' | 'simpy';
export type Verdict = 'will_survive' | 'at_risk' | 'will_crash';
export interface Spec {
  cpu: { cores: number; clock_ghz: number };
  ram: { total_mb: number };
  network: { bandwidth_mbps: number; max_connections: number };
}
export interface Load {
  rps: number; avg_cpu_ms_per_req: number; avg_mem_mb_per_req: number;
  concurrent_connections: number; payload_kb: number;
}
export interface Resource { utilization: number; status: 'ok' | 'warning' | 'critical' }
export interface VerdictResult {
  verdict: Verdict; confidence: number; engine: string;
  bottleneck: string | null; reasons: string[];
  resources: { cpu: Resource; ram: Resource; network: Resource };
}
export interface HistoryItem {
  id: string; label: string; created_at: string; engine: Engine;
  load: Load; spec: Spec; result: VerdictResult;
}
export const baseSpec: Spec = {
  cpu: { cores: 4, clock_ghz: 2.5 },
  ram: { total_mb: 8192 },
  network: { bandwidth_mbps: 1000, max_connections: 10000 },
};
export const baseLoad: Load = {
  rps: 100, avg_cpu_ms_per_req: 10, avg_mem_mb_per_req: 5,
  concurrent_connections: 100, payload_kb: 10,
};
export const verdictText: Record<Verdict, string> = {
  will_survive: 'Within capacity', at_risk: 'Approaching limit', will_crash: 'Capacity exceeded',
};
export function localVerdict(spec: Spec, load: Load): VerdictResult {
  const cpu = load.rps * load.avg_cpu_ms_per_req / 1000 / spec.cpu.cores;
  const ram = load.concurrent_connections * load.avg_mem_mb_per_req / spec.ram.total_mb;
  const net = Math.max(load.rps * load.payload_kb * 8 / 1000 / spec.network.bandwidth_mbps,
    load.concurrent_connections / spec.network.max_connections);
  const entries = { cpu, ram, network: net };
  const peak = Math.max(cpu, ram, net);
  const verdict: Verdict = peak > 1 ? 'will_crash' : peak >= .8 ? 'at_risk' : 'will_survive';
  const status = (v: number): Resource['status'] => v > 1 ? 'critical' : v >= .8 ? 'warning' : 'ok';
  const bottleneck = peak === 0 ? null : Object.entries(entries).sort((a,b)=>b[1]-a[1])[0][0];
  return {
    verdict, confidence: 0, engine: 'local_preview', bottleneck,
    reasons: ['Local analytical preview only. Run the API for the authoritative model output.'],
    resources: { cpu: { utilization: cpu, status: status(cpu) }, ram: { utilization: ram, status: status(ram) }, network: { utilization: net, status: status(net) } }
  };
}
export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem('serveragent-history-v1') || '[]') as HistoryItem[]; }
  catch { return []; }
}
export function saveHistory(item: HistoryItem) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('serveragent-history-v1', JSON.stringify([item,...loadHistory()].slice(0,60)));
  window.dispatchEvent(new Event('serveragent-history-change'));
}
export async function apiPost<T>(path:string, body: unknown): Promise<T> {
  const response = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if (!response.ok) {
    const data = await response.json().catch(()=>null);
    throw new Error(data?.detail ? (typeof data.detail === 'string' ? data.detail : 'Check the entered parameters') : `API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}
