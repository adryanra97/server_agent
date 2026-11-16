import Link from 'next/link';
import { ArrowUpRight, Braces, Cpu, Waves } from 'lucide-react';
import { SectionHead } from './ui';

type FactColor = 'success' | 'amber' | 'danger';

interface Fact {
  color: FactColor;
  title: string;
  text: string;
}

interface ModelLimit {
  title: string;
  text: string;
}

type SpectrumPointData = {
  kind: 'spectrum';
  label: string;
  lowTag: string;
  low: string;
  highTag: string;
  high: string;
};

type EnumPointData = {
  kind: 'enum';
  label: string;
  chosen: string;
  alternatives: string[];
};

type SimPyPoint = SpectrumPointData | EnumPointData;

const FACT_COLOR_VAR: Record<FactColor, string> = {
  success: 'var(--success)',
  amber: 'var(--amber)',
  danger: 'var(--danger)',
};

const FACTS: Fact[] = [
  { color: 'success', title: 'Will survive', text: 'Peak modeled utilization is below 80%.' },
  { color: 'amber', title: 'At risk', text: 'Peak modeled utilization is between 80% and 100%, inclusive.' },
  { color: 'danger', title: 'Will crash', text: 'Peak modeled utilization is above 100%.' },
];

const MODEL_LIMITS: ModelLimit[] = [
  {
    title: 'Clock speed is not used in the calculation.',
    text: 'CPU capacity is calculated using core count and processing time per request.',
  },
  {
    title: 'Confidence is a heuristic, not a measured probability.',
    text: 'It is higher when modeled utilization is farther from the verdict thresholds.',
  },
  {
    title: 'SimPy is reproducible for the same input.',
    text: 'The engine fixes its random seed and simulation settings. Use the same inputs to reproduce the scenario.',
  },
  {
    title: 'Both engines are single-server capacity models.',
    text: 'They do not currently model load balancers, multiple server nodes, real-world timeouts, database latency or observed service failures.',
  },
  {
    title: 'Connection limits can produce different verdicts.',
    text: 'Rules divides the declared concurrent-connection count by the limit; SimPy measures how long requests actually hold connection slots. With a single slot, queued requests can keep it busy even when declared concurrency is low — so the engines can reach different verdicts. Inspect measured and offered utilization to understand the difference.',
  },
  {
    title: 'Very small RPS values may produce no arrivals.',
    text: 'SimPy uses the expected request count in its nominal 30-second arrival window. It does not invent a request when that count is below one; inspect the arrival count before interpreting a quiet simulation.',
  },
];

const RULES_FORMULAS = [
  'CPU = RPS × CPU ms / 1000 ÷ cores',
  'RAM = concurrent × MB/req ÷ RAM MB',
  'Network = max(bandwidth %, connections %)',
];

const SIMPY_POINTS: SimPyPoint[] = [
  {
    kind: 'enum',
    label: 'Poisson request arrival process',
    chosen: 'Poisson — exponential, memoryless',
    alternatives: ['Bursty / thundering herd', 'Periodic / batch'],
  },
  {
    kind: 'spectrum',
    label: 'Fixed random seed for reproducibility',
    lowTag: 'SINGLE SEED',
    low: 'Reproducible in CI — but hides run-to-run variance',
    highTag: 'MANY SEEDS',
    high: 'Surfaces variance — but loses determinism',
  },
  {
    kind: 'spectrum',
    label: '30-second nominal arrival window',
    lowTag: 'SHORTER',
    low: 'Noisier estimate; may record zero arrivals for small RPS',
    highTag: 'LONGER',
    high: 'Steadier average, but the run takes longer',
  },
  {
    kind: 'spectrum',
    label: 'Maximum 20,000 simulated arrivals',
    lowTag: 'LOWER CAP',
    low: 'Fast — but truncates high-RPS runs and skews utilization',
    highTag: 'HIGHER CAP',
    high: 'Complete picture — but slower and heavier',
  },
];

function SpectrumPoint({ point }: { point: SpectrumPointData }) {
  return (
    <div className="simpy-point">
      <strong className="simpy-point-label">{point.label}</strong>
      <div className="tradeoff-axis">
        <span className="tradeoff-side tradeoff-low">
          <small className="tradeoff-tag">{point.lowTag}</small>
          <span>{point.low}</span>
        </span>
        <span className="tradeoff-marker" aria-hidden="true" />
        <span className="tradeoff-side tradeoff-high">
          <small className="tradeoff-tag">{point.highTag}</small>
          <span>{point.high}</span>
        </span>
      </div>
    </div>
  );
}

function EnumPoint({ point }: { point: EnumPointData }) {
  return (
    <div className="simpy-point">
      <strong className="simpy-point-label">{point.label}</strong>
      <div className="enum-pills">
        <span className="enum-pill enum-chosen">{point.chosen}</span>
        {point.alternatives.map((alt) => (
          <span className="enum-pill enum-alt" key={alt}>{alt}</span>
        ))}
      </div>
      <span className="enum-note">Only the highlighted process is modeled.</span>
    </div>
  );
}

export default function Methodology() {
  return (
    <div className="page-stack">
      <div className="method-card-grid">
        <section className="panel model-method-card">
          <span className="kicker">ENGINE 01 / DETERMINISTIC</span>
          <div className="method-card-icon">
            <Cpu size={26} />
          </div>
          <h2>Rules Engine</h2>
          <p>
            Computes demand divided by available capacity for CPU, RAM, and network. Takes the
            highest utilization as the bottleneck and determines the verdict using fixed thresholds.
          </p>
          <div className="formula-block">
            {RULES_FORMULAS.map((formula) => (
              <code key={formula}>{formula}</code>
            ))}
          </div>
        </section>

        <section className="panel model-method-card">
          <span className="kicker">ENGINE 02 / DISCRETE EVENTS</span>
          <div className="method-card-icon">
            <Waves size={26} />
          </div>
          <h2>SimPy Engine</h2>
          <p>
            Uses a SimPy environment with resources for CPU and connections and a container for RAM.
            Requests arrive with exponential interarrival times; processing continues until queued
            requests complete.
          </p>
          <div className="method-list">
            {SIMPY_POINTS.map((point) =>
              point.kind === 'spectrum' ? (
                <SpectrumPoint key={point.label} point={point} />
              ) : (
                <EnumPoint key={point.label} point={point} />
              ),
            )}
          </div>
        </section>
      </div>

      <section className="panel model-facts">
        <SectionHead eyebrow="HOW THE SYSTEM DECIDES" title="Thresholds and interpretation" />
        <div className="fact-grid">
          {FACTS.map((fact) => (
            <div key={fact.title}>
              <span className="fact-color" style={{ background: FACT_COLOR_VAR[fact.color] }} />
              <strong>{fact.title}</strong>
              <p>{fact.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel model-facts">
        <SectionHead eyebrow="MODEL SCOPE" title="Understand the modeling assumptions" />
        <div className="model-limits">
          {MODEL_LIMITS.map((limit, index) => (
            <div key={limit.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{limit.title}</strong>
                <p>{limit.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="insight-bar">
        <span className="insight-symbol">
          <Braces size={18} />
        </span>
        <div>
          <strong>Explore the exact JSON contract.</strong>
          <span>Explore supported request fields, response data, and API examples.</span>
          <Link href="/developer" className="inline-link">
            Open API Explorer <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
