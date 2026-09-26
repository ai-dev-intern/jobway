"""Run local company enrichment and optional online LeetCode ingestion."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .deterministic_tagger import tag_questions
from .liquidslr_sync import build_company_index
from .video_matcher import attach_videos

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "frontend" / "public" / "questions.json"
INDEX = ROOT / "pipeline" / ".cache" / "company_index.json"


def run() -> dict[str, int]:
    questions = json.loads(QUESTIONS.read_text(encoding="utf-8"))
    company_index = build_company_index()
    by_slug = company_index["problems"]
    enriched = []
    for question in tag_questions(questions):
        company = by_slug.get(question.get("title_slug", ""), {})
        merged = {**question}
        for field in ("companies", "company_details"):
            if company.get(field):
                merged[field] = company[field]
        enriched.append(attach_videos(merged))
    QUESTIONS.write_text(json.dumps(enriched, indent=2, ensure_ascii=False), encoding="utf-8")
    INDEX.write_text(json.dumps(company_index, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"questions": len(enriched), "companies": len(company_index["companies"])}


if __name__ == "__main__":
    argparse.ArgumentParser(description=__doc__).parse_args()
    print(json.dumps(run()))

