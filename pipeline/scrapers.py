"""Unified scraper facade for Job Way's local collectors."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable
from urllib.request import Request, urlopen

from .deterministic_tagger import tag_question
from .leetcode_graphql import LeetCodeGraphQL
from .video_matcher import attach_videos


def normalize_external_question(question: dict[str, Any], source: str) -> dict[str, Any]:
    normalized = {
        **question,
        "source": source,
        "topics": question.get("topics") or question.get("tags") or [],
        "description": question.get("description") or question.get("content") or question.get("html_content") or "",
    }
    return attach_videos(tag_question(normalized))


def fetch_leetcode(limit: int = 25) -> list[dict[str, Any]]:
    client = LeetCodeGraphQL()
    output = []
    for summary in client.problemset(limit=limit):
        if summary.get("isPaidOnly"):
            continue
        output.append(normalize_external_question(client.problem(summary["titleSlug"]), "LeetCode"))
    return output


def fetch_codeforces(limit: int = 50) -> list[dict[str, Any]]:
    request = Request("https://codeforces.com/api/problemset.problems", headers={"User-Agent": "JobWay-MVP/1.0"})
    with urlopen(request, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
    problems = (payload.get("result") or {}).get("problems") or []
    return [normalize_external_question({
        "id": f"cf-{item.get('contestId')}-{item.get('index')}",
        "title": item.get("name"), "title_slug": f"{item.get('contestId')}{item.get('index')}",
        "difficulty": None, "rating": item.get("rating"), "topics": item.get("tags", []),
        "link": f"https://codeforces.com/problemset/problem/{item.get('contestId')}/{item.get('index')}",
    }, "Codeforces") for item in problems[:limit]]


def fetch_cses(limit: int = 50) -> list[dict[str, Any]]:
    snapshot = Path(__file__).resolve().parents[1] / "scraper" / "cses_problems.json"
    if not snapshot.exists():
        return []
    items = json.loads(snapshot.read_text(encoding="utf-8"))
    return [normalize_external_question(item, "CSES") for item in items[:limit]]


def _normalize_records(records: Iterable[dict[str, Any]] | None, source: str) -> list[dict[str, Any]]:
    """Normalize records supplied by site adapters without coupling to unstable HTML."""
    return [normalize_external_question(item, source) for item in (records or [])]


def fetch_geeksforgeeks(records: Iterable[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    return _normalize_records(records, "GeeksforGeeks")


def fetch_hackerrank(records: Iterable[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    return _normalize_records(records, "HackerRank")


def conceptual_questions() -> list[dict[str, Any]]:
    return [normalize_external_question(item, "Job Way Core CS") for item in [
        {"id": "concept-os", "title": "Process vs Thread", "type": "Conceptual", "difficulty": "Easy", "category": "OS", "topics": ["OS"], "key_points": ["address space", "context switch", "shared memory"]},
        {"id": "concept-db", "title": "Index Selectivity", "type": "Conceptual", "difficulty": "Medium", "category": "DBMS", "topics": ["DBMS"], "key_points": ["b-tree", "cardinality", "query plan"]},
        {"id": "concept-net", "title": "Reliable Delivery", "type": "Conceptual", "difficulty": "Hard", "category": "Networks", "topics": ["Networks"], "key_points": ["TCP", "timeout", "idempotency"]},
        {"id": "concept-ml", "title": "Model Generalization", "type": "Conceptual", "difficulty": "Medium", "category": "ML", "topics": ["ML"], "key_points": ["cross validation", "regularization", "data leakage"]},
    ]]
