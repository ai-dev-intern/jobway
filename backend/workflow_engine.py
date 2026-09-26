"""Build role/company roadmaps and apply workflow flexibility operations."""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from pipeline.deterministic_tagger import DIFFICULTIES, normalize_difficulty

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS_PATH = ROOT / "frontend" / "public" / "workflows.json"


def load_workflows() -> list[dict[str, Any]]:
    payload = json.loads(WORKFLOWS_PATH.read_text(encoding="utf-8"))
    return payload.get("roles", payload)


def _id(question: dict[str, Any]) -> str:
    return str(question.get("id") or question.get("title_slug") or question.get("title"))


def _topics(question: dict[str, Any]) -> set[str]:
    raw = question.get("topics") or question.get("tags") or []
    if isinstance(raw, str):
        raw = raw.split(",")
    return {str(value).strip().lower() for value in raw}


def _state_sets(user_state: dict[str, Any]) -> tuple[set[str], set[str]]:
    solved = set(map(str, user_state.get("solved_questions", [])))
    opted_raw = user_state.get("opted_out_questions", {})
    opted = set(map(str, opted_raw.keys() if isinstance(opted_raw, dict) else opted_raw))
    return solved, opted


def _phase_payload(number: int, title: str, description: str, questions: list[dict[str, Any]], state: dict[str, Any]) -> dict[str, Any]:
    solved, opted = _state_sets(state)
    groups = {difficulty: [] for difficulty in DIFFICULTIES}
    opted_questions = []
    for raw in questions:
        item = deepcopy(raw)
        item["id"] = _id(item)
        item["difficulty"] = normalize_difficulty(item.get("difficulty"), item.get("rating"))
        item["solved"] = item["id"] in solved
        item["opted_out"] = item["id"] in opted
        if item["opted_out"]:
            opted_questions.append(item)
        else:
            groups[item["difficulty"]].append(item)
    total = len(questions)
    opted_count = len(opted_questions)
    solved_active = sum(1 for question in questions if _id(question) in solved and _id(question) not in opted)
    denominator = max(1, total - opted_count)
    return {
        "number": number, "title": title, "description": description,
        "questions_by_difficulty": groups, "opted_out_questions": opted_questions,
        "total": total, "solved": solved_active, "opted_out": opted_count,
        "progress_percentage": round(100 * solved_active / denominator, 1),
    }


def get_role_workflow(role_id: str, questions: list[dict[str, Any]], user_state: dict[str, Any] | None = None) -> dict[str, Any]:
    state = user_state or {}
    role = next((item for item in load_workflows() if item["id"] == role_id), None)
    if not role:
        raise ValueError(f"Unknown software role: {role_id}")
    phases = []
    for definition in role["phases"]:
        number = int(definition["number"])
        allowed = {str(topic).lower() for topic in definition.get("topics", [])}
        matches = [question for question in questions if number == int(question.get("workflow_phase", 1)) and (role_id in question.get("software_roles", []) or not question.get("software_roles")) and (not allowed or bool(_topics(question) & allowed))]
        if not matches:
            matches = [question for question in questions if number == int(question.get("workflow_phase", 1)) and (not allowed or bool(_topics(question) & allowed))]
        if not matches:
            matches = [question for question in questions if number == int(question.get("workflow_phase", 1))]
        phases.append(_phase_payload(number, definition["title"], definition.get("description", ""), matches, state))
    progress = round(sum(phase["progress_percentage"] for phase in phases) / 4, 1)
    return {"mode": "role", "target_id": role_id, "title": f"{role['title']} Workflow", "role": role, "phases": phases, "overall_progress": progress}


def get_company_workflow(company_name: str, questions: list[dict[str, Any]], user_state: dict[str, Any] | None = None, company_profile: dict[str, Any] | None = None) -> dict[str, Any]:
    state = user_state or {}
    profile = company_profile or {}
    company_lower = company_name.lower()
    direct = [question for question in questions if company_lower in {str(name).lower() for name in question.get("companies", [])}]
    top_topics = {str(topic).lower() for topic in profile.get("top_topics", [])}
    supplements = [question for question in questions if question not in direct and bool(_topics(question) & top_topics)]
    pool = direct + supplements[:max(0, 24 - len(direct))]
    if not pool:
        pool = list(questions)
    titles = {
        1: f"{company_name} Foundations — Arrays, Strings & Hashing",
        2: f"{company_name} Core Data Structures — Trees, Heaps & Lists",
        3: f"{company_name} Advanced Algorithms — Graphs & DP",
        4: f"{company_name} Core CS & Top 30-Day Frequency Sprint",
    }
    phases = []
    for number in range(1, 5):
        phase_questions = [question for question in pool if int(question.get("workflow_phase", 1)) == number]
        phases.append(_phase_payload(number, titles[number], "Tailored from historical frequency and topic distribution.", phase_questions, state))
    return {"mode": "company", "target_id": company_name, "title": f"{company_name} Custom Preparation Path", "company": profile, "phases": phases, "overall_progress": round(sum(item["progress_percentage"] for item in phases) / 4, 1)}


def toggle_opt_out(user_state: dict[str, Any], question_id: str, reason: str = "Skip for now", action: str = "opt_out") -> dict[str, Any]:
    opted = user_state.setdefault("opted_out_questions", {})
    if isinstance(opted, list):
        opted = user_state["opted_out_questions"] = {str(item): "Skip for now" for item in opted}
    if action in {"restore", "remove"}:
        opted.pop(str(question_id), None)
    else:
        opted[str(question_id)] = reason
    return user_state


def bulk_opt_out_difficulty(user_state: dict[str, Any], questions: list[dict[str, Any]], phase_number: int, difficulty: str) -> dict[str, Any]:
    solved, _ = _state_sets(user_state)
    for question in questions:
        if int(question.get("workflow_phase", 1)) == int(phase_number) and normalize_difficulty(question.get("difficulty")) == normalize_difficulty(difficulty) and _id(question) not in solved:
            toggle_opt_out(user_state, _id(question), f"Bulk skipped {difficulty}")
    return user_state


def swap_question(question_id: str, questions: list[dict[str, Any]], user_state: dict[str, Any] | None = None) -> dict[str, Any] | None:
    current = next((question for question in questions if _id(question) == str(question_id)), None)
    if not current:
        return None
    excluded = {str(question_id)} | set(map(str, (user_state or {}).get("swapped_in_questions", [])))
    current_topics = _topics(current)
    candidates = [question for question in questions if _id(question) not in excluded and normalize_difficulty(question.get("difficulty")) == normalize_difficulty(current.get("difficulty")) and (_topics(question) & current_topics or question.get("category") == current.get("category"))]
    replacement = candidates[0] if candidates else None
    if replacement is not None and user_state is not None:
        user_state.setdefault("swaps", {})[str(question_id)] = _id(replacement)
        user_state.setdefault("swapped_in_questions", []).append(_id(replacement))
        toggle_opt_out(user_state, question_id, "Swapped")
    return replacement
