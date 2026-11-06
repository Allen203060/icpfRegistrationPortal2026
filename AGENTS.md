# Codex Project Instructions — ICPF Camp Registration System

These instructions apply to Codex in this repository. For shared project details, also read `.agents/rules/agentrules.md`; for current ownership, contracts, and module status, read `SHARED_MEMORY.md` before starting project work. If those documents conflict, follow the user's latest instruction and explain any material conflict.

## Project purpose and current shape

ICPF Camp Registration supports attendee registration, team allocation, gender-separated room assignment within capacity, and printable badges and rosters. The repository is migrating from legacy Python batch scripts to a MERN application. The migration is in progress: the backend foundation exists; do not describe the planned services or frontend as implemented until their files and behavior exist.

The current registry marks M1, M5, and M6 `COMPLETED`; M2 and M3 are in `REVIEW` pending module verification; M4 is `BLOCKED` because its PDF/Excel dependencies could not be installed in the current environment. The backend foundation and frontend source are present. Treat `SHARED_MEMORY.md` as the live status source and verify it against the current worktree; this snapshot can become stale.

## Coordination with Antigravity

- Before editing, check `SHARED_MEMORY.md` for active leases, module boundaries, and interface contracts. Do not edit a module leased by another agent.
- Acquire and record a lease before editing a module that is available. Release it and update module status only after the agreed work and verification are complete.
- For work outside a listed module, such as repository-wide docs or agent instructions, avoid changing leased module files and keep the change focused.
- Keep cross-module contracts stable. Propose contract changes in `SHARED_MEMORY.md` before implementing dependent changes.

## Engineering rules

- Inspect existing code and preserve the legacy scripts unless the user asks to replace them.
- Follow the documented stack for the migration: Node.js/Express, MongoDB/Mongoose, and React/Vite. Do not add frameworks that the project does not require.
- Treat team names, team colors, room inventories, and capacities as camp configuration, not reusable hardcoded constants.
- Preserve the domain invariants: room gender segregation, hard room capacity, and the documented allocation priority. Handle impossible allocations explicitly instead of silently violating constraints.
- Validate user-supplied data at system boundaries. Keep secrets and participant personal information out of logs and committed files; `backend/.env` is ignored.
- Prefer focused changes. Avoid unrelated refactors, dependencies, and generated files.

## Verification and documentation

- Run relevant checks when requested or needed to establish that a change works. Report exactly what was run and its result; do not claim unrun checks passed.
- Mark a module complete only when its agreed scope is implemented and its required verification has passed. Distinguish registry-reported completion from independently verified behavior.
- Update `SOUL.md` for meaningful architecture or feature milestones, `CHALLENGES.md` for substantial bugs or trade-offs, and `README.md` when setup or user-visible project behavior changes. Do not create routine journal entries for ordinary edits.
- In replies, summarize changed files, behavior, assumptions, and verification concisely. Include detailed code walkthroughs only when requested or useful.

## Current module snapshot

Check `SHARED_MEMORY.md` for current state before acting. The observed snapshot is:

| Module | Scope | Registry status | Worktree evidence |
|---|---|---|---|
| M1 | Backend core and database foundation | `COMPLETED` | Config, models, server, package manifest, and `verifyCore.js` exist. |
| M2 | Heuristic allocator | `REVIEW` | Allocator service exists; module tests have not been run. |
| M3 | REST controllers and routes | `REVIEW` | Participant/config endpoints are implemented and mounted; API tests have not been run. |
| M4 | PDF and Excel services | `BLOCKED` | PDFKit and ExcelJS installation stalled; export services are absent. |
| M5 | Check-in and badge-print frontend | `COMPLETED` | Check-in, badge preview, API client, and print styles exist. |
| M6 | Admin dashboard and analytics frontend | `COMPLETED` | Dashboard and admin components exist. |

<!-- trail:start -->
## Trail — repo context graph

This repo is indexed in `.trail/cache/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `trail map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `trail ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `trail grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `trail skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `trail callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `.trail/cache/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `trail ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `trail build` (deterministic,
no API key, $0).
<!-- trail:end -->
