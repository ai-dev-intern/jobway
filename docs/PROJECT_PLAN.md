# Job Way MVP

## Product scope

Job Way supports three entry paths into software-placement preparation: direct role selection, company-specific practice, and a simple career compass. Every selection produces a four-phase roadmap with Easy, Medium, and Hard tiers.

## Runtime architecture

- `frontend/`: the original React + Vite + TypeScript app, extended with the placement hub, roadmap, editor/video studio, and company readiness map.
- `backend/main.py`: offline-first FastAPI placement API with private solution data, request limits, security headers, and protected maintenance endpoints.
- `backend/src/`: Hono + Prisma backend for authenticated user and catalog operations.
- `pipeline/`: LeetCode GraphQL, `liquidslr` parsing, source normalization, deterministic role/phase tags, videos, and Python/Java verification.
- `frontend/public/`: verified fallback question snapshot, company profiles, role workflows, and quiz content.

## Workflow rules

Progress is `solved / max(1, total - opted_out)`. A user may skip one question, bulk-skip a difficulty tier, restore skipped work, or swap for a verified problem with the same difficulty and overlapping category/topic. Passing all ten submission cases marks the problem solved.

Company readiness uses the documented weighting:

`55% company problem coverage + 30% topic/difficulty transfer + 15% Core CS mastery`.

## Verification gates

1. `python -m unittest discover tests`
2. `npm run build` from `frontend/`
3. `npm test` from `backend/` to cover the preserved Hono modules
4. Manual smoke test: choose each door, open a workflow, skip/restore/swap a problem, run and submit in the studio, and open company chances.
