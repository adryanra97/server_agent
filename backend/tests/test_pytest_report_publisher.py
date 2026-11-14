"""JUnit summary publisher tests: real XML cases determine shown outcomes."""

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / ".github" / "scripts" / "pytest_report.py"
SPEC = importlib.util.spec_from_file_location("pytest_report", SCRIPT)
assert SPEC and SPEC.loader
reporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reporter)


def test_report_distinguishes_outcomes_and_source(tmp_path, monkeypatch):
    junit = tmp_path / "pytest-results.xml"
    junit.write_text(
        '<testsuites><testsuite name="pytest" time="1.75">'
        '<testcase classname="tests.test_platform" name="test_health" time="0.25"/>'
        '<testcase classname="tests.test_platform" name="test_unhealthy" time="0.1">'
        '<failure message="assertion error">private captured data must not be included</failure>'
        "</testcase>"
        '<testcase classname="tests.test_simpy" name="test_overload" time="0.35">'
        '<skipped message="optional"/></testcase>'
        '<testcase classname="tests.test_verdict" name="test_api" time="0.2">'
        '<error message="setup issue">sensitive diagnostic output</error></testcase>'
        "</testsuite></testsuites>",
        encoding="utf-8",
    )
    monkeypatch.setenv("GITHUB_RUN_ID", "456")
    monkeypatch.setenv("GITHUB_SHA", "ab1234")
    monkeypatch.setenv("GITHUB_REF_NAME", "feat/serveragent-platform")
    report = reporter.build_report(junit)
    assert report["schema_version"] == 1
    assert report["run_id"] == 456
    assert report["commit_sha"] == "ab1234"
    assert report["branch"] == "feat/serveragent-platform"
    assert report["summary"] == {
        "total": 4,
        "passed": 1,
        "failed": 1,
        "skipped": 1,
        "errors": 1,
        "duration_seconds": 0.9,
    }
    by_name = {item["name"]: item for item in report["tests"]}
    assert by_name["test_health"]["status"] == "passed"
    assert by_name["test_unhealthy"]["status"] == "failed"
    assert by_name["test_overload"]["status"] == "skipped"
    assert by_name["test_api"]["status"] == "error"
    assert by_name["test_health"]["file"] == "backend/tests/test_platform.py"
    assert all(
        "private" not in str(item) and "sensitive" not in str(item) for item in report["tests"]
    )


def test_report_handles_invalid_duration_and_blank_module(tmp_path, monkeypatch):
    junit = tmp_path / "report.xml"
    junit.write_text(
        '<testsuite time="not-a-number"><testcase classname="integration.CustomGroup" '
        'name="test_it" time="invalid"/></testsuite>',
        encoding="utf-8",
    )
    monkeypatch.delenv("GITHUB_RUN_ID", raising=False)
    monkeypatch.delenv("GITHUB_SHA", raising=False)
    monkeypatch.delenv("GITHUB_REF_NAME", raising=False)
    data = reporter.build_report(junit)
    assert data["summary"]["total"] == 1
    assert data["summary"]["passed"] == 1
    assert data["summary"]["duration_seconds"] == 0.0
    assert data["tests"][0]["group"] == "integration.CustomGroup"
    assert data["tests"][0]["file"] == ""
