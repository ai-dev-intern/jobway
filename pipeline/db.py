"""Atomic-ish JSON persistence used when Supabase is not configured."""
from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Any

LOCK = RLock()


def read_json(path: str | Path, default: Any) -> Any:
    file_path = Path(path)
    with LOCK:
        if not file_path.exists():
            return default
        try:
            return json.loads(file_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return default


def write_json(path: str | Path, value: Any) -> None:
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = file_path.with_suffix(file_path.suffix + ".tmp")
    with LOCK:
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
        temporary.replace(file_path)

