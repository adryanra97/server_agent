"""Publish a sanitized, per-test Pytest CI report from the actual JUnit XML.

The report contains names, outcomes and runtimes, not captured output or secrets.
"""

from __future__ import annotations

import json
import os
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def build_report(junit_path: Path) -> dict:
    """Read JUnit test cases as the only source of individual test outcomes."""
    root = ET.parse(junit_path).getroot()
    tests: list[dict] = []
    for case in root.iter("testcase"):
        classname = case.get("classname", "")
        case_name = case.get("name", "")
        segments = classname.split(".")
        module = next((segment for segment in segments if segment.startswith("test_")), "")
        filepath = f"backend/tests/{module}.py" if module else ""
        result = "passed"
        if case.find("error") is not None:
            result = "error"
        elif case.find("failure") is not None:
            result = "failed"
        elif case.find("skipped") is not None:
            result = "skipped"
        try:
            duration = max(0.0, float(case.get("time", "0")))
        except ValueError:
            duration = 0.0
        tests.append(
            {
                "id": f"{classname}::{case_name}",
                "name": case_name,
                "group": module or classname or "Other tests",
                "file": filepath,
                "status": result,
                "duration_seconds": round(duration, 4),
            }
        )
    outcomes = Counter(test["status"] for test in tests)
    try:
        seconds = max(0.0, float(root.get("time", "0")))
    except ValueError:
        seconds = 0.0
    if not seconds:
        seconds = sum(test["duration_seconds"] for test in tests)
    return {
        "schema_version": 1,
        "run_id": int(os.environ.get("GITHUB_RUN_ID", "0")),
        "commit_sha": os.environ.get("GITHUB_SHA", ""),
        "branch": os.environ.get("GITHUB_REF_NAME", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total": len(tests),
            "passed": outcomes["passed"],
            "failed": outcomes["failed"],
            "skipped": outcomes["skipped"],
            "errors": outcomes["error"],
            "duration_seconds": round(seconds, 3),
        },
        "tests": sorted(tests, key=lambda case: (case["group"], case["name"])),
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: pytest_report.py <junit.xml> <output.json>")
    report = build_report(Path(sys.argv[1]))
    destination = Path(sys.argv[2])
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    counts = report["summary"]
    print(
        "Pytest results: "
        f"{counts['total']} total, {counts['passed']} passed, "
        f"{counts['failed']} failed, {counts['skipped']} skipped, "
        f"{counts['errors']} errors"
    )
