---
id: T02
parent: S02
milestone: M003
provides:
  - sessions.ts command exporting sessionsCommand()
  - stupid sessions subcommand wired into cli.ts
  - Welcome banner in interactive.ts before InteractiveMode.run()
key_files:
  - packages/cli/src/commands/sessions.ts
  - packages/cli/src/cli.ts
  - packages/cli/src/interactive.ts
key_decisions:
  - Reused getSessionDir from interactive.ts instead of duplicating path-encoding logic in sessions.ts
  - Welcome banner placed after createAgentSession() succeeds but before mode.run() — avoids printing banner on auth failures
patterns_established:
  - Subcommand pattern: dynamic import in .action() handler to keep startup fast (same pattern as interactive mode)
  - Session listing format: ID (dim, 8-char prefix), first message (cyan, 60-char truncated), relative timestamp, message count
observability_surfaces:
  - `stupid sessions` lists all session files with metadata from ~/.stupid/agent/sessions/<encoded-cwd>/
  - Welcome banner prints "Resuming session..." or "New session started" to stdout before TUI takeover
  - sessionsCommand() catches SessionManager.list() failures and prints "Failed to list sessions: <message>" to stderr
  - Empty session directory prints friendly guidance ("No sessions found... Start one with: stupid")
duration: 10m
verification_result: passed
completed_at: 2026-03-22
blocker_discovered: false
---

# T02: Add stupid sessions command and welcome screen

**Added `stupid sessions` subcommand listing past interactive sessions via SessionManager.list(), and welcome banner in interactive.ts printed before InteractiveMode.run().**

## What Happened

Created `packages/cli/src/commands/sessions.ts` exporting `sessionsCommand()` which:
1. Computes the session directory using `getSessionDir()` from interactive.ts (same path-encoding)
2. Calls `SessionManager.list(cwd, sessionDir)` to read session files
3. Handles empty results with a friendly message and guidance to start a session
4. Sorts sessions by modified date descending (most recent first)
5. Prints each session with: truncated ID (dim), first message preview (cyan, 60 chars), relative timestamp, message count
6. Wraps `SessionManager.list()` in try/catch with chalk.red error output

Wired `stupid sessions` into `cli.ts` as a new `.command("sessions")` with dynamic import to keep startup fast (same pattern used for the interactive mode routing).

Added a welcome banner in `interactive.ts` after `createAgentSession()` succeeds but before `mode.run()`:
- Always prints `"stupid — interactive mode"` (bold name + dim descriptor)
- Prints `"Resuming session..."` when `--continue` is set, otherwise `"New session started"`
- Followed by a blank line before InteractiveMode takes over the terminal

## Verification

- `npm run build --workspace=packages/cli` — builds with zero errors, new `sessions` chunk visible in output
- `node packages/cli/dist/cli.js --help` — shows `sessions`, `--continue`, and `-c` in help output
- `node packages/cli/dist/cli.js sessions --help` — shows "List past interactive sessions" description
- `npm test --workspace=packages/cli` — all 38 existing tests pass
- `grep -q "SessionManager.list" packages/cli/src/commands/sessions.ts` — confirms correct API usage
- `echo '' | node packages/cli/dist/cli.js` — non-TTY invocation still shows help text (TTY guard preserved)
- `grep -q "Failed to launch" packages/cli/src/interactive.ts` — error handler still present

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build --workspace=packages/cli` | 0 | ✅ pass | 3.6s |
| 2 | `node packages/cli/dist/cli.js --help \| grep -q "sessions"` | 0 | ✅ pass | <1s |
| 3 | `node packages/cli/dist/cli.js --help \| grep -q "continue"` | 0 | ✅ pass | <1s |
| 4 | `node packages/cli/dist/cli.js --help \| grep -q "\-c"` | 0 | ✅ pass | <1s |
| 5 | `node packages/cli/dist/cli.js sessions --help \| grep -qi "session"` | 0 | ✅ pass | <1s |
| 6 | `npm test --workspace=packages/cli` (38 tests) | 0 | ✅ pass | 5.3s |
| 7 | `grep -q "SessionManager.list" packages/cli/src/commands/sessions.ts` | 0 | ✅ pass | <1s |
| 8 | `echo '' \| node packages/cli/dist/cli.js` (TTY guard) | 0 | ✅ pass | <1s |
| 9 | `grep -q "Failed to launch" packages/cli/src/interactive.ts` | 0 | ✅ pass | <1s |

## Diagnostics

- **Session listing:** `node packages/cli/dist/cli.js sessions` can be run non-interactively to verify session file discovery and formatting
- **Empty state:** Directories with no sessions print friendly guidance message (no crash)
- **Error visibility:** `sessionsCommand()` catches failures from `SessionManager.list()` and prints structured error to stderr
- **Welcome banner:** Visible in stdout/logs when interactive mode launches — distinguishes new vs resumed sessions

## Deviations

- **Welcome banner placed after `createAgentSession()`** — The plan said "before `mode.run()`" which I followed, but I specifically placed it after `createAgentSession()` succeeds rather than before the try block. This ensures the banner isn't printed when session creation fails (auth errors, etc.), which is better UX.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/commands/sessions.ts` — NEW: sessions list command exporting `sessionsCommand()`
- `packages/cli/src/cli.ts` — MODIFIED: added `sessions` subcommand with dynamic import
- `packages/cli/src/interactive.ts` — MODIFIED: added welcome banner before `mode.run()`
- `.gsd/milestones/M003/slices/S02/tasks/T02-PLAN.md` — MODIFIED: added Observability Impact section
