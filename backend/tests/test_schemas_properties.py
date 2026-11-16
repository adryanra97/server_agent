"""Property tests for the Pydantic request/response schemas.

The schemas are the single source of truth for validation. These tests confirm
that every strictly-positive / non-negative constraint is enforced exactly:
valid inputs validate, and any field outside its bounds raises ``ValidationError``.
"""

import pytest
from hypothesis import given
from hypothesis import strategies as st
from pydantic import ValidationError

from app.schemas import Load, ServerSpec
from tests.strategies import FAST, load_dicts, spec_dicts


@given(spec_dicts, load_dicts)
@FAST
def test_valid_inputs_validate(spec, load):
    ServerSpec.model_validate(spec)
    Load.model_validate(load)


@st.composite
def broken_spec(draw):
    """A spec with exactly one capacity field forced to a non-positive value."""
    spec = draw(spec_dicts)
    section = draw(st.sampled_from(["cpu", "ram", "network"]))
    if section == "cpu":
        key = draw(st.sampled_from(["cores", "clock_ghz"]))
        spec["cpu"][key] = draw(st.floats(max_value=0.0, allow_nan=False))
    elif section == "ram":
        spec["ram"]["total_mb"] = draw(st.floats(max_value=0.0, allow_nan=False))
    else:
        key = draw(st.sampled_from(["bandwidth_mbps", "max_connections"]))
        if key == "max_connections":
            spec["network"][key] = draw(st.integers(max_value=0))
        else:
            spec["network"][key] = draw(st.floats(max_value=0.0, allow_nan=False))
    return spec


@st.composite
def broken_load(draw):
    """A load with exactly one demand field forced negative."""
    load = draw(load_dicts)
    key = draw(
        st.sampled_from(
            [
                "rps",
                "avg_cpu_ms_per_req",
                "avg_mem_mb_per_req",
                "concurrent_connections",
                "payload_kb",
            ]
        )
    )
    if key == "concurrent_connections":
        load[key] = draw(st.integers(max_value=-1))
    else:
        load[key] = draw(st.floats(max_value=-0.0001, allow_nan=False))
    return load


@given(broken_spec())
@FAST
def test_nonpositive_spec_field_rejected(spec):
    with pytest.raises(ValidationError):
        ServerSpec.model_validate(spec)


@given(broken_load())
@FAST
def test_negative_load_field_rejected(load):
    with pytest.raises(ValidationError):
        Load.model_validate(load)
