# S02: Interactive TUI mode

**Goal:** When `stupid` is invoked with no task argument and auth is configured, launch a full interactive TUI coding assistant session via Pi SDK's `InteractiveMode`.
**Demo:** `stupid` (no args, with API key set) → interactive TUI launches with full coding tools; `stupid -c` → resumes most recent session; `stupid sessions` → lists past sessions with timestamps.

## Must-Haves

- `launchInteractiveMode()` composition root in `interactive.ts` that wires `createAgentSession()` with S01's auth exports (`getAuthStorage`, `getModelRegistry`, `getSettingsManager`), `SessionManager`, and `codingTools`
- `agentDir` set to `~/.stupid/agent` (NOT `~/.gsd/agent`) in all session/resource paths
- `--continue`/`-c` flag on root program that triggers `SessionManager.continueRecent()` instead of `SessionManager.create()`
- `stupid sessions` subcommand listing past sessions via `SessionManager.list()`
- TTY guard: non-TTY environments fall back to help output instead of crashing
- Welcome screen shown before `InteractiveMode.run()` takes over terminal
- Backward compatibility: `stupid "task"` single-shot flow unchanged

## Proof Level

- This slice proves: integration
- Real runtime required: yes (InteractiveMode requires TTY — manual verification for TUI launch)
- Human/UAT required: yes (TUI visual verification)

## Verification

- `npm run build --workspace=packages/cli && node packages/cli/dist/cli.js --help` shows `--continue`, `-c`, and `sessions`
- `npm test --workspace=packages/cli` passes (includes new tests for interactive module and sessions command)
- `packages/cli/src/__tests__/interactive.test.ts` — unit tests verifying `launchInteractiveMode()` passes correct options to `createAgentSession()` and `InteractiveMode`
- `packages/cli/src/__tests__/sessions.test.ts` — unit tests verifying `sessionsCommand()` calls `SessionManager.list()` and formats output
- `packages/cli/src/__tests__/cli.test.ts` — extended CLI integration tests verifying `--continue` flag and `sessions` subcommand appear in help
- `echo '' | node packages/cli/dist/cli.js 2>&1` — non-TTY invocation shows help text (TTY guard diagnostic)
- `grep -q "Failed to launch" packages/cli/src/interactive.ts` — error handler surfaces structured failure message to stderr

## Observability / Diagnostics

