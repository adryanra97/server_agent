"""Event-derived one-second aggregates for the original copdash SimPy model.

No new SimPy events are scheduled here: recording does not affect the engine's
event order, random seed, verdict, or end time. Intervals are integrated into
one-second buckets. A finite preview limit bounds JSON response size.
"""

from __future__ import annotations

import math
from collections import defaultdict

MAX_TIMELINE_SECONDS = 240


class TimelineRecorder:
    """Collect event counts and resource/queue occupancy from actual timestamps."""

    def __init__(self) -> None:
        self._data: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))

    def event(self, key: str, at: float, amount: float = 1.0) -> None:
        """Record an instantaneous arrival, completion, or completed payload."""
        bucket = math.floor(at)
        if 0 <= bucket < MAX_TIMELINE_SECONDS:
            self._data[key][bucket] += amount

    def interval(self, key: str, start: float, end: float, amount: float = 1.0) -> None:
        """Integrate the actual amount held during each overlapping second."""
        if end <= start or start >= MAX_TIMELINE_SECONDS or amount <= 0:
            return
        start = max(0.0, start)
        end = min(float(MAX_TIMELINE_SECONDS), end)
        for second in range(math.floor(start), math.ceil(end)):
            overlap = min(end, second + 1.0) - max(start, float(second))
            self._data[key][second] += amount * overlap

    def finish(
        self,
        elapsed: float,
        cpu_slots: int,
        total_ram_mb: float,
        max_connections: int,
        bandwidth_mbps: float,
    ) -> tuple[list[dict[str, float | int]], bool]:
        """Return exact one-second buckets (last bucket may be fractional)."""
        length = min(MAX_TIMELINE_SECONDS, max(1, math.ceil(elapsed)))
        points: list[dict[str, float | int]] = []
        cumulative_arrived = 0
        cumulative_completed = 0
        for second in range(length):
            sample_duration = min(1.0, max(0.0, elapsed - second)) or 1.0
            arrivals = int(self._data["arrivals"][second])
            completions = int(self._data["completed"][second])
            cumulative_arrived += arrivals
            cumulative_completed += completions
            network_mbps = self._data["payload_kb"][second] * 8 / 1000 / sample_duration
            points.append(
                {
                    "second": second,
                    "duration_seconds": round(sample_duration, 5),
                    "arrivals": arrivals,
                    "completed": completions,
                    "in_flight": max(0, cumulative_arrived - cumulative_completed),
                    "cpu_percent": round(
                        100 * self._data["cpu_busy"][second] / (cpu_slots * sample_duration),
                        2,
                    ),
                    "ram_percent": round(
                        100 * self._data["ram_busy"][second] / (total_ram_mb * sample_duration),
                        2,
                    ),
                    "connection_percent": round(
                        100
                        * self._data["connection_busy"][second]
                        / (max_connections * sample_duration),
                        2,
                    ),
                    "network_mbps": round(network_mbps, 4),
                    "network_percent": round(100 * network_mbps / bandwidth_mbps, 2),
                    "queue_avg": round(
                        (
                            self._data["cpu_wait"][second]
                            + self._data["ram_wait"][second]
                            + self._data["network_wait"][second]
                        )
                        / sample_duration,
                        2,
                    ),
                    "cpu_queue_avg": round(self._data["cpu_wait"][second] / sample_duration, 2),
                }
            )
        return points, elapsed > MAX_TIMELINE_SECONDS
