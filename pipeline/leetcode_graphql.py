"""Small dependency-free LeetCode GraphQL client."""
from __future__ import annotations

import json
from typing import Any
from urllib.request import Request, urlopen

ENDPOINT = "https://leetcode.com/graphql"
DETAIL_QUERY = """query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId title titleSlug content difficulty isPaidOnly topicTags { name slug } codeSnippets { langSlug code } sampleTestCase } }"""
LIST_QUERY = """query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int) { problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: {}) { questions: data { titleSlug title difficulty isPaidOnly topicTags { name slug } } } }"""


class LeetCodeGraphQL:
    def __init__(self, endpoint: str = ENDPOINT, timeout: float = 15.0):
        self.endpoint = endpoint
        self.timeout = timeout

    def _post(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
        request = Request(self.endpoint, data=body, headers={"Content-Type": "application/json", "User-Agent": "JobWay-MVP/1.0"})
        with urlopen(request, timeout=self.timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if payload.get("errors"):
            raise RuntimeError(payload["errors"])
        return payload.get("data", {})

    def problem(self, title_slug: str) -> dict[str, Any]:
        raw = self._post(DETAIL_QUERY, {"titleSlug": title_slug}).get("question") or {}
        snippets = {item.get("langSlug"): item.get("code", "") for item in raw.get("codeSnippets") or []}
        return {
            **raw,
            "topics": [tag.get("name") for tag in raw.get("topicTags") or []],
            "starter_code": {"python": snippets.get("python3", ""), "java": snippets.get("java", "")},
        }

    def problemset(self, limit: int = 50, skip: int = 0, category_slug: str = "") -> list[dict[str, Any]]:
        data = self._post(LIST_QUERY, {"categorySlug": category_slug, "limit": limit, "skip": skip})
        return (data.get("problemsetQuestionList") or {}).get("questions") or []
