"""Create a minimal, public-only Vercel bundle for the placement API."""

from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".deploy" / "jobway-api"


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    deploy_root = (ROOT / ".deploy").resolve()
    output = OUTPUT.resolve()
    if output.parent != deploy_root:
        raise RuntimeError("Refusing to prepare files outside the deployment directory")
    if output.exists():
        shutil.rmtree(output)

    for source in (ROOT / "backend").glob("*.py"):
        copy_file(source, output / "backend" / source.name)
    for source in (ROOT / "pipeline").glob("*.py"):
        copy_file(source, output / "pipeline" / source.name)
    for name in ("career_quiz.json", "company_profiles.json", "questions.json", "workflows.json"):
        copy_file(ROOT / "frontend" / "public" / name, output / "frontend" / "public" / name)

    copy_file(ROOT / "api" / "index.py", output / "api" / "index.py")
    copy_file(ROOT / "requirements.txt", output / "requirements.txt")
    copy_file(ROOT / ".python-version", output / ".python-version")
    copy_file(ROOT / "vercel.placement.json", output / "vercel.json")
    print(f"Prepared public-only API bundle at {output}")


if __name__ == "__main__":
    main()
