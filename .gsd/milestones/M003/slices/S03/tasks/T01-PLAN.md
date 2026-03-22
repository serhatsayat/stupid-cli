---
estimated_steps: 4
estimated_files: 2
skills_used:
  - test
---

# T01: Fix e2e skip gate and update CLI smoke test assertions

**Slice:** S03 — Auth integration tests and e2e gate fix
**Milestone:** M003

## Description

Two surgical edits to fix stale test assertions after S01 (auth) and S02 (interactive TUI) added new capabilities:

1. The e2e integration test gate in `packages/core/src/__tests__/e2e-integration.test.ts` only checks `ANTHROPIC_API_KEY` to decide whether to run. Since S01 added OAuth support, the gate must also accept `ANTHROPIC_OAUTH_TOKEN`.

2. The CLI smoke test in `packages/cli/src/__tests__/smoke.test.ts` checks for 5 command names but the CLI now has 7 subcommands (auto, status, recall, init, cost, doctor, sessions) plus the default run command's `task` argument. `doctor` and `sessions` are missing from the assertion.

## Steps

1. Open `packages/core/src/__tests__/e2e-integration.test.ts`. On line 113, change:
   ```ts
   describe.skipIf(!process.env.ANTHROPIC_API_KEY)(
   ```
   to:
   ```ts
   describe.skipIf(!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_OAUTH_TOKEN)(
   ```
2. In the same file, update the comment block on lines 106-111 to mention both `ANTHROPIC_API_KEY` and `ANTHROPIC_OAUTH_TOKEN` as accepted gate variables.
3. Open `packages/cli/src/__tests__/smoke.test.ts`. In the first test:
   - Change the description from `"--help output includes all 6 command names"` to `"--help output includes all 8 command names"`
   - Add `"doctor"` and `"sessions"` to the command array: `["auto", "status", "recall", "init", "cost", "doctor", "sessions"]`
4. Run the full test suite to verify no regressions.

## Must-Haves

- [ ] `e2e-integration.test.ts` skip gate checks both `ANTHROPIC_API_KEY` and `ANTHROPIC_OAUTH_TOKEN`
- [ ] Comment block above the gate references both env vars
- [ ] `smoke.test.ts` checks for `doctor` and `sessions` in --help output
- [ ] `smoke.test.ts` description says "8 command names" not "6"
- [ ] All existing tests pass without modification

## Verification

- `cd packages/core && npx vitest run src/__tests__/e2e-integration.test.ts` — test skips cleanly (gate code is correct)
- `cd packages/cli && npx vitest run` — all 4 smoke tests + auth + cli tests pass
- `grep -q "ANTHROPIC_OAUTH_TOKEN" packages/core/src/__tests__/e2e-integration.test.ts` — exits 0
- `grep -q "doctor" packages/cli/src/__tests__/smoke.test.ts` — exits 0
- `grep -q "sessions" packages/cli/src/__tests__/smoke.test.ts` — exits 0

## Observability Impact

- **Skip gate signal:** When neither `ANTHROPIC_API_KEY` nor `ANTHROPIC_OAUTH_TOKEN` is set, vitest reports `1 skipped` for the e2e suite. This is the expected CI output; a future agent can confirm gate correctness by checking for this skip message.
- **Smoke test as command inventory:** The command array in the first smoke test serves as a machine-checkable inventory of CLI subcommands. Adding or removing a command from the CLI without updating this array causes an immediate, descriptive test failure.
- **No new runtime signals:** This task modifies test files only — no production code, no new logs or metrics.

## Inputs

- `packages/core/src/__tests__/e2e-integration.test.ts` — existing e2e test file with stale skip gate on line 113
- `packages/cli/src/__tests__/smoke.test.ts` — existing smoke test with stale command list (missing doctor, sessions)

## Expected Output

- `packages/core/src/__tests__/e2e-integration.test.ts` — updated skip gate accepting both API key and OAuth token
- `packages/cli/src/__tests__/smoke.test.ts` — updated command assertions including doctor and sessions
