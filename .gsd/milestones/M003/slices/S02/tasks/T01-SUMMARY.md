---
id: T01
parent: S02
milestone: M003
provides:
  - interactive.ts composition root exporting launchInteractiveMode()
  - --continue/-c flag on root CLI program
  - TTY guard for non-interactive environments
  - interactive mode routing in cli.ts entry point
key_files:
  - packages/cli/src/interactive.ts
  - packages/cli/src/cli.ts
key_decisions:
  - Replicated getDefaultSessionDir path-encoding locally since Pi SDK does not export it from public API
  - Used dynamic import for interactive.ts to keep `stupid "task"` single-shot path fast
patterns_established:
  - Session directory path encoding follows Pi SDK convention: `--<cwd-with-slashes-replaced>--` under AGENT_DIR/sessions/
  - Error handling in composition roots: try/catch with chalk.red stderr + verbose stack trace via env vars
observability_surfaces:
  - ~/.stupid/agent/sessions/<encoded-cwd>/ directory creation on first interactive launch
  - stderr "Failed to launch interactive mode: <message>" on createAgentSession errors
  - Non-TTY invocations silently fall back to help text (no crash)
duration: 15m
verification_result: passed
completed_at: 2026-03-22
blocker_discovered: false
---

# T01: Create interactive.ts composition root and wire cli.ts entry point

**Created interactive.ts composition root wiring Pi SDK's createAgentSession + InteractiveMode to stupid-specific auth, and added --continue/-c flag with TTY guard to cli.ts entry point.**

## What Happened

Created `packages/cli/src/interactive.ts` as the composition root for Pi SDK's interactive TUI mode. The module exports `launchInteractiveMode({ continue?, verbose? })` which:
1. Computes the session directory under `~/.stupid/agent/sessions/<encoded-cwd>/`
2. Creates a `SessionManager` via `.create()` or `.continueRecent()` based on the `--continue` flag
3. Calls `createAgentSession()` with stupid-specific `agentDir`, S01's auth exports (`getAuthStorage`, `getModelRegistry`, `getSettingsManager`), explicit `SessionManager`, and `codingTools`
4. Instantiates `InteractiveMode(session, { modelFallbackMessage })` and calls `mode.run()`
5. Wraps everything in try/catch with chalk.red error output and optional verbose stack traces

Modified `packages/cli/src/cli.ts` to add `-c, --continue` option on the root program and route the no-argument case through: onboarding check → TTY guard → interactive mode launch (via dynamic import). The existing `stupid "task"` single-shot flow remains completely unchanged.

Key adaptation: `getDefaultSessionDir` is not exported from Pi SDK's public API, so I replicated its simple path-encoding logic (`--<cwd-with-slashes-replaced>--`) as a local `getSessionDir()` function.

## Verification

- `npm run build --workspace=packages/cli` — builds with zero errors
- `node packages/cli/dist/cli.js --help` — shows `--continue` and `-c` flags
- All 6 existing commands (auto, status, recall, init, cost, doctor) still appear in help
- `npm test --workspace=packages/cli` — all 38 existing tests pass
- `grep -q "agentDir" ... && grep -q ".stupid" ...` — confirms stupid-specific paths in interactive.ts
- Non-TTY test: `echo '' | node packages/cli/dist/cli.js` shows help text (TTY guard works)
- ESM import extensions verified: all local imports use `.js` extensions

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run build --workspace=packages/cli` | 0 | ✅ pass | 4.0s |
| 2 | `node packages/cli/dist/cli.js --help \| grep -q "continue"` | 0 | ✅ pass | <1s |
| 3 | `node packages/cli/dist/cli.js --help \| grep -q "\-c"` | 0 | ✅ pass | <1s |
| 4 | `npm test --workspace=packages/cli` (38 tests) | 0 | ✅ pass | 5.3s |
| 5 | `grep -q "agentDir" ... && grep -q ".stupid" ...` | 0 | ✅ pass | <1s |
| 6 | `echo '' \| node packages/cli/dist/cli.js` (TTY guard) | 0 | ✅ pass | <1s |
| 7 | `grep -q "Failed to launch" packages/cli/src/interactive.ts` | 0 | ✅ pass | <1s |

## Diagnostics

- **Session directory:** `ls ~/.stupid/agent/sessions/` shows all projects that have started interactive sessions
- **Error visibility:** Failed launches print `"Failed to launch interactive mode: <message>"` to stderr in red
- **Verbose mode:** Set `--verbose`, `VERBOSE=1`, or `DEBUG=1` to get full stack traces on error
- **TTY guard:** Non-TTY invocations fall back to `program.help()` before interactive.ts is even imported

## Deviations

- **`getDefaultSessionDir` not available from public API** — The plan assumed importing `getDefaultSessionDir` from `@mariozechner/pi-coding-agent`. Inspection revealed it's not re-exported from the package's main entry point (only defined in internal `session-manager.js`). Replicated the simple path-encoding logic as a local `getSessionDir()` function with identical behavior. This is a minor factual correction, not a plan-breaking issue.

## Known Issues

None.

## Files Created/Modified

- `packages/cli/src/interactive.ts` — NEW: composition root for interactive TUI mode, exports `launchInteractiveMode()` and `getSessionDir()`
- `packages/cli/src/cli.ts` — MODIFIED: added `-c, --continue` option, TTY guard, and interactive mode routing for no-argument case
- `.gsd/milestones/M003/slices/S02/S02-PLAN.md` — MODIFIED: added diagnostic/failure-path verification steps
- `.gsd/milestones/M003/slices/S02/tasks/T01-PLAN.md` — MODIFIED: added Observability Impact section
