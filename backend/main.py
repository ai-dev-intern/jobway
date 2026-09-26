"""Offline-first FastAPI service for the Job Way career preparation MVP."""
from __future__ import annotations

import json
import os
import re
import secrets
import threading
import time
from copy import deepcopy
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from pipeline.db import read_json
from .career_compass import assess_career_interest, load_quiz
from .code_runner import run_user_code
from .company_predictor import calculate_company_chances
from .workflow_engine import (
    bulk_opt_out_difficulty, get_company_workflow, get_role_workflow,
    load_workflows, swap_question, toggle_opt_out,
)

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = ROOT / "backend" / "questions.private.json"
COMPANIES_PATH = ROOT / "frontend" / "public" / "company_profiles.json"
OVERRIDES_PATH = ROOT / "backend" / "admin_overrides.json"
DEFAULT_STATE = {"active_workflow": None, "solved_questions": [], "opted_out_questions": {}, "swaps": {}, "swapped_in_questions": []}

IS_PRODUCTION = os.getenv("JOBWAY_ENV", "development").lower() == "production"
cors_origins = [value.strip() for value in os.getenv("JOBWAY_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if value.strip()]
trusted_hosts = [value.strip() for value in os.getenv("JOBWAY_TRUSTED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if value.strip()]

app = FastAPI(
    title="Job Way Career Portal", version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)
app.add_middleware(
    CORSMiddleware, allow_origins=cors_origins, allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"], max_age=600,
)

REQUEST_LIMIT = 128 * 1024
RATE_WINDOWS: dict[str, deque[float]] = defaultdict(deque)
RATE_LOCK = threading.Lock()
SESSION_STATES: dict[str, tuple[float, dict[str, Any]]] = {}
SESSION_LOCK = threading.Lock()
SESSION_COOKIE = "jobway_session"
MAX_ANONYMOUS_SESSIONS = 1000


@app.middleware("http")
async def security_boundary(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > REQUEST_LIMIT:
                return JSONResponse({"detail": "Request body too large"}, status_code=413)
        except ValueError:
            return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
    if request.url.path in {"/api/code/run", "/api/code/submit", "/api/career/assess"}:
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{request.url.path}"
        now = time.monotonic()
        limit = 30 if request.url.path.startswith("/api/code/") else 60
        with RATE_LOCK:
            window = RATE_WINDOWS[key]
            while window and now - window[0] > 60:
                window.popleft()
            if len(window) >= limit:
                return JSONResponse({"detail": "Too many requests; retry shortly"}, status_code=429, headers={"Retry-After": "60"})
            window.append(now)
    session_id = request.cookies.get(SESSION_COOKIE, "")
    if not re.fullmatch(r"[a-f0-9]{64}", session_id):
        session_id = secrets.token_hex(32)
    request.state.session_id = session_id
    response = await call_next(request)
    response.set_cookie(
        SESSION_COOKIE, session_id, max_age=30 * 24 * 60 * 60,
        httponly=True, secure=IS_PRODUCTION, samesite="lax", path="/",
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/") else "no-cache"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


def _question_records() -> list[dict[str, Any]]:
    values = read_json(QUESTIONS_PATH, [])
    overrides = read_json(OVERRIDES_PATH, {})
    by_id = overrides.get("questions", overrides) if isinstance(overrides, dict) else {}
    return [{**item, **(by_id.get(str(item.get("id")), {}) if isinstance(by_id, dict) else {})} for item in values]


def _public_question(item: dict[str, Any]) -> dict[str, Any]:
    safe = {key: value for key, value in item.items() if key not in {"reference_solution", "key_points"}}
    cases = item.get("test_cases") or item.get("testCases") or []
    safe["test_cases"] = cases[:1]
    safe.pop("testCases", None)
    return safe


def questions() -> list[dict[str, Any]]:
    return [_public_question(item) for item in _question_records()]


def companies() -> dict[str, dict[str, Any]]:
    payload = read_json(COMPANIES_PATH, {})
    profiles = dict(payload.get("companies", payload))
    dataset = ROOT / "pipeline" / ".cache" / "liquidslr"
    if dataset.exists():
        local_questions = questions()
        for directory in dataset.iterdir():
            if directory.is_dir() and directory.name != ".git" and directory.name not in profiles:
                tagged = [item for item in local_questions if directory.name.lower() in {str(value).lower() for value in item.get("companies", [])}]
                profiles[directory.name] = {
                    "name": directory.name, "problem_count": 0,
                    "easy_pct": 0.0, "medium_pct": 0.0, "hard_pct": 0.0,
                    "top_topics": [], "problems": [
                        {"title_slug": item.get("title_slug"), "title": item.get("title"), "difficulty": item.get("difficulty")}
                        for item in tagged
                    ],
                }
    return profiles


def state(request: Request) -> dict[str, Any]:
    session_id = request.state.session_id
    now = time.monotonic()
    with SESSION_LOCK:
        record = SESSION_STATES.get(session_id)
        value = deepcopy(DEFAULT_STATE) if record is None else {**deepcopy(DEFAULT_STATE), **deepcopy(record[1])}
        SESSION_STATES[session_id] = (now, deepcopy(value))
    return value


def save_state(request: Request, value: dict[str, Any]) -> dict[str, Any]:
    session_id = request.state.session_id
    with SESSION_LOCK:
        if session_id not in SESSION_STATES and len(SESSION_STATES) >= MAX_ANONYMOUS_SESSIONS:
            oldest = min(SESSION_STATES, key=lambda key: SESSION_STATES[key][0])
            SESSION_STATES.pop(oldest, None)
        SESSION_STATES[session_id] = (time.monotonic(), deepcopy(value))
    return value


def find_question(question_id: str, *, include_private: bool = False) -> dict[str, Any]:
    source = _question_records() if include_private else questions()
    item = next((item for item in source if str(item.get("id")) == str(question_id) or item.get("title_slug") == question_id), None)
    if not item:
        raise HTTPException(404, "Question not found")
    return item


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AssessmentBody(StrictBody):
    answers: list[str] | dict[str, str]

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, value: list[str] | dict[str, str]):
        if not 1 <= len(value) <= 25:
            raise ValueError("Answer count must be between 1 and 25")
        if any(len(str(item)) > 20 for item in (value.values() if isinstance(value, dict) else value)):
            raise ValueError("Answer value is too long")
        return value


class SelectBody(StrictBody):
    mode: Literal["role", "company"]
    target_id: str = Field(min_length=1, max_length=100, pattern=r"^[\w .&/+\-]+$")


class OptOutBody(StrictBody):
    question_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9._:\-]+$")
    reason: str = Field(default="Skip for now", max_length=200)
    action: Literal["opt_out", "restore", "remove"] = "opt_out"


class BulkOptOutBody(StrictBody):
    phase_number: int = Field(ge=1, le=4)
    difficulty: Literal["Easy", "Medium", "Hard"]


class SwapBody(StrictBody):
    question_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9._:\-]+$")


class CodeBody(StrictBody):
    question_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9._:\-]+$")
    language: Literal["python", "python3", "java"]
    source_code: str = Field(min_length=1, max_length=50_000)


def require_admin(authorization: str | None = Header(default=None)) -> None:
    configured = os.getenv("JOBWAY_ADMIN_TOKEN", "")
    if len(configured) < 32:
        raise HTTPException(503, "Administrative API is disabled")
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not secrets.compare_digest(supplied, configured):
        raise HTTPException(401, "Invalid administrative credentials", headers={"WWW-Authenticate": "Bearer"})


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "live", "message": "Job Way Career Portal API"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "storage": "json-fallback"}


def _pipeline_scheduler() -> None:
    import time
    while True:
        time.sleep(1800)
        try:
            from pipeline.run_pipeline import run
            run()
        except Exception:
            # Offline operation is expected; the last verified JSON snapshot remains active.
            continue


@app.on_event("startup")
def start_background_pipeline() -> None:
    if os.getenv("JOBWAY_ENABLE_PIPELINE_SCHEDULER") == "1":
        threading.Thread(target=_pipeline_scheduler, daemon=True, name="jobway-pipeline").start()


@app.get("/api/questions")
def get_questions(difficulty: str | None = None, company: str | None = None, topic: str | None = None) -> list[dict[str, Any]]:
    output = questions()
    if difficulty:
        output = [item for item in output if item.get("difficulty", "").lower() == difficulty.lower()]
    if company:
        output = [item for item in output if company.lower() in {str(value).lower() for value in item.get("companies", [])}]
    if topic:
        output = [item for item in output if topic.lower() in {str(value).lower() for value in item.get("topics", [])}]
    return output


@app.get("/api/stats")
def stats(request: Request) -> dict[str, Any]:
    items = questions()
    current = state(request)
    return {"questions": len(items), "companies": len(companies()), "solved": len(current["solved_questions"]), "by_difficulty": {level: sum(item.get("difficulty") == level for item in items) for level in ("Easy", "Medium", "Hard")}}


@app.get("/api/companies")
def get_companies(search: str = "", limit: int = Query(100, ge=1, le=500)) -> list[dict[str, Any]]:
    values = [profile for name, profile in companies().items() if search.lower() in name.lower()]
    return sorted(values, key=lambda item: (-int(item.get("problem_count", 0)), item["name"]))[:limit]


@app.get("/api/export")
def export_questions() -> JSONResponse:
    return JSONResponse(questions(), headers={"Content-Disposition": "attachment; filename=jobway_questions.json"})


@app.post("/api/pipeline/run")
def run_pipeline_now(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin(authorization)
    def task() -> None:
        try:
            from pipeline.run_pipeline import run
            run()
        except Exception:
            pass
    threading.Thread(target=task, daemon=True).start()
    return {"started": True, "message": "Enrichment pipeline started in the background"}


@app.get("/api/admin/overrides")
def admin_overrides(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin(authorization)
    return read_json(OVERRIDES_PATH, {"questions": {}})


@app.get("/api/career/quiz")
def career_quiz() -> list[dict[str, Any]]:
    return load_quiz()


@app.post("/api/career/assess")
def career_assess(body: AssessmentBody) -> dict[str, Any]:
    return {"recommendations": assess_career_interest(body.answers)}


@app.get("/api/workflows/roles")
def workflow_roles() -> list[dict[str, Any]]:
    items = questions()
    return [{**role, "question_count": sum(role["id"] in item.get("software_roles", []) for item in items)} for role in load_workflows()]


@app.get("/api/workflows/role/{role_id}")
def role_workflow(role_id: str, request: Request) -> dict[str, Any]:
    try:
        return get_role_workflow(role_id, questions(), state(request))
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.get("/api/workflows/company/{company_name}")
def company_workflow(company_name: str, request: Request) -> dict[str, Any]:
    profile = next((value for name, value in companies().items() if name.lower() == company_name.lower()), {"name": company_name, "top_topics": []})
    return get_company_workflow(profile["name"], questions(), state(request), profile)


@app.post("/api/workflow/select")
def workflow_select(body: SelectBody, request: Request) -> dict[str, Any]:
    current = state(request)
    current["active_workflow"] = {"mode": body.mode, "target_id": body.target_id}
    save_state(request, current)
    return {"success": True, "active_workflow": current["active_workflow"]}


@app.get("/api/workflow/active")
def workflow_active(request: Request) -> dict[str, Any]:
    current = state(request)
    active = current.get("active_workflow")
    if not active:
        return {"active_workflow": None}
    if active["mode"] == "role":
        return get_role_workflow(active["target_id"], questions(), current)
    profile = companies().get(active["target_id"], {"name": active["target_id"], "top_topics": []})
    return get_company_workflow(active["target_id"], questions(), current, profile)


@app.post("/api/workflow/opt-out")
def workflow_opt_out(body: OptOutBody, request: Request) -> dict[str, Any]:
    find_question(body.question_id)
    current = toggle_opt_out(state(request), body.question_id, body.reason, body.action)
    save_state(request, current)
    return {"success": True, "user_state": current}


@app.post("/api/workflow/opt-out-tier")
def workflow_opt_out_tier(body: BulkOptOutBody, request: Request) -> dict[str, Any]:
    current = bulk_opt_out_difficulty(state(request), questions(), body.phase_number, body.difficulty)
    save_state(request, current)
    return {"success": True, "user_state": current}


@app.post("/api/workflow/swap")
def workflow_swap(body: SwapBody, request: Request) -> dict[str, Any]:
    current = state(request)
    replacement = swap_question(body.question_id, questions(), current)
    if not replacement:
        raise HTTPException(404, "No compatible replacement found")
    save_state(request, current)
    return {"success": True, "replacement": replacement, "user_state": current}


def _execute(body: CodeBody, mode: str, request: Request) -> dict[str, Any]:
    question = find_question(body.question_id, include_private=True)
    result = run_user_code(question, body.language, body.source_code, mode)
    if mode == "submit" and result.get("all_passed"):
        current = state(request)
        if body.question_id not in current["solved_questions"]:
            current["solved_questions"].append(body.question_id)
            save_state(request, current)
        result["marked_solved"] = True
    return result


@app.post("/api/code/run")
def code_run(body: CodeBody, request: Request) -> dict[str, Any]:
    return _execute(body, "run", request)


@app.post("/api/code/submit")
def code_submit(body: CodeBody, request: Request) -> dict[str, Any]:
    return _execute(body, "submit", request)


@app.get("/api/companies/chances")
def company_chances(request: Request) -> dict[str, list[dict[str, Any]]]:
    return calculate_company_chances(questions(), companies(), state(request))
