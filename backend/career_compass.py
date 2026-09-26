"""Weighted Job Way career assessment across twelve role tracks."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
QUIZ_PATH = ROOT / "frontend" / "public" / "career_quiz.json"
WORKFLOWS_PATH = ROOT / "frontend" / "public" / "workflows.json"


def load_quiz() -> list[dict[str, Any]]:
    return json.loads(QUIZ_PATH.read_text(encoding="utf-8"))


def _roles() -> dict[str, dict[str, Any]]:
    payload = json.loads(WORKFLOWS_PATH.read_text(encoding="utf-8"))
    roles = payload.get("roles", payload)
    return {item["id"]: item for item in roles}


def assess_career_interest(answers: list[Any] | dict[str, Any]) -> list[dict[str, Any]]:
    quiz = load_quiz()
    lookup = answers if isinstance(answers, dict) else {str(index): value for index, value in enumerate(answers)}
    scores = {role_id: 0.0 for role_id in _roles()}
    possible = {role_id: 0.0 for role_id in scores}
    for index, question in enumerate(quiz):
        raw_answer = lookup.get(question["id"], lookup.get(str(index)))
        selected = next((option for option in question["options"] if option["id"] == raw_answer), None)
        question_max = {role_id: 0.0 for role_id in scores}
        for option in question["options"]:
            for role_id, weight in option.get("weights", {}).items():
                question_max[role_id] = max(question_max.get(role_id, 0), float(weight))
        for role_id, weight in question_max.items():
            possible[role_id] = possible.get(role_id, 0) + max(0, weight)
        if selected:
            for role_id, weight in selected.get("weights", {}).items():
                scores[role_id] = scores.get(role_id, 0) + float(weight)
    roles = _roles()
    recommendations = []
    for role_id, score in scores.items():
        role = roles[role_id]
        percentage = round(100 * score / max(1.0, possible.get(role_id, 1.0)))
        recommendations.append({
            "role_id": role_id,
            "title": role["title"],
            "match_percentage": max(0, min(100, percentage)),
            "rationale": role["rationale"],
            "key_topics": role["key_topics"],
            "top_hiring_companies": role["top_hiring_companies"],
        })
    recommendations.sort(key=lambda item: (-item["match_percentage"], item["title"]))
    return recommendations[:3]
