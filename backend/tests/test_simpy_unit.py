"""Focused unit tests for the SimPy engine contract and decision helpers."""

import pytest

from app.engines.simpy import SimPyEngine, _confidence, _status, _util
from app.schemas import EvaluationInput, Load, ServerSpec

SPEC = ServerSpec.model_validate(
    {
        "cpu": {"cores": 4, "clock_ghz": 2.5},
        "ram": {"total_mb": 8192},
        "network": {"bandwidth_mbps": 1000, "max_connections": 10000},
    }
)
LOAD = Load.model_validate(
    {
        "rps": 100,
        "avg_cpu_ms_per_req": 10,
        "avg_mem_mb_per_req": 5,
        "concurrent_connections": 100,
        "payload_kb": 10,
    }
)


def test_evaluate_returns_the_same_result_as_inspect():
    input = EvaluationInput(spec=SPEC, load=LOAD)

    evaluated = SimPyEngine().evaluate(input)
    inspected, _ = SimPyEngine().inspect(input)

    assert evaluated == inspected


def test_tiny_fractional_memory_requests_complete():
    input = EvaluationInput(
        spec=SPEC,
        load=Load.model_validate(
            {
                **LOAD.model_dump(),
                "rps": 1,
                "avg_cpu_ms_per_req": 0,
                "avg_mem_mb_per_req": 1.5992273772985754,
                "concurrent_connections": 0,
                "payload_kb": 0,
            }
        ),
    )

    _, details = SimPyEngine().inspect(input)

    assert details["arrived"] == details["completed"] == 30


@pytest.mark.parametrize(
    ("measured", "offered", "expected"),
    [
        (0.25, 0.9, 0.25),
        (0.99, 1.0, 0.99),
        (0.99, 1.01, 1.01),
        (1.0, 2.0, 2.0),
    ],
)
def test_utilization_uses_measured_value_until_offered_load_is_oversubscribed(
    measured, offered, expected
):
    assert _util(measured, offered) == expected


@pytest.mark.parametrize(
    ("utilization", "expected"),
    [
        (0.0, "ok"),
        (0.7999, "ok"),
        (0.8, "warning"),
        (1.0, "warning"),
        (1.0001, "critical"),
    ],
)
def test_status_boundaries(utilization, expected):
    assert _status(utilization) == expected


@pytest.mark.parametrize(
    ("peak", "verdict"),
    [
        (0.0, "will_survive"),
        (0.8, "will_survive"),
        (0.9, "at_risk"),
        (1.0, "will_crash"),
        (2.0, "will_crash"),
    ],
)
def test_confidence_is_bounded_at_decision_boundaries(peak, verdict):
    confidence = _confidence(peak, verdict)
    assert 0.0 <= confidence <= 1.0
