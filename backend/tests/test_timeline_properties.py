"""Property tests for the one-second timeline recorder.

The recorder integrates arbitrary event/interval timestamps into one-second
buckets. These tests assert structural invariants (bucket count, non-negative
metrics, truncation flag) and that interval integration is lossless and is
equivalent to first clamping endpoints to the [0, MAX] window.
"""

import math

from hypothesis import assume, given
from hypothesis import strategies as st

from app.engines.timeline import MAX_TIMELINE_SECONDS, TimelineRecorder
from tests.strategies import FAST

# Intervals and events may land slightly outside the recording window to
# exercise the clipping/truncation logic.
T = st.floats(min_value=-50.0, max_value=300.0, allow_nan=False)


@given(start=T, end=T, amount=st.floats(min_value=0.01, max_value=100.0, allow_nan=False))
@FAST
def test_interval_clipping_matches_explicit_clamp(start, end, amount):
    """Recording (start, end) equals recording the endpoints pre-clamped to [0, MAX]."""
    raw = TimelineRecorder()
    clamped = TimelineRecorder()
    raw.interval("cpu_busy", start, end, amount)
    clamped.interval("cpu_busy", max(0.0, start), min(float(MAX_TIMELINE_SECONDS), end), amount)
    assert raw._data == clamped._data


@given(
    start=st.floats(min_value=0.0, max_value=float(MAX_TIMELINE_SECONDS), allow_nan=False),
    duration=st.floats(min_value=0.001, max_value=float(MAX_TIMELINE_SECONDS), allow_nan=False),
    amount=st.floats(min_value=0.01, max_value=100.0, allow_nan=False),
)
@FAST
def test_interval_fully_in_range_is_lossless(start, duration, amount):
    assume(start + duration <= MAX_TIMELINE_SECONDS)
    rec = TimelineRecorder()
    rec.interval("cpu_busy", start, start + duration, amount)
    total = sum(rec._data["cpu_busy"].values())
    assert math.isclose(total, amount * duration, rel_tol=1e-9, abs_tol=1e-9)


@st.composite
def recorder_scenario(draw):
    """A recorder fed random events/intervals plus the totals we expect it to keep."""
    elapsed = draw(st.floats(min_value=0.0, max_value=300.0, allow_nan=False))
    rec = TimelineRecorder()

    arrivals = draw(st.lists(T, min_size=0, max_size=40))
    completions = draw(st.lists(T, min_size=0, max_size=40))
    for t in arrivals:
        rec.event("arrivals", t)
    for t in completions:
        rec.event("completed", t)

    for _ in range(draw(st.integers(min_value=0, max_value=40))):
        rec.event(
            "payload_kb",
            draw(T),
            draw(st.floats(min_value=0.0, max_value=1024.0, allow_nan=False)),
        )

    for _ in range(draw(st.integers(min_value=0, max_value=40))):
        amount = draw(st.floats(min_value=0.01, max_value=100.0, allow_nan=False))
        rec.interval("cpu_busy", draw(T), draw(T), amount)
        rec.interval("ram_busy", draw(T), draw(T), amount)
        rec.interval("connection_busy", draw(T), draw(T), amount)
        rec.interval("cpu_wait", draw(T), draw(T))
        rec.interval("ram_wait", draw(T), draw(T))
        rec.interval("network_wait", draw(T), draw(T))

    length = min(MAX_TIMELINE_SECONDS, max(1, math.ceil(elapsed)))
    expected_arrivals = sum(1 for t in arrivals if 0 <= math.floor(t) < length)
    expected_completions = sum(1 for t in completions if 0 <= math.floor(t) < length)
    return rec, elapsed, length, expected_arrivals, expected_completions


@given(recorder_scenario())
@FAST
def test_finish_structural_invariants(scenario):
    rec, elapsed, length, expected_arrivals, expected_completions = scenario
    points, truncated = rec.finish(
        elapsed,
        cpu_slots=8,
        total_ram_mb=8192.0,
        max_connections=1000,
        bandwidth_mbps=1000.0,
    )

    assert truncated == (elapsed > MAX_TIMELINE_SECONDS)
    assert 1 <= len(points) <= MAX_TIMELINE_SECONDS
    assert len(points) == length
    assert [point["second"] for point in points] == list(range(length))
    assert sum(point["arrivals"] for point in points) == expected_arrivals
    assert sum(point["completed"] for point in points) == expected_completions

    for point in points:
        # A bucket is at most one second; tiny elapsed values can round to 0.0.
        assert 0 <= point["duration_seconds"] <= 1
        for key in (
            "cpu_percent",
            "ram_percent",
            "connection_percent",
            "network_mbps",
            "network_percent",
            "queue_avg",
            "cpu_queue_avg",
            "in_flight",
        ):
            assert point[key] >= 0, (key, point)
