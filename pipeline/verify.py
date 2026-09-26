"""Resource-limited verifier for explicitly enabled local development only.

This is defense in depth, not an OS security boundary. Production code must use the
isolated executor service instead of enabling local execution in the API process.
"""
from __future__ import annotations

import os
import re
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

MAX_OUTPUT_BYTES = 64 * 1024
SAFE_ENV = {"PATH": os.environ.get("PATH", ""), "LANG": "C.UTF-8", "PYTHONIOENCODING": "utf-8"}


def _text(value: Any) -> str:
    return value if isinstance(value, str) else str(value if value is not None else "")


def _resource_limits() -> None:
    if os.name == "nt":
        return
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    if hasattr(resource, "RLIMIT_NPROC"):
        resource.setrlimit(resource.RLIMIT_NPROC, (16, 16))


def _terminate_tree(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, timeout=2)
        else:
            os.killpg(process.pid, signal.SIGKILL)
    except (OSError, subprocess.SubprocessError):
        process.kill()


def _run(command: list[str], stdin: str, cwd: Path, timeout: float) -> dict[str, Any]:
    started = time.perf_counter()
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    try:
        with tempfile.TemporaryFile(mode="w+t", encoding="utf-8") as stdout_file, tempfile.TemporaryFile(mode="w+t", encoding="utf-8") as stderr_file:
            process = subprocess.Popen(
                command, stdin=subprocess.PIPE, stdout=stdout_file, stderr=stderr_file,
                text=True, cwd=cwd, env=SAFE_ENV, start_new_session=os.name != "nt",
                creationflags=creationflags, preexec_fn=_resource_limits if os.name != "nt" else None,
            )
            try:
                process.communicate(input=stdin, timeout=timeout)
            except subprocess.TimeoutExpired:
                _terminate_tree(process)
                process.wait(timeout=2)
                return {"status": "Time Limit Exceeded", "actual": "", "error": f"Exceeded {timeout:.1f}s", "runtime_ms": round(timeout * 1000, 2)}
            stdout_file.seek(0); stderr_file.seek(0)
            stdout = stdout_file.read(MAX_OUTPUT_BYTES + 1)
            stderr = stderr_file.read(MAX_OUTPUT_BYTES + 1)
            if len(stdout) > MAX_OUTPUT_BYTES or len(stderr) > MAX_OUTPUT_BYTES:
                return {"status": "Output Limit Exceeded", "actual": stdout[:MAX_OUTPUT_BYTES], "error": "Output exceeded 64 KiB", "runtime_ms": round((time.perf_counter()-started)*1000, 2)}
            runtime = round((time.perf_counter() - started) * 1000, 2)
            if process.returncode:
                return {"status": "Runtime Error", "actual": stdout.strip(), "error": stderr.strip()[:4000], "runtime_ms": runtime}
            return {"status": "Completed", "actual": stdout.strip(), "error": stderr.strip()[:4000], "runtime_ms": runtime}
    except FileNotFoundError:
        return {"status": "Runtime Error", "actual": "", "error": "Language runtime is unavailable", "runtime_ms": 0}


def verify_source(language: str, source_code: str, test_cases: list[dict[str, Any]], timeout: float = 2.0) -> dict[str, Any]:
    language = language.lower().replace("python3", "python")
    if language not in {"python", "java"}:
        raise ValueError("Only Python and Java are supported")
    if not 1 <= len(source_code) <= 50_000:
        raise ValueError("Source code must be between 1 and 50,000 characters")
    with tempfile.TemporaryDirectory(prefix="jobway_") as temp:
        root = Path(temp)
        if language == "python":
            source_path = root / "solution.py"
            source_path.write_text(source_code, encoding="utf-8")
            command = [sys.executable, "-I", "-S", "-B", str(source_path)]
        else:
            source_code = re.sub(r"public\s+class\s+\w+", "public class Main", source_code, count=1)
            source_path = root / "Main.java"
            source_path.write_text(source_code, encoding="utf-8")
            compiled = _run(["javac", str(source_path)], "", root, 10)
            if compiled["status"] != "Completed":
                return {"all_passed": False, "passed_count": 0, "total_count": len(test_cases), "results": [], "error": compiled.get("error", "Compilation failed"), "stage": "compilation"}
            command = ["java", "-Xmx192m", "-cp", str(root), "Main"]
        results = []
        for index, case in enumerate(test_cases[:10]):
            expected = _text(case.get("expected", case.get("expectedOutput", case.get("output", "")))).strip()
            result = _run(command, _text(case.get("input", ""))[:64_000], root, timeout)
            passed = result["status"] == "Completed" and result["actual"].strip() == expected
            status = "Passed" if passed else ("Failed" if result["status"] == "Completed" else result["status"])
            results.append({**result, "test_case": index + 1, "status": status, "passed": passed, "input": case.get("input", ""), "expected": expected})
        passed_count = sum(item["passed"] for item in results)
        return {"all_passed": passed_count == len(results) and bool(results), "passed_count": passed_count, "total_count": len(results), "results": results}


def verify_solution(source_code: str, language: str, test_cases: list[dict[str, Any]]) -> dict[str, Any]:
    return verify_source(language, source_code, test_cases)
