"""Property tests for the JUnit summary publisher (a handwritten XML parser).

The reporter derives per-test outcomes and durations from real JUnit XML and must
never leak captured output. These tests fuzz the XML shape and assert that the
summary counts always reconcile and no secret markers from failure messages leak
into the report.
"""

import importlib.util
from pathlib import Path

from hypothesis import given
from hypothesis import strategies as st

from tests.strategies import FAST

SCRIPT = Path(__file__).resolve().parents[2] / ".github" / "scripts" / "pytest_report.py"
SPEC = importlib.util.spec_from_file_location("pytest_report", SCRIPT)
assert SPEC and SPEC.loader
reporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reporter)

# XML-safe identifiers (no escaping surprises from raw text()).
IDENT = st.from_regex(r"[A-Za-z0-9_.]*", fullmatch=True)
TIME = st.one_of(
    st.floats(min_value=0.0, max_value=100.0, allow_nan=False).map(str),
    st.from_regex(r"[A-Za-z]+", fullmatch=True),
)

OUTCOMES = {
    "passed": "",
    "failed": '<failure message="boom">PRIVATE_SECRET_TOKEN</failure>',
    "skipped": '<skipped message="why"/>',
    "error": '<error message="setup">PRIVATE_SECRET_TOKEN</error>',
    "failed+error": '<failure message="f"/><error message="e"/>',
}


@st.composite
def junit_xml(draw):
    n = draw(st.integers(min_value=0, max_value=25))
    cases = []
    for _ in range(n):
        classname = draw(IDENT)
        name = draw(IDENT)
        time = draw(TIME)
        child = draw(st.sampled_from(list(OUTCOMES.values())))
        cases.append(
            f'<testcase classname="{classname}" name="{name}" time="{time}">{child}</testcase>'
        )
    suite_time = draw(TIME)
    xml = f'<testsuite name="pytest" time="{suite_time}">' + "".join(cases) + "</testsuite>"
    return xml, n


@given(spec_and_n=junit_xml())
@FAST
def test_report_summary_counts_and_sanitization(spec_and_n, tmp_path, monkeypatch):
    for var in ("GITHUB_RUN_ID", "GITHUB_SHA", "GITHUB_REF_NAME"):
        monkeypatch.delenv(var, raising=False)

    xml, n = spec_and_n
    path = tmp_path / "report.xml"
    path.write_text(xml, encoding="utf-8")

    report = reporter.build_report(path)
    summary = report["summary"]

    assert summary["total"] == n
    assert summary["passed"] + summary["failed"] + summary["skipped"] + summary["errors"] == n
    for case in report["tests"]:
        assert case["status"] in {"passed", "failed", "skipped", "error"}
        assert case["duration_seconds"] >= 0
    assert summary["duration_seconds"] >= 0
    assert "PRIVATE_SECRET_TOKEN" not in str(report["tests"])
