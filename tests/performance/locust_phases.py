"""Measure a short loopback scenario by phase and apply its stop threshold."""

import json
import math
import time
from collections import defaultdict, deque
from itertools import accumulate
from pathlib import Path

from locust import LoadTestShape, events


class MeasuredShape(LoadTestShape):
    abstract = True

    def __init__(self):
        super().__init__()
        self.ends = list(accumulate(phase["seconds"] for phase in self.phases))
        self.observations = [{"ticks": [], "requests": defaultdict(list)} for _ in self.phases]
        self.recent = deque()
        self.completed = False
        self.stop = None

    def reset_time(self):
        super().reset_time()
        self.started_at = time.time()

    def phase_at(self, elapsed):
        return next((index for index, end in enumerate(self.ends) if elapsed < end), None)

    def record(self, name, start_time, response_time, exception):
        elapsed = start_time - self.started_at
        index = self.phase_at(elapsed)
        if index is not None:
            failed = exception is not None
            self.observations[index]["requests"][name].append((response_time, failed))
            self.recent.append((self.get_run_time(), failed))

    def tick(self):
        elapsed = self.get_run_time()
        index = self.phase_at(elapsed)
        if index is None:
            self.completed = True
            return None
        phase = self.phases[index]
        users = self.get_current_user_count()
        self.observations[index]["ticks"].append({"elapsed_seconds": round(elapsed, 3), "users": users})
        while self.recent and self.recent[0][0] <= elapsed - self.guard["window_seconds"]:
            self.recent.popleft()
        count = len(self.recent)
        if count >= self.guard["min_requests"]:
            failures = sum(failed for _, failed in self.recent)
            if 100 * failures >= self.guard["failure_rate_pct"] * count:
                self.stop = {"phase": phase["name"], "elapsed_seconds": round(elapsed, 3),
                             "users": users, "requests": count, "failures": failures}
                return None
        return phase["users"], phase["spawn_rate"]

    def report(self):
        phases = []
        for phase, observed in zip(self.phases, self.observations, strict=True):
            requests = {}
            for name, samples in observed["requests"].items():
                times = sorted(latency for latency, _ in samples)
                requests[name] = {"count": len(samples), "failures": sum(failed for _, failed in samples),
                                  "p95_ms": round(times[math.ceil(0.95 * len(times)) - 1], 3)}
            phases.append(phase | {"ticks": observed["ticks"], "requests": requests})
        return {"completed": self.completed, "early_stop": self.stop, "phases": phases}


@events.init.add_listener
def track_phases(environment, **_kwargs):
    shape = environment.shape_class
    if not isinstance(shape, MeasuredShape):
        return

    @environment.events.request.add_listener
    def record(name, start_time, response_time, exception, **_kwargs):
        shape.record(name, start_time, response_time, exception)

    @environment.events.quitting.add_listener
    def write_phases(**_kwargs):
        prefix = environment.parsed_options.csv_prefix
        Path(f"{prefix}_phases.json").write_text(json.dumps(shape.report(), indent=2) + "\n", encoding="utf-8")
