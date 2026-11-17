"""Property tests for the SimPy engine (slower profile).

The simulation is seeded and runs to natural completion, so outputs are
deterministic. We assert simulation accounting invariants and agreement with the
analytic rules engine on loads whose peak offered utilization is clearly
separated from the decision thresholds.
"""

import math

import pytest
from hypothesis import given

from app.engines.rules import RulesEngine
from app.engines.simpy import SimPyEngine
from tests.strategies import (
    SIMPY,
    clearly_separated_inputs,
    evaluation_inputs,
    offered_peaks,
    oversized_memory_inputs,
)

# Simulation-heavy property tests; excluded from CI to keep feedback quick.
pytestmark = pytest.mark.slow


def _statuses(result) -> list[str]:
    return [
        result.resources.cpu.status,
        result.resources.ram.status,
        result.resources.network.status,
    ]


def _utilizations(result) -> dict[str, float]:
    return {
        "cpu": result.resources.cpu.utilization,
        "ram": result.resources.ram.utilization,
        "network": result.resources.network.utilization,
    }


@given(evaluation_inputs())
@SIMPY
def test_simulation_accounts_for_all_arrivals(input):
    result, details = SimPyEngine().inspect(input)
    assert details["arrived"] == details["planned_arrivals"]
    assert details["completed"] == details["arrived"]
    assert 0.5 <= result.confidence <= 1.0


@given(evaluation_inputs())
@SIMPY
def test_evaluate_matches_inspect_for_every_generated_input(input):
    evaluated = SimPyEngine().evaluate(input)
    inspected, _ = SimPyEngine().inspect(input)
    assert evaluated == inspected


@given(evaluation_inputs())
@SIMPY
def test_simulation_details_are_finite_and_non_negative(input):
    result, details = SimPyEngine().inspect(input)

    assert details["planned_arrivals"] >= 0
    assert details["arrived"] >= 0
    assert details["completed"] >= 0
    assert details["completed"] == details["arrived"]
    assert details["simulated_elapsed_seconds"] >= 0

    for utilization in result.resources.model_dump().values():
        assert utilization["utilization"] >= 0
        assert math.isfinite(utilization["utilization"])

    for group in ("measured_utilization", "offered_utilization"):
        for utilization in details[group].values():
            assert utilization >= 0
            assert math.isfinite(utilization)


@given(evaluation_inputs())
@SIMPY
def test_threshold_and_bottleneck_consistency(input):
    result, _ = SimPyEngine().inspect(input)

    statuses = _statuses(result)
    has_critical = "critical" in statuses
    has_warning = "warning" in statuses
    if result.verdict == "will_crash":
        assert has_critical
    elif result.verdict == "at_risk":
        assert has_warning and not has_critical
    else:
        assert not has_critical and not has_warning

    utils = _utilizations(result)
    if result.bottleneck is None:
        assert all(utilization == 0 for utilization in utils.values())
    else:
        assert result.bottleneck in utils
        assert utils[result.bottleneck] == max(utils.values())


@given(evaluation_inputs())
@SIMPY
def test_deterministic(input):
    first = SimPyEngine().inspect(input)
    second = SimPyEngine().inspect(input)
    assert first[0].model_dump() == second[0].model_dump()
    assert first[1] == second[1]


@given(clearly_separated_inputs())
@SIMPY
def test_agrees_with_rules_when_clearly_separated(input):
    peak = max(offered_peaks(input))
    # Sanity: the strategy really does produce a clearly separated peak.
    assert peak <= 0.3 or peak >= 1.4, (input, peak)

    rules = RulesEngine().evaluate(input).verdict
    simpy = SimPyEngine().evaluate(input).verdict
    assert rules == simpy, (input, rules, simpy)


@given(oversized_memory_inputs())
@SIMPY
def test_ram_guard_rejects_oversized_requests(input):
    with pytest.raises(ValueError, match="Memory per request"):
        SimPyEngine().inspect(input)
