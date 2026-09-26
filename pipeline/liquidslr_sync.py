"""Parse the locally cloned liquidslr company-wise LeetCode CSV collection."""
from __future__ import annotations

import csv
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DEFAULT_REPO = ROOT / ".cache" / "liquidslr"
WINDOWS = {
    "1. Thirty Days.csv": ("30_days", 1.0),
    "2. Three Months.csv": ("90_days", 0.8),
    "3. Six Months.csv": ("6_months", 0.6),
    "4. More Than Six Months.csv": ("6_months_plus", 0.5),
    "5. All.csv": ("all_time", 0.4),
}


def slug_from_link(link: str) -> str:
    match = re.search(r"/problems/([^/?#]+)", link or "")
    return match.group(1) if match else ""


def ensure_repo(repo_path: Path = DEFAULT_REPO) -> Path:
    if repo_path.exists():
        return repo_path
    repo_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "git", "clone", "--depth", "1",
        "https://github.com/liquidslr/leetcode-company-wise-problems.git", str(repo_path),
    ], check=True, timeout=180)
    return repo_path


def build_company_index(repo_path: Path | str = DEFAULT_REPO) -> dict[str, Any]:
    root = ensure_repo(Path(repo_path))
    problems: dict[str, dict[str, Any]] = {}
    companies: dict[str, dict[str, Any]] = {}
    for company_dir in sorted(path for path in root.iterdir() if path.is_dir() and path.name != ".git"):
        difficulty_counts: Counter[str] = Counter()
        topic_counts: Counter[str] = Counter()
        company_problems: dict[str, dict[str, Any]] = {}
        for filename, (window, weight) in WINDOWS.items():
            csv_path = company_dir / filename
            if not csv_path.exists():
                continue
            with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    slug = slug_from_link(row.get("Link", ""))
                    if not slug:
                        continue
                    difficulty = str(row.get("Difficulty", "Medium")).title()
                    if difficulty not in {"Easy", "Medium", "Hard"}:
                        difficulty = "Medium"
                    try:
                        frequency = float(row.get("Frequency") or 0)
                    except ValueError:
                        frequency = 0.0
                    topics = [item.strip() for item in (row.get("Topics") or "").split(",") if item.strip()]
                    detail = {"name": company_dir.name, "frequency": frequency, "window": window, "recency_weight": weight}
                    record = problems.setdefault(slug, {
                        "title_slug": slug, "title": row.get("Title") or slug.replace("-", " ").title(),
                        "difficulty": difficulty, "link": row.get("Link", ""), "topics": topics,
                        "companies": [], "company_details": [],
                    })
                    if company_dir.name not in record["companies"]:
                        record["companies"].append(company_dir.name)
                    # Keep each recency window because it is useful for sprint ranking.
                    record["company_details"].append(detail)
                    previous = company_problems.get(slug)
                    weighted = frequency * weight
                    if previous is None or weighted > previous["weighted_frequency"]:
                        company_problems[slug] = {"title_slug": slug, "title": record["title"], "difficulty": difficulty, "topics": topics, "frequency": frequency, "window": window, "weighted_frequency": weighted}
        for item in company_problems.values():
            difficulty_counts[item["difficulty"]] += 1
            topic_counts.update(item["topics"])
        total = sum(difficulty_counts.values()) or 1
        companies[company_dir.name] = {
            "name": company_dir.name,
            "problem_count": len(company_problems),
            "easy_pct": round(100 * difficulty_counts["Easy"] / total, 1),
            "medium_pct": round(100 * difficulty_counts["Medium"] / total, 1),
            "hard_pct": round(100 * difficulty_counts["Hard"] / total, 1),
            "top_topics": [topic for topic, _ in topic_counts.most_common(10)],
            "problems": sorted(company_problems.values(), key=lambda item: item["weighted_frequency"], reverse=True),
        }
    return {"problems": problems, "companies": companies}


def save_index(output_path: Path | str, repo_path: Path | str = DEFAULT_REPO) -> dict[str, Any]:
    index = build_company_index(repo_path)
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    return index


if __name__ == "__main__":
    result = save_index(ROOT / ".cache" / "company_index.json")
    print(f"Indexed {len(result['companies'])} companies and {len(result['problems'])} problems")

