"""Live editor adapter for the shared verification sandbox."""
from __future__ import annotations

import os
from typing import Any

import httpx

from pipeline.verify import verify_source

CONCEPTUAL = {"os", "operating systems", "dbms", "database", "networks", "computer networks", "ml", "machine learning"}


def _hide_private_cases(result: dict[str, Any], mode: str) -> dict[str, Any]:
    if mode != "submit":
        return result
    safe = dict(result)
    safe["results"] = [
        {key: value for key, value in item.items() if key not in {"input", "expected", "expectedOutput"}}
        for item in result.get("results", [])
    ]
    return safe


def _remote_verify(language: str, source_code: str, cases: list[dict[str, Any]]) -> dict[str, Any]:
    url = os.getenv("JOBWAY_EXECUTOR_URL", "").rstrip("/")
    token = os.getenv("JOBWAY_EXECUTOR_TOKEN", "")
    if not url or len(token) < 32:
        raise RuntimeError("The secure code executor is not configured")
    payload = {
        "language": language.lower().replace("python3", "python"),
        "code": source_code,
        "testCases": [
            {"input": item.get("input", ""), "expectedOutput": item.get("expected", item.get("expectedOutput", ""))}
            for item in cases
        ],
    }
    response = httpx.post(f"{url}/validate", json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=30.0)
    response.raise_for_status()
    raw = response.json()
    results = [{
        "test_case": item.get("testCase"), "status": "Passed" if item.get("passed") else "Failed",
        "passed": bool(item.get("passed")), "actual": item.get("actualOutput", ""),
        "expected": item.get("expectedOutput", ""), "runtime_ms": item.get("timeMs", 0),
        **({"error": item["error"]} if item.get("error") else {}),
    } for item in raw.get("results", [])]
    return {
        "all_passed": bool(raw.get("allPassed")), "passed_count": int(raw.get("passedCount", 0)),
        "total_count": int(raw.get("totalCount", len(cases))), "results": results,
        **({"error": str(raw["error"])[:2000]} if raw.get("error") else {}),
    }


def run_user_code(question: dict[str, Any], language: str, source_code: str, mode: str = "run") -> dict[str, Any]:
    category = str(question.get("category", "")).lower()
    if str(question.get("type", "Programming")).lower() == "conceptual" or category in CONCEPTUAL:
        supplied = {word.lower().strip(".,:;()") for word in source_code.split()}
        points = question.get("key_points") or question.get("topics") or []
        matched = [point for point in points if any(token in supplied for token in str(point).lower().split())]
        return {"mode": mode, "conceptual": True, "all_passed": len(matched) >= max(1, len(points) // 2), "matched_key_points": matched, "results": []}
    cases = list(question.get("test_cases") or question.get("testCases") or [])
    limit = 3 if mode == "run" else 10
    selected = cases[:limit]
    if os.getenv("JOBWAY_EXECUTOR_URL"):
        try:
            result = _remote_verify(language, source_code, selected)
        except (httpx.HTTPError, ValueError, RuntimeError) as exc:
            return {"mode": mode, "conceptual": False, "all_passed": False, "error": f"Secure runner unavailable: {str(exc)[:300]}", "results": []}
    elif os.getenv("JOBWAY_ENABLE_UNSAFE_LOCAL_EXECUTION") == "1":
        result = verify_source(language, source_code, selected)
    else:
        return {"mode": mode, "conceptual": False, "all_passed": False, "error": "Code execution is disabled until a secure executor is configured.", "results": []}
    return {"mode": mode, "conceptual": False, **_hide_private_cases(result, mode)}
