---
id: S03
parent: M003
milestone: M003
provides:
  - e2e skip gate accepting both ANTHROPIC_API_KEY and ANTHROPIC_OAUTH_TOKEN
  - CLI smoke test validating all 7 subcommands plus default run task argument
requires:
  - slice: S01
    provides: OAuth support via ANTHROPIC_OAUTH_TOKEN
  - slice: S02
    provides: doctor and sessions subcommands
affects: []
key_files:
  - packages/core/src/__tests__/e2e-integration.test.ts
  - packages/cli/src/__tests__/smoke.test.ts
key_decisions: []
patterns_established:
  - e2e gate uses logical OR for multiple credential env vars, never logs their values
  - smoke test command array serves as machine-checkable CLI subcommand inventory
observability_surfaces:
  - vitest skip message confirms gate correctness when no credentials are set
  - smoke test failure immediately surfaces missing or renamed CLI commands
drill_down_paths:
  - .gsd/milestones/M003/slices/S03/tasks/T01-SUMMARY.md
duration: 3m
verification_result: passed
completed_at: 2026-03-22
---

# S03: Auth integration tests and e2e gate fix

**Updated e2e skip gate to accept ANTHROPIC_OAUTH_TOKEN alongside ANTHROPIC_API_KEY and added doctor/sessions to CLI smoke test — 67 tests passing**

## What Happened

Single-task slice with two surgical edits. The e2e integration test `describe.skipIf` gate was changed from checking only `ANTHROPIC_API_KEY` to `ANTHROPIC_API_KEY || ANTHROPIC_OAUTH_TOKEN`, with the comment block updated to document both env vars. The CLI smoke test command array was extended from 5 to 7 subcommands (added `doctor`, `sessions`) and the description updated from "all 6 command names" to "all 8 command names".

## Verification

- grep confirms ANTHROPIC_OAUTH_TOKEN in e2e gate
- grep confirms doctor and sessions in smoke test
- e2e test skips cleanly (1 skipped, no error)
- 67/67 CLI tests pass across 6 test files

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `packages/core/src/__tests__/e2e-integration.test.ts` — updated skip gate and comment block
- `packages/cli/src/__tests__/smoke.test.ts` — added doctor/sessions, updated description

## Forward Intelligence

### What the next slice should know
- 67 tests across 6 files is the current regression baseline for packages/cli
- e2e tests in packages/core skip cleanly without API credentials

### What's fragile
- Smoke test command array must be updated whenever a subcommand is added or removed

### Authoritative diagnostics
- `npx vitest run` in packages/cli runs all 67 tests — any decrease signals regression
