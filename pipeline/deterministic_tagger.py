"""Deterministic taxonomy used by the pipeline and workflow engine."""
from __future__ import annotations

from typing import Any, Iterable

DIFFICULTIES = ("Easy", "Medium", "Hard")
ROLE_IDS = (
    "backend_swe", "fullstack_swe", "frontend_swe", "ai_ml_swe",
    "data_swe", "cloud_devops_swe", "systems_swe",
)

PHASE_TOPICS = {
    1: {"array", "arrays", "string", "strings", "hash table", "hashing", "two pointers", "sliding window", "math", "basic math"},
    2: {"linked list", "stack", "queue", "tree", "binary tree", "bst", "heap", "priority queue", "matrix", "sorting"},
    3: {"graph", "graphs", "dynamic programming", "dp", "backtracking", "trie", "greedy", "os", "operating systems", "dbms", "database", "networks", "computer networks", "ml", "machine learning", "oop"},
}

ROLE_TOPICS = {
    "backend_swe": {"hash table", "tree", "graph", "database", "dbms", "networks", "system design", "queue"},
    "fullstack_swe": {"array", "string", "hash table", "tree", "database", "networks", "oop"},
    "frontend_swe": {"array", "string", "hash table", "tree", "graph", "oop"},
    "ai_ml_swe": {"array", "matrix", "graph", "dynamic programming", "math", "ml", "machine learning"},
    "data_swe": {"array", "hash table", "heap", "graph", "database", "dbms", "queue"},
    "cloud_devops_swe": {"graph", "queue", "os", "operating systems", "networks", "system design"},
    "systems_swe": {"array", "linked list", "tree", "graph", "os", "operating systems", "networks"},
}


def normalize_difficulty(value: Any = None, rating: Any = None, source: str = "") -> str:
    """Return exactly Easy, Medium, or Hard for heterogeneous source labels."""
    if rating not in (None, ""):
        try:
            score = int(float(rating))
            if score <= 1100:
                return "Easy"
            if score <= 1500:
                return "Medium"
            return "Hard"
        except (TypeError, ValueError):
            pass
    text = str(value or "").strip().lower()
    if text in {"easy", "basic", "school", "introductory", "beginner", "simple"}:
        return "Easy"
    if text in {"hard", "advanced", "expert", "very hard"}:
        return "Hard"
    if text in {"medium", "intermediate", "moderate"}:
        return "Medium"
    return "Medium"


def _tokens(question: dict[str, Any]) -> set[str]:
    raw: Iterable[Any] = question.get("topics") or question.get("tags") or []
    if isinstance(raw, str):
        raw = raw.split(",")
    values = {str(item).strip().lower() for item in raw if str(item).strip()}
    category = str(question.get("category", "")).strip().lower()
    subtopic = str(question.get("subtopic", "")).strip().lower()
    if category:
        values.add(category)
    if subtopic:
        values.add(subtopic)
    return values


def infer_phase(question: dict[str, Any]) -> int:
    if question.get("workflow_phase") in (1, 2, 3, 4):
        return int(question["workflow_phase"])
    if question.get("company_details") or question.get("frequency", 0):
        try:
            if float(question.get("frequency", 0)) >= 50:
                return 4
        except (TypeError, ValueError):
            pass
    tokens = _tokens(question)
    scores = {phase: len(tokens & topics) for phase, topics in PHASE_TOPICS.items()}
    return max(scores, key=scores.get) if max(scores.values(), default=0) else 1


def infer_roles(question: dict[str, Any]) -> list[str]:
    existing = [role for role in question.get("software_roles", []) if role in ROLE_IDS]
    if existing:
        return existing
    tokens = _tokens(question)
    ranked = [(len(tokens & topics), role) for role, topics in ROLE_TOPICS.items()]
    matches = [role for score, role in ranked if score > 0]
    return matches or list(ROLE_IDS)


def tag_question(question: dict[str, Any]) -> dict[str, Any]:
    tagged = dict(question)
    tagged["difficulty"] = normalize_difficulty(
        question.get("difficulty"), question.get("rating"), str(question.get("source", ""))
    )
    tagged["workflow_phase"] = infer_phase(tagged)
    tagged["software_roles"] = infer_roles(tagged)
    return tagged


def tag_questions(questions: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [tag_question(question) for question in questions]

