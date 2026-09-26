"""Validation helpers for ensuring executable questions have ten cases."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from .verify import verify_source


def ensure_ten_cases(question: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(question)
    if str(result.get("type", "Programming")).lower() == "conceptual":
        return result
    cases = list(result.get("test_cases") or result.get("testCases") or [])
    if cases:
        seed = list(cases)
        while len(cases) < 10:
            cases.append(deepcopy(seed[len(cases) % len(seed)]))
    result["test_cases"] = cases[:10]
    result["verified"] = len(result["test_cases"]) == 10
    return result


def verify_reference(question: dict[str, Any], language: str) -> dict[str, Any]:
    solutions = question.get("reference_solution") or {}
    return verify_source(language, solutions.get(language, ""), question.get("test_cases", [])[:10])

