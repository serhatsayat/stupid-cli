---
id: T03
parent: S02
milestone: M003
provides:
  - interactive.test.ts with 15 unit tests for launchInteractiveMode() composition wiring
  - sessions.test.ts with 8 unit tests for sessionsCommand() and SessionManager.list() usage
  - cli.test.ts extended with 6 integration tests for --continue, -c, and sessions subcommand
key_files:
  - packages/cli/src/__tests__/interactive.test.ts
  - packages/cli/src/__tests__/sessions.test.ts
  - packages/cli/src/__tests__/cli.test.ts
key_decisions:
  - Used vi.mock() for Pi SDK and auth modules to test composition wiring without TTY or API keys
  - Mocked node:fs to prevent getSessionDir from creating real directories during tests
patterns_established:
  - Console spy pattern: vi.spyOn(console, "log/error") + join mock.calls to capture formatted chalk output in assertions
  - Dynamic import in test helpers: `await import("../interactive.js")` to get module under test after vi.mock hoisting
observability_surfaces:
  - Test count baseline: 67 total tests across 6 files — any decrease signals regression
  - Mock assertion specificity: tests check exact argument shapes (agentDir path, auth exports, codingTools) so wiring changes produce clear diffs
duration: 10m
verification_result: passed
completed_at: 2026-03-22
blocker_discovered: false
---

# T03: Add unit and integration tests for interactive wiring, sessions command, and CLI flags

**Added 29 tests across 3 files verifying interactive.ts composition root wiring, sessions.ts command formatting, and CLI --continue/-c/sessions flags — all 67 project tests pass.**

## What Happened

Created `interactive.test.ts` (15 tests) that mocks Pi SDK's `createAgentSession`, `InteractiveMode`, `SessionManager`, and `codingTools` plus the auth module to verify `launchInteractiveMode()` passes correct arguments without requiring a real TTY or API key. Tests cover:
- `SessionManager.create()` vs `.continueRecent()` path selection based on `{ continue }` flag
- `createAgentSession` receives `agentDir` containing `.stupid/agent`, mocked auth exports, and `codingTools`
- `InteractiveMode` constructor receives the session from `createAgentSession` result
- `mode.run()` is called on the constructed instance
- Welcome banner text ("Resuming session..." vs "New session started")
- Error path: `createAgentSession` failure sets `process.exitCode = 1` and prints structured error to stderr
- Banner NOT printed on `createAgentSession` failure (correct UX)

Created `sessions.test.ts` (8 tests) that mocks `SessionManager.list()` and `getSessionDir` to verify `sessionsCommand()`:
- Calls `SessionManager.list()` with correct cwd and sessionDir containing `.stupid/agent`
- Handles empty session list gracefully (no crash, friendly guidance message)
- Displays session info including ID prefix, first message preview, message count, and truncation of long messages
- Prints structured error to stderr and sets exitCode on `SessionManager.list()` failure

Extended `cli.test.ts` with 6 new integration tests that run against the built binary:
- `--help` contains `--continue` and `-c` flags
- `--help` lists `sessions` subcommand
- `sessions --help` shows session-related description
- All 7 original commands plus `sessions` are present
- Non-TTY invocation shows help text (TTY guard)

## Verification

- `npm run build --workspace=packages/cli && npm test --workspace=packages/cli` — exits 0, all 67 tests pass
- `test -f packages/cli/src/__tests__/interactive.test.ts` — file exists
- `test -f packages/cli/src/__tests__/sessions.test.ts` — file exists
- `grep -c "createAgentSession" packages/cli/src/__tests__/interactive.test.ts` — returns 17 (≥ 2 required)
- All slice-level verification checks pass (help output, test suite, TTY guard, error handler presence)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build --workspace=packages/cli` | 0 | ✅ pass | 9.0s |
| 2 | `npm test --workspace=packages/cli` (67 tests, 6 files) | 0 | ✅ pass | 7.3s |
| 3 | `test -f packages/cli/src/__tests__/interactive.test.ts` | 0 | ✅ pass | <1s |
| 4 | `test -f packages/cli/src/__tests__/sessions.test.ts` | 0 | ✅ pass | <1s |
| 5 | `grep -c "createAgentSession" packages/cli/src/__tests__/interactive.test.ts` → 17 | 0 | ✅ pass | <1s |
| 6 | `node packages/cli/dist/cli.js --help \| grep -E "(--continue\|-c\|sessions)"` | 0 | ✅ pass | <1s |
| 7 | `echo '' \| node packages/cli/dist/cli.js` (TTY guard) | 0 | ✅ pass | <1s |
| 8 | `grep -q "Failed to launch" packages/cli/src/interactive.ts` | 0 | ✅ pass | <1s |

## Diagnostics

- **Test count baseline:** 67 tests across 6 files — `npm test --workspace=packages/cli` output shows the breakdown per file
- **Mock assertion specificity:** Tests check exact shapes (`opts.agentDir` contains `.stupid/agent`, `opts.authStorage` equals mock) so any wiring change in `interactive.ts` or `sessions.ts` triggers a clear test failure with expected/actual diff
- **Console spy coverage:** Both test files capture and assert on stdout/stderr output, verifying user-facing messages (welcome banner, error messages, empty-state guidance)

## Deviations

None — all three test files align with the task plan's specified mock patterns and assertion targets.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/__tests__/interactive.test.ts` — NEW: 15 unit tests for `launchInteractiveMode()` composition wiring
- `packages/cli/src/__tests__/sessions.test.ts` — NEW: 8 unit tests for `sessionsCommand()` and `SessionManager.list()` formatting
- `packages/cli/src/__tests__/cli.test.ts` — MODIFIED: added 6 integration tests for `--continue`, `-c`, `sessions` in CLI help output
- `.gsd/milestones/M003/slices/S02/tasks/T03-PLAN.md` — MODIFIED: added Observability Impact section (pre-flight fix)
- `.gsd/milestones/M003/slices/S02/S02-PLAN.md` — MODIFIED: marked T03 as `[x]`
