"""Property tests for the deterministic rules engine.

These assert relationships the formulas must satisfy — monotonicity, threshold
consistency, bottleneck correctness, confidence bounds — rather than re-deriving
specific numbers, so they survive legitimate tuning of the exact formulas.
"""

from hypothesis import given

from app.engines.rules import RulesEngine
from app.schemas import EvaluationInput, Load, ServerSpec, VerdictResult
from tests.strategies import FAST, load_dicts, spec_and_monotone_load_pair, spec_dicts

SEVERITY = {"will_survive": 0, "at_risk": 1, "will_crash": 2}


def _evaluate(spec: dict, load: Load) -> VerdictResult:
    return RulesEngine().evaluate(EvaluationInput(spec=ServerSpec.model_validate(spec), load=load))


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


@given(spec_and_monotone_load_pair())
@FAST
def test_utilization_and_severity_monotone_in_load(pair):
    spec, load1, load2 = pair
    result1 = _evaluate(spec, load1)
    result2 = _evaluate(spec, load2)

    utils1 = _utilizations(result1)
    utils2 = _utilizations(result2)
    for resource in utils1:
        assert utils2[resource] >= utils1[resource], (resource, load1, load2)
    assert SEVERITY[result2.verdict] >= SEVERITY[result1.verdict], (load1, load2)


@given(spec_dicts, load_dicts)
@FAST
def test_threshold_consistency(spec, load):
    result = _evaluate(spec, Load.model_validate(load))
    statuses = _statuses(result)
    has_critical = "critical" in statuses
    has_warning = "warning" in statuses

    if result.verdict == "will_crash":
        assert has_critical
    elif result.verdict == "at_risk":
        assert has_warning and not has_critical
    else:
        assert not has_critical and not has_warning


@given(spec_dicts, load_dicts)
@FAST
def test_bottleneck_is_max_utilization(spec, load):
    result = _evaluate(spec, Load.model_validate(load))
    utils = _utilizations(result)

    if result.bottleneck is None:
        assert all(utilization == 0 for utilization in utils.values())
    else:
        assert result.bottleneck in utils
        assert utils[result.bottleneck] == max(utils.values())


@given(spec_dicts, load_dicts)
@FAST
def test_confidence_bounded(spec, load):
    result = _evaluate(spec, Load.model_validate(load))
    assert 0.5 <= result.confidence <= 1.0
