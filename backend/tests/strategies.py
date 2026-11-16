"""Shared Hypothesis strategies and settings for the property tests.

Strategies build Pydantic-valid ``ServerSpec`` / ``Load`` inputs (as JSON-ready
dicts) plus ``EvaluationInput`` models for the engine-level tests. Ranges are
kept small so the SimPy discrete-event simulation stays fast per example.
"""

from __future__ import annotations

import math

from hypothesis import HealthCheck, settings
from hypothesis import strategies as st

from app.schemas import EvaluationInput, Load, ServerSpec

# --------------------------------------------------------------------------- #
# Reusable settings profiles
# --------------------------------------------------------------------------- #

# Pure in-memory functions (rules engine, timeline recorder, schema validation,
# GitHub parsing) can run hundreds of examples in milliseconds. The
# ``function_scoped_fixture`` health check is suppressed because tests in this
# suite reuse fixtures (``monkeypatch`` / ``tmp_path``) harmlessly across the
# examples Hypothesis generates for a single test function.
FAST = settings(
    max_examples=200,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)

# The SimPy engine runs a full 30-second discrete-event simulation per example,
# so the slower profile trades breadth for speed and disables the too-slow check.
SIMPY = settings(
    max_examples=25,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
)

# --------------------------------------------------------------------------- #
# Server spec (capacity) — every field strictly positive
# --------------------------------------------------------------------------- #

spec_dicts = st.fixed_dictionaries(
    {
        "cpu": st.fixed_dictionaries(
            {
                "cores": st.floats(min_value=0.5, max_value=64.0, allow_nan=False),
                "clock_ghz": st.floats(min_value=0.1, max_value=5.0, allow_nan=False),
            }
        ),
        "ram": st.fixed_dictionaries(
            {"total_mb": st.floats(min_value=128.0, max_value=65536.0, allow_nan=False)}
        ),
        "network": st.fixed_dictionaries(
            {
                "bandwidth_mbps": st.floats(min_value=10.0, max_value=10000.0, allow_nan=False),
                "max_connections": st.integers(min_value=1, max_value=100000),
            }
        ),
    }
)

# --------------------------------------------------------------------------- #
# Load (demand) — every field non-negative
# --------------------------------------------------------------------------- #

load_dicts = st.fixed_dictionaries(
    {
        "rps": st.floats(min_value=0.0, max_value=2000.0, allow_nan=False),
        "avg_cpu_ms_per_req": st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
        "avg_mem_mb_per_req": st.floats(min_value=0.0, max_value=2048.0, allow_nan=False),
        "concurrent_connections": st.integers(min_value=0, max_value=100000),
        "payload_kb": st.floats(min_value=0.0, max_value=1024.0, allow_nan=False),
    }
)


def _load_model(total_mb: float) -> st.SearchStrategy[dict]:
    """A load whose per-request memory never exceeds the server's total RAM,
    so the SimPy engine's ``ValueError`` guard is never tripped."""
    return st.fixed_dictionaries(
        {
            "rps": st.floats(min_value=0.0, max_value=200.0, allow_nan=False),
            "avg_cpu_ms_per_req": st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
            "avg_mem_mb_per_req": st.floats(min_value=0.0, max_value=total_mb, allow_nan=False),
            "concurrent_connections": st.integers(min_value=0, max_value=100000),
            "payload_kb": st.floats(min_value=0.0, max_value=1024.0, allow_nan=False),
        }
    )


@st.composite
def evaluation_inputs(draw) -> EvaluationInput:
    """A valid ``EvaluationInput`` guaranteed not to trip the RAM guard."""
    spec = draw(spec_dicts)
    load = draw(_load_model(spec["ram"]["total_mb"]))
    return EvaluationInput(
        spec=ServerSpec.model_validate(spec),
        load=Load.model_validate(load),
    )


@st.composite
def oversized_memory_inputs(draw) -> EvaluationInput:
    """A schema-valid input that the SimPy engine must reject (RAM per request
    exceeds total RAM while there is load)."""
    spec = draw(spec_dicts)
    total_mb = spec["ram"]["total_mb"]
    load = {
        "rps": draw(st.floats(min_value=0.01, max_value=200.0, allow_nan=False)),
        "avg_cpu_ms_per_req": 0.0,
        "avg_mem_mb_per_req": draw(
            st.floats(min_value=total_mb + 0.01, max_value=total_mb * 10.0 + 1.0, allow_nan=False)
        ),
        "concurrent_connections": 0,
        "payload_kb": 0.0,
    }
    return EvaluationInput(
        spec=ServerSpec.model_validate(spec),
        load=Load.model_validate(load),
    )


