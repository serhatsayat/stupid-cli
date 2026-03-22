# S03: Auth integration tests and e2e gate fix

**Goal:** The e2e integration test skip gate accepts both `ANTHROPIC_API_KEY` and `ANTHROPIC_OAUTH_TOKEN`, the CLI smoke test validates all current commands, and existing auth/CLI test suites continue passing.
**Demo:** `npx vitest run packages/core/src/__tests__/e2e-integration.test.ts packages/cli/src/__tests__/smoke.test.ts packages/cli/src/__tests__/auth.test.ts` — all pass green.

## Must-Haves

- e2e skip gate on line 113 of `e2e-integration.test.ts` checks `ANTHROPIC_API_KEY || ANTHROPIC_OAUTH_TOKEN`
- Comment block above the gate mentions both env vars
- `smoke.test.ts` asserts presence of `doctor` and `sessions` commands in `--help` output
- `smoke.test.ts` description string reflects the actual command count (8: 7 subcommands + default run/task)
- All existing tests in `auth.test.ts` and `cli.test.ts` still pass (no regressions)

## Verification

- `cd packages/core && npx vitest run src/__tests__/e2e-integration.test.ts` — skips cleanly (no API key) with correct gate logic
- `cd packages/cli && npx vitest run` — all CLI tests pass including updated smoke test
- `grep -q "ANTHROPIC_OAUTH_TOKEN" packages/core/src/__tests__/e2e-integration.test.ts` — exits 0
- `grep -q "doctor" packages/cli/src/__tests__/smoke.test.ts && grep -q "sessions" packages/cli/src/__tests__/smoke.test.ts` — exits 0

## Observability / Diagnostics

- **E2e gate skip reason:** When skipped, vitest prints `1 skipped` — confirms the gate evaluated correctly. When either `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` is set, the suite runs instead.
- **Smoke test assertion list:** The command array in `smoke.test.ts` is the source of truth for expected CLI subcommands. A failing smoke test immediately surfaces missing or renamed commands.
- **CI signal:** All 67 CLI tests passing confirms no regression from auth/TUI additions. The e2e test skipping cleanly (not erroring) confirms gate logic correctness.
- **Redaction:** Neither env var value is ever logged or included in assertion messages — only existence is checked.

## Tasks

- [x] **T01: Fix e2e skip gate and update CLI smoke test assertions** `est:15m`
  - Why: The e2e gate only checks `ANTHROPIC_API_KEY` but S01 added OAuth support via `ANTHROPIC_OAUTH_TOKEN`. The smoke test is stale — it checks 5 of 7 subcommands, missing `doctor` and `sessions`. Both need updating.
  - Files: `packages/core/src/__tests__/e2e-integration.test.ts`, `packages/cli/src/__tests__/smoke.test.ts`
  - Do: (1) In `e2e-integration.test.ts`, change line 113 from `describe.skipIf(!process.env.ANTHROPIC_API_KEY)` to `describe.skipIf(!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_OAUTH_TOKEN)`. Update the comment block (lines 106-111) to mention both env vars. (2) In `smoke.test.ts`, add `"doctor"` and `"sessions"` to the command name array and update the test description from "all 6 command names" to "all 8 command names" (7 subcommands + task argument for default run).
  - Verify: `npx vitest run packages/core/src/__tests__/e2e-integration.test.ts packages/cli/src/__tests__/smoke.test.ts packages/cli/src/__tests__/auth.test.ts packages/cli/src/__tests__/cli.test.ts`
  - Done when: All test suites pass, grep confirms `ANTHROPIC_OAUTH_TOKEN` in e2e gate and `doctor`/`sessions` in smoke test

## Files Likely Touched

- `packages/core/src/__tests__/e2e-integration.test.ts`
- `packages/cli/src/__tests__/smoke.test.ts`
