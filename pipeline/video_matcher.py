"""Stable curated videos with deterministic topic matching."""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

VIDEOS = {
    "array": ("KLlXCFG5TnA", "Arrays & Hashing Core Patterns", "NeetCode"),
    "string": ("WKTgajDkVcA", "String Algorithms", "freeCodeCamp.org"),
    "sliding window": ("MK-NZ4hN7rs", "Sliding Window Technique", "NeetCode"),
    "tree": ("fAAZixBzIAI", "Binary Trees", "NeetCode"),
    "graph": ("tWVWeAqZ0WU", "Graph Algorithms", "freeCodeCamp.org"),
    "dynamic programming": ("oBt53YbR9Kk", "Dynamic Programming", "freeCodeCamp.org"),
    "heap": ("HqPJF2L5h9U", "Heap and Priority Queue", "NeetCode"),
    "backtracking": ("Zq4upTEaQyM", "Backtracking Patterns", "NeetCode"),
    "linked list": ("N6dOwBde7-M", "Linked Lists", "NeetCode"),
    "os": ("vBURTt97EkA", "Operating Systems", "Gate Smashers"),
    "dbms": ("kBdlM6hNDAE", "Database Management Systems", "Gate Smashers"),
    "networks": ("IPvYjXCsTg8", "Computer Networking", "freeCodeCamp.org"),
    "ml": ("NWONeJKn6kc", "Machine Learning Fundamentals", "freeCodeCamp.org"),
}
ALIASES = {"arrays": "array", "strings": "string", "trees": "tree", "graphs": "graph", "dp": "dynamic programming", "database": "dbms", "operating systems": "os", "machine learning": "ml", "computer networks": "networks", "priority queue": "heap"}


def video_for_question(question: dict[str, Any]) -> dict[str, Any]:
    topics = question.get("topics") or question.get("tags") or [question.get("category", "array")]
    if isinstance(topics, str):
        topics = topics.split(",")
    key = "array"
    for topic in topics:
        candidate = ALIASES.get(str(topic).strip().lower(), str(topic).strip().lower())
        if candidate in VIDEOS:
            key = candidate
            break
    video_id, title, channel = VIDEOS[key]
    return {
        "topic_video": {"video_id": video_id, "title": title, "channel": channel},
        "problem_videos": [{"video_id": video_id, "title": f"{question.get('title', 'Problem')} walkthrough & complexity analysis", "channel": channel}],
    }


def attach_videos(question: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(question)
    enriched["related_videos"] = question.get("related_videos") or video_for_question(question)
    return enriched


def resolve_youtube_video(query: str, timeout: float = 8.0) -> str | None:
    """Resolve the first public YouTube result when online; callers retain curated fallback IDs."""
    request = Request(f"https://www.youtube.com/results?search_query={quote_plus(query)}", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(request, timeout=timeout) as response:
            html = response.read().decode("utf-8", errors="ignore")
        match = re.search(r'"videoId":"([A-Za-z0-9_-]{11})"', html)
        return match.group(1) if match else None
    except OSError:
        return None