@st.composite
def clearly_separated_inputs(draw) -> EvaluationInput:
    """Spec + load whose *peak* offered utilization is clearly outside [0.8, 1.0].

    One resource is driven to a clearly "light" (<=0.3) or "heavy" (>=1.4)
    offered utilization while the others stay at zero, so the peak is
    unambiguous and the two engines must agree on the verdict.
    """
    spec = draw(spec_dicts)
    cores = spec["cpu"]["cores"]
    total_mb = spec["ram"]["total_mb"]
    bandwidth = spec["network"]["bandwidth_mbps"]
    max_conn = spec["network"]["max_connections"]

    heavy = draw(st.booleans())
    rps = draw(st.floats(min_value=10.0, max_value=200.0, allow_nan=False))

    cpu_ms = 0.0
    mem = 0.0
    connections = 0
    payload = 0.0

    if heavy:
        target = draw(st.floats(min_value=1.4, max_value=4.0, allow_nan=False))
        driver = draw(st.sampled_from(["cpu", "ram", "bw", "conn"]))
        if driver == "cpu":
            cpu_ms = target * cores * 1000.0 / rps
        elif driver == "ram":
            # connections >= target guarantees mem <= total_mb (guard-safe).
            connections = max(2, math.ceil(target))
            mem = target * total_mb / connections
        elif driver == "bw":
            payload = target * bandwidth * 1000.0 / (rps * 8.0)
        else:  # conn
            connections = max(1, math.ceil(target * max_conn))
    else:
        # Check the no-contention case here. A single connection slot can be
        # busy even with low declared concurrency; that difference is tested
        # separately instead of requiring the two engines to agree.
        spec["network"]["max_connections"] = 100_000
        cpu_ms = (
            draw(st.floats(min_value=0.0, max_value=0.3, allow_nan=False)) * cores * 1000.0 / rps
        )
        payload = (
            draw(st.floats(min_value=0.0, max_value=0.3, allow_nan=False))
            * bandwidth
            * 1000.0
            / (rps * 8.0)
        )

    load = {
        "rps": rps,
        "avg_cpu_ms_per_req": cpu_ms,
        "avg_mem_mb_per_req": mem,
        "concurrent_connections": connections,
        "payload_kb": payload,
    }
    return EvaluationInput(
        spec=ServerSpec.model_validate(spec),
        load=Load.model_validate(load),
    )


@st.composite
def spec_and_monotone_load_pair(draw):
    """A spec plus two loads with ``load2 >= load1`` componentwise."""
    spec = draw(spec_dicts)
    load1 = draw(load_dicts)
    delta = draw(
        st.fixed_dictionaries(
            {
                "rps": st.floats(min_value=0.0, max_value=1000.0, allow_nan=False),
                "avg_cpu_ms_per_req": st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
                "avg_mem_mb_per_req": st.floats(min_value=0.0, max_value=2048.0, allow_nan=False),
                "concurrent_connections": st.integers(min_value=0, max_value=50000),
                "payload_kb": st.floats(min_value=0.0, max_value=1024.0, allow_nan=False),
            }
        )
    )
    load2 = {key: load1[key] + delta[key] for key in load1}
    return spec, Load.model_validate(load1), Load.model_validate(load2)


def offered_peaks(input: EvaluationInput) -> tuple[float, float, float, float]:
    """The four closed-form offered utilizations (matches ``rules.py`` / ``simpy.py``)."""
    s = input.spec
    l = input.load
    cpu = (l.rps * l.avg_cpu_ms_per_req / 1000.0) / s.cpu.cores
    ram = (l.concurrent_connections * l.avg_mem_mb_per_req) / s.ram.total_mb
    bw = (l.rps * l.payload_kb * 8.0 / 1000.0) / s.network.bandwidth_mbps
    conn = l.concurrent_connections / s.network.max_connections
    return cpu, ram, bw, conn