- Runtime signals: `InteractiveMode` manages all TUI lifecycle internally (Pi SDK handles rendering, compaction, model cycling); welcome screen printed to stdout before TUI takeover
- Inspection surfaces: `~/.stupid/agent/sessions/<encoded-cwd>/` directory contains session files; `stupid sessions` lists them
- Failure visibility: TTY guard catches non-interactive terminals; `createAgentSession()` errors surface as stderr messages with stack traces in verbose mode
- Redaction constraints: API keys and OAuth tokens never logged — only provider names (enforced by Pi SDK's AuthStorage)

## Integration Closure

- Upstream surfaces consumed: `packages/cli/src/auth.ts` (`getAuthStorage`, `getModelRegistry`, `getSettingsManager`, `shouldRunOnboarding`), `packages/cli/src/onboarding.ts` (`runOnboardingWizard`)
- New wiring introduced in this slice: `packages/cli/src/interactive.ts` (composition root), `packages/cli/src/commands/sessions.ts` (subcommand), modified `packages/cli/src/cli.ts` (entry point routing)
- What remains before the milestone is truly usable end-to-end: S03 (auth integration tests and e2e gate fix)

## Tasks

- [x] **T01: Create interactive.ts composition root and wire cli.ts entry point** `est:1h`
  - Why: This is the core of S02 — connects Pi SDK's `createAgentSession()` + `InteractiveMode` to the stupid CLI via S01's auth exports. Without this, `stupid` can't launch an interactive session.
  - Files: `packages/cli/src/interactive.ts`, `packages/cli/src/cli.ts`
  - Do: Create `interactive.ts` exporting `launchInteractiveMode({ continue?: boolean })`. Wire `createAgentSession()` with `getAuthStorage()`, `getModelRegistry()`, `getSettingsManager()`, explicit `SessionManager` (using `getDefaultSessionDir(cwd, agentDir)` with `agentDir = ~/.stupid/agent`), and `codingTools`. Instantiate `InteractiveMode(session, { modelFallbackMessage })` and call `mode.run()`. In `cli.ts`: add `--continue`/`-c` option on root program, replace `program.help()` fallback with `launchInteractiveMode()` call when auth is available (i.e., `!shouldRunOnboarding()`), add TTY guard (`process.stdin.isTTY`).
  - Verify: `npm run build --workspace=packages/cli && node packages/cli/dist/cli.js --help | grep -q "continue"`
  - Done when: Build succeeds, `--help` shows `--continue`/`-c` flag, `interactive.ts` exists with correct `createAgentSession` wiring

- [x] **T02: Add stupid sessions command and welcome screen** `est:45m`
  - Why: Completes the user-facing session management surface (`stupid sessions` for listing, welcome screen for first-launch UX).
  - Files: `packages/cli/src/commands/sessions.ts`, `packages/cli/src/cli.ts`, `packages/cli/src/interactive.ts`
  - Do: Create `sessions.ts` exporting `sessionsCommand()` that calls `SessionManager.list(cwd, sessionDir)` with `sessionDir` computed from `getDefaultSessionDir(cwd, agentDir)` where `agentDir = ~/.stupid/agent`. Format output with chalk: session ID, first message preview (truncated), created/modified timestamps, message count. Wire `stupid sessions` subcommand into `cli.ts`. Add a welcome banner in `interactive.ts` printed to stdout before `mode.run()` — brief chalk-styled intro ("Welcome to stupid — interactive mode" + session info).
  - Verify: `npm run build --workspace=packages/cli && node packages/cli/dist/cli.js sessions --help | grep -qi "session"`
  - Done when: `stupid sessions` subcommand registered, `sessions --help` shows description, welcome banner code exists in `interactive.ts`

- [x] **T03: Add unit and integration tests for interactive wiring, sessions command, and CLI flags** `est:1h`
  - Why: Proves the wiring is correct without requiring a real TTY or API key. Verifies backward compatibility and new flags/commands.
  - Files: `packages/cli/src/__tests__/interactive.test.ts`, `packages/cli/src/__tests__/sessions.test.ts`, `packages/cli/src/__tests__/cli.test.ts`
  - Do: (1) Create `interactive.test.ts`: mock `createAgentSession` and `InteractiveMode` via `vi.mock()`, call `launchInteractiveMode()`, assert `createAgentSession` was called with `agentDir` containing `.stupid/agent`, `authStorage`/`modelRegistry`/`settingsManager` from auth module, and `codingTools` tools. Assert `InteractiveMode` constructor received the session and `mode.run()` was called. Test `--continue` path uses `SessionManager.continueRecent()`. (2) Create `sessions.test.ts`: mock `SessionManager.list()` to return fake session data, call `sessionsCommand()`, verify output formatting. (3) Extend `cli.test.ts`: add tests for `--help` containing `--continue`, `-c`, and `sessions` command.
  - Verify: `npm run build --workspace=packages/cli && npm test --workspace=packages/cli`
  - Done when: All tests pass, `interactive.test.ts` and `sessions.test.ts` exist with real assertions

## Files Likely Touched

- `packages/cli/src/interactive.ts` (NEW — composition root)
- `packages/cli/src/cli.ts` (MODIFY — entry point routing, --continue flag, sessions subcommand)
- `packages/cli/src/commands/sessions.ts` (NEW — sessions list command)
- `packages/cli/src/__tests__/interactive.test.ts` (NEW — unit tests)
- `packages/cli/src/__tests__/sessions.test.ts` (NEW — unit tests)
- `packages/cli/src/__tests__/cli.test.ts` (MODIFY — extended integration tests)
