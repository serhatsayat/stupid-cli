# S03 — Research

**Date:** 2026-03-22

## Summary

S03 is a small, low-risk testing slice. The primary deliverable is a one-line fix to the e2e integration test skip gate in `packages/core/src/__tests__/e2e-integration.test.ts` — it currently only checks `ANTHROPIC_API_KEY`, but must also accept `ANTHROPIC_OAUTH_TOKEN` now that OAuth auth exists (added in S01). Secondary deliverables are verifying auth unit test coverage and ensuring `stupid --help` still shows all commands correctly.

The good news: S01 already wrote comprehensive auth unit tests in `packages/cli/src/__tests__/auth.test.ts` covering `shouldRunOnboarding()` (5 cases), `getAuthStorage()` (3 cases), `getModelRegistry()` (1 case), `getSettingsManager()` (1 case), and CLI integration (2 cases). The `cli.test.ts` already verifies `sessions`, `--continue`, `-c` flags. The remaining gap is the e2e gate and a stale command count in `smoke.test.ts` (says "6 command names" but there are now 8: auto, status, recall, init, cost, doctor, sessions + default run).

## Recommendation

Three surgical file edits, no new files needed:

1. Fix the e2e skip gate (line 113 of `e2e-integration.test.ts`) — add `|| ANTHROPIC_OAUTH_TOKEN` to the condition
2. Update `smoke.test.ts` to check all current commands including `doctor` and `sessions`
3. Run both test suites to verify everything passes

## Implementation Landscape

### Key Files

- `packages/core/src/__tests__/e2e-integration.test.ts` — **THE primary fix.** Line 113 has `describe.skipIf(!process.env.ANTHROPIC_API_KEY)` which must become `describe.skipIf(!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_OAUTH_TOKEN)`. The comment block on lines 106-111 must also be updated to mention both env vars.
- `packages/cli/src/__tests__/smoke.test.ts` — Stale: says "all 6 command names" but only checks `["auto", "status", "recall", "init", "cost"]`. Missing `doctor` and `sessions`. Should be updated to check all 7 subcommands.
- `packages/cli/src/__tests__/auth.test.ts` — **Already comprehensive.** 12 tests covering `shouldRunOnboarding`, `getAuthStorage`, `getModelRegistry`, `getSettingsManager`, onboarding module exports, and CLI --help/--version integration. No changes needed unless planner wants to add edge cases.
- `packages/cli/src/__tests__/cli.test.ts` — **Already comprehensive.** 18 tests covering all commands, options, and S02 interactive flags. No changes needed.
- `packages/cli/src/auth.ts` — Source module under test. Exports `shouldRunOnboarding`, `getAuthStorage`, `getModelRegistry`, `getSettingsManager`, `resetAuthStorage`. Already fully tested.
- `packages/cli/src/cli.ts` — CLI entry point. Has 8 commands (default run + auto/status/recall/init/cost/doctor/sessions). `--help` output is the verification target.

### Build Order

1. **Fix e2e skip gate** — This is the only functional bug (Success Criterion #7). Single line change + comment update.
2. **Update smoke.test.ts** — Stale assertion. Update command list to include `doctor` and `sessions`.
3. **Verify** — Run tests to confirm.

### Verification Approach

```bash
# 1. Core e2e gate: verify the gate accepts OAUTH_TOKEN
cd packages/core && npx vitest run src/__tests__/e2e-integration.test.ts
# (Should skip cleanly — no API key in CI — but the gate code is correct)

# 2. CLI tests: smoke + auth + cli
cd packages/cli && npx vitest run

# 3. Spot-check --help still works
node packages/cli/dist/cli.js --help
# Should show: auto, status, recall, init, cost, doctor, sessions, task, --dry-run, --profile, --continue, -c
```
