---
id: T01
parent: S03
milestone: M003
provides:
  - e2e skip gate accepts both ANTHROPIC_API_KEY and ANTHROPIC_OAUTH_TOKEN
  - CLI smoke test validates all 7 subcommands plus default run task argument
key_files:
  - packages/core/src/__tests__/e2e-integration.test.ts
  - packages/cli/src/__tests__/smoke.test.ts
key_decisions: []
patterns_established:
  - e2e gate uses logical OR for multiple credential env vars, never logs their values
observability_surfaces:
  - vitest skip message confirms gate correctness when no credentials are set
  - smoke test command array serves as machine-checkable CLI subcommand inventory
duration: 3m
verification_result: passed
completed_at: 2026-03-22
blocker_discovered: false
---

# T01: Fix e2e skip gate and update CLI smoke test assertions

**Updated e2e skip gate to accept ANTHROPIC_OAUTH_TOKEN alongside ANTHROPIC_API_KEY, and added doctor/sessions to CLI smoke test command inventory**

## What Happened

Two surgical edits to align test assertions with capabilities added in S01 (OAuth auth) and S02 (interactive TUI):

1. In `e2e-integration.test.ts`, the `describe.skipIf` gate was changed from checking only `ANTHROPIC_API_KEY` to checking `ANTHROPIC_API_KEY || ANTHROPIC_OAUTH_TOKEN`. The comment block above the gate was updated to document both env vars and their redaction policy.

2. In `smoke.test.ts`, the first test's command array was extended from `["auto", "status", "recall", "init", "cost"]` to include `"doctor"` and `"sessions"`, and the description was updated from "all 6 command names" to "all 8 command names" (7 subcommands + the `task` argument for the default run command).

## Verification

- `grep -q "ANTHROPIC_OAUTH_TOKEN" packages/core/src/__tests__/e2e-integration.test.ts` — exits 0, confirming OAuth token is in the gate
- `grep -q "doctor" packages/cli/src/__tests__/smoke.test.ts && grep -q "sessions" packages/cli/src/__tests__/smoke.test.ts` — exits 0, confirming both commands present
- `cd packages/core && npx vitest run src/__tests__/e2e-integration.test.ts` — 1 test skipped (correct, no API key set)
- `cd packages/cli && npx vitest run` — 6 test files, 67 tests passed, 0 failed

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -q "ANTHROPIC_OAUTH_TOKEN" packages/core/src/__tests__/e2e-integration.test.ts` | 0 | ✅ pass | <1s |
| 2 | `grep -q "doctor" packages/cli/src/__tests__/smoke.test.ts && grep -q "sessions" packages/cli/src/__tests__/smoke.test.ts` | 0 | ✅ pass | <1s |
| 3 | `cd packages/core && npx vitest run src/__tests__/e2e-integration.test.ts` | 0 | ✅ pass (1 skipped) | 8s |
| 4 | `cd packages/cli && npx vitest run` | 0 | ✅ pass (67/67) | 8s |

## Diagnostics

- **E2e gate inspection:** Run `npx vitest run src/__tests__/e2e-integration.test.ts` without credentials — should show `1 skipped`. Set either `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` to run the actual e2e suite.
- **Smoke test as inventory:** The command array in `smoke.test.ts` line 12 is the authoritative list of expected CLI subcommands. Any future command addition must update this array.

## Deviations

None — edits matched the plan exactly.

## Known Issues

None.

## Files Created/Modified

- `packages/core/src/__tests__/e2e-integration.test.ts` — Updated skip gate to accept `ANTHROPIC_OAUTH_TOKEN` and revised comment block
- `packages/cli/src/__tests__/smoke.test.ts` — Added `doctor` and `sessions` to command array, updated test description to "all 8 command names"
- `.gsd/milestones/M003/slices/S03/S03-PLAN.md` — Added Observability / Diagnostics section, marked T01 done
- `.gsd/milestones/M003/slices/S03/tasks/T01-PLAN.md` — Added Observability Impact section
