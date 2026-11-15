"""Combine actual CI evidence from backend, frontend, browser, and dependency audits.

Only test identifiers, statuses, runtimes, measured coverage and vulnerability
counts are published. Never include failure logs or credentials.
"""
from __future__ import annotations

import json
import os
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

STATUSES = ("passed", "failed", "skipped", "error")


def summary(tests: list[dict]) -> dict:
    counts = Counter(item["status"] for item in tests)
    return {
        "total": len(tests), "passed": counts["passed"],
        "failed": counts["failed"], "skipped": counts["skipped"],
        "errors": counts["error"],
        "duration_seconds": round(sum(test["duration_seconds"] for test in tests), 3),
    }


def junit_cases(path: Path, suite: str) -> list[dict]:
    if not path.is_file():
        return []
    root = ET.parse(path).getroot()
    items = []
    for case in root.iter("testcase"):
        name = case.get("name", "")
        classname = case.get("classname", "") or case.get("file", "")
        file = case.get("file", "")
        if not file:
            file = classname if classname.endswith((".test.ts", ".test.tsx", ".spec.ts")) else ""
        file = file.replace("\\", "/").removeprefix("./")
        if file and not file.startswith("frontend/"):
            file = "frontend/" + file
        group = file.removeprefix("frontend/") if file else classname or suite
        status = "passed"
        if case.find("error") is not None:
            status = "error"
        elif case.find("failure") is not None:
            status = "failed"
        elif case.find("skipped") is not None:
            status = "skipped"
        try:
            duration = max(0.0, float(case.get("time", "0")))
        except (TypeError, ValueError):
            duration = 0.0
        items.append({
            "id": suite + ":" + classname + "::" + name,
            "suite": suite, "name": name, "group": group,
            "file": file, "status": status,
            "duration_seconds": round(duration, 4),
        })
    return sorted(items, key=lambda x: (x["group"], x["name"]))


def backend_cases(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [{**entry, "id": "backend:" + entry["id"], "suite": "backend"}
            for entry in raw.get("tests", [])]


def frontend_coverage(path: Path) -> dict:
    result = {"line": None, "branch": None, "functions": None, "status": "unavailable"}
    if not path.is_file():
        return result
    data = json.loads(path.read_text(encoding="utf-8")).get("total", {})
    try:
        result.update(
            line=round(float(data["lines"]["pct"]), 1),
            branch=round(float(data["branches"]["pct"]), 1),
            functions=round(float(data["functions"]["pct"]), 1),
            status="reported",
        )
    except (KeyError, ValueError, TypeError):
        pass
    return result


def npm_audit(path: Path) -> dict:
    counts = {name: None for name in ("critical", "high", "moderate", "low", "info")}
    counts.update(total=None, status="unavailable")
    if not path.is_file():
        return counts
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        values = data.get("metadata", {}).get("vulnerabilities", {})
        if not isinstance(values, dict) or data.get("error"):
            return counts
        for key in ("critical", "high", "moderate", "low", "info"):
            counts[key] = int(values.get(key, 0))
        counts["total"] = sum(counts[k] for k in ("critical", "high", "moderate", "low", "info"))
        counts["status"] = "reported"
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    return counts


def pip_audit(path: Path) -> dict:
    result = {"vulnerabilities": None, "packages_with_findings": None, "status": "unavailable"}
    if not path.is_file():
        return result
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        dependencies = data.get("dependencies", []) if isinstance(data, dict) else data
        if not isinstance(dependencies, list):
            return result
        packages = [package for package in dependencies if package.get("vulns", [])]
        result.update(
            vulnerabilities=sum(len(pkg.get("vulns", [])) for pkg in packages),
            packages_with_findings=len(packages), status="reported",
        )
    except (json.JSONDecodeError, ValueError, TypeError, AttributeError):
        pass
    return result


def build(root: Path) -> dict:
    backend = backend_cases(root / "backend" / "pytest-dashboard.json")
    unit = junit_cases(root / "frontend-unit" / "vitest-results.xml", "frontend")
    browser = junit_cases(root / "frontend-e2e" / "playwright-results.xml", "e2e")
    tests = backend + unit + browser
    return {
        "schema_version": 1,
        "run_id": int(os.environ.get("GITHUB_RUN_ID", "0")),
        "commit_sha": os.environ.get("GITHUB_SHA", ""),
        "branch": os.environ.get("GITHUB_REF_NAME", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary(tests), "tests": tests,
        "suites": {
            "backend": {**summary(backend), "status": "reported" if (root / "backend" / "pytest-dashboard.json").exists() else "unavailable"},
            "frontend": {**summary(unit), "status": "reported" if (root / "frontend-unit" / "vitest-results.xml").exists() else "unavailable"},
            "e2e": {**summary(browser), "status": "reported" if (root / "frontend-e2e" / "playwright-results.xml").exists() else "unavailable"},
        },
        "frontend_coverage": frontend_coverage(root / "frontend-unit" / "coverage" / "coverage-summary.json"),
        "security": {
            "npm": npm_audit(root / "npm-audit" / "npm-audit.json"),
            "pip": pip_audit(root / "python-audit" / "pip-audit.json"),
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: quality_report.py <artifact-root> <merged-report.json>")
    report = build(Path(sys.argv[1]))
    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("Consolidated measured evidence:", report["summary"], report["suites"],
          report["frontend_coverage"], report["security"])
