"""Readiness scoring against company pools and topic distributions."""
from __future__ import annotations

from typing import Any

WEIGHTS = {"Easy": 1, "Medium": 2, "Hard": 3}


def calculate_company_chances(questions: list[dict[str, Any]], companies: dict[str, dict[str, Any]], user_state: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    solved_ids = set(map(str, user_state.get("solved_questions", [])))
    solved_slugs = {
        str(question.get("title_slug") or question.get("id"))
        for question in questions
        if str(question.get("id")) in solved_ids or str(question.get("title_slug")) in solved_ids
    }
    solved_topics: set[str] = set()
    solved_weight = 0
    for identifier in solved_ids:
        question = next((item for item in questions if str(item.get("id")) == identifier or str(item.get("title_slug")) == identifier), None)
        if question:
            solved_weight += WEIGHTS.get(question.get("difficulty", "Medium"), 2)
            solved_topics.update(map(str.lower, question.get("topics", [])))
    core_topics = {"os", "operating systems", "dbms", "database", "networks", "computer networks", "oop"}
    result = {"high_chance": [], "within_reach": [], "stretch_targets": []}
    for name, profile in companies.items():
        pool = profile.get("problems", [])[:100]
        total_points = sum(WEIGHTS.get(item.get("difficulty", "Medium"), 2) for item in pool) or 1
        covered_points = sum(WEIGHTS.get(item.get("difficulty", "Medium"), 2) for item in pool if item.get("title_slug") in solved_slugs)
        coverage = min(1.0, covered_points / total_points)
        required_topics = {str(topic).lower() for topic in profile.get("top_topics", [])}
        transfer = len(required_topics & solved_topics) / max(1, len(required_topics))
        core = min(1.0, len(core_topics & solved_topics) / 3)
        score = round(100 * (0.55 * coverage + 0.30 * transfer + 0.15 * core), 1)
        gaps = [item for item in pool if item.get("title_slug") not in solved_slugs][:5]
        card = {"name": name, "readiness_score": score, "problem_count": profile.get("problem_count", len(pool)), "top_topics": profile.get("top_topics", [])[:5], "missing_topics": sorted(required_topics - solved_topics)[:5], "gap_problems": gaps, "points_earned": solved_weight}
        key = "high_chance" if score >= 75 else "within_reach" if score >= 45 else "stretch_targets"
        result[key].append(card)
    for cards in result.values():
        cards.sort(key=lambda item: (-item["readiness_score"], item["name"]))
    return result


def predict_company_chances(questions: list[dict[str, Any]], companies: dict[str, dict[str, Any]], user_state: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    return calculate_company_chances(questions, companies, user_state)
