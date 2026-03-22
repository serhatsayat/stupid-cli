---
estimated_steps: 4
estimated_files: 3
skills_used:
  - test
---

# T03: Add unit and integration tests for interactive wiring, sessions command, and CLI flags

**Slice:** S02 — Interactive TUI mode
**Milestone:** M003

## Description

Add comprehensive tests that verify the interactive mode wiring, sessions command, and CLI flag additions without requiring a real TTY or API key. This task proves the composition is correct via mocks and verifies backward compatibility via CLI help output tests.

## Steps

1. **Create `packages/cli/src/__tests__/interactive.test.ts`**:
   - Mock `@mariozechner/pi-coding-agent` via `vi.mock()`:
     - `createAgentSession` → returns `{ session: mockSession, extensionsResult: {}, modelFallbackMessage: undefined }`
     - `InteractiveMode` → mock class with `run()` that resolves
     - `SessionManager` → mock static methods `.create()`, `.continueRecent()` returning a mock instance
     - `getDefaultSessionDir` → returns a predictable path string
     - `codingTools` → `[]`
   - Mock `./auth.js` to return mock `authStorage`, `modelRegistry`, `settingsManager`
   - Test: `launchInteractiveMode({ continue: false })` calls `SessionManager.create()` with correct cwd and sessionDir containing `.stupid/agent`
   - Test: `launchInteractiveMode({ continue: true })` calls `SessionManager.continueRecent()` instead
   - Test: `createAgentSession` receives `agentDir` containing `.stupid/agent`, the mocked auth exports, and `codingTools`
   - Test: `InteractiveMode` constructor receives the session from `createAgentSession` result
   - Test: `mode.run()` is called

2. **Create `packages/cli/src/__tests__/sessions.test.ts`**:
   - Mock `@mariozechner/pi-coding-agent` via `vi.mock()`:
     - `SessionManager.list` → returns fake sessions array: `[{ id: "abc", path: "/tmp/s", cwd: "/proj", created: new Date(), modified: new Date(), messageCount: 5, firstMessage: "fix the bug", allMessagesText: "..." }]`
     - `getDefaultSessionDir` → returns predictable path
   - Mock `chalk` or test against raw output (chalk may not colorize in test env)
   - Test: `sessionsCommand()` calls `SessionManager.list()` with cwd and sessionDir containing `.stupid/agent`
   - Test: when `SessionManager.list()` returns empty array, no crash occurs
   - Test: output includes session info (first message preview, message count) — capture stdout via spy

3. **Extend `packages/cli/src/__tests__/cli.test.ts`** with new tests:
   - Test: `--help` output contains `--continue` and `-c`
   - Test: `--help` output contains `sessions`
   - Test: `sessions --help` shows session-related description
   - These are CLI integration tests that run against the built binary (`dist/cli.js`)

4. **Run full test suite**:
   - `npm run build --workspace=packages/cli`
   - `npm test --workspace=packages/cli`
   - All existing tests must still pass (backward compat)
   - New tests must pass

## Must-Haves

- [ ] `interactive.test.ts` exists with assertions on `createAgentSession` options (agentDir, authStorage, modelRegistry, settingsManager, sessionManager, tools)
- [ ] `interactive.test.ts` tests both `continue: false` and `continue: true` paths
- [ ] `sessions.test.ts` exists with assertions on `SessionManager.list()` call and output formatting
- [ ] `sessions.test.ts` handles empty sessions list
- [ ] `cli.test.ts` extended with `--continue`, `-c`, and `sessions` checks
- [ ] All tests pass: `npm test --workspace=packages/cli`

## Verification

- `npm run build --workspace=packages/cli && npm test --workspace=packages/cli` exits 0
- `test -f packages/cli/src/__tests__/interactive.test.ts` confirms file exists
- `test -f packages/cli/src/__tests__/sessions.test.ts` confirms file exists
- `grep -c "createAgentSession" packages/cli/src/__tests__/interactive.test.ts` returns >= 2 (multiple assertion points)

## Inputs

- `packages/cli/src/interactive.ts` — T01's composition root (module under test)
- `packages/cli/src/commands/sessions.ts` — T02's sessions command (module under test)
- `packages/cli/src/cli.ts` — T01+T02's modified entry point (tested via built binary)
- `packages/cli/src/__tests__/cli.test.ts` — existing CLI tests to extend
- `packages/cli/src/__tests__/auth.test.ts` — reference for mock patterns used in this project

## Expected Output

- `packages/cli/src/__tests__/interactive.test.ts` — new test file for interactive module
- `packages/cli/src/__tests__/sessions.test.ts` — new test file for sessions command
- `packages/cli/src/__tests__/cli.test.ts` — extended with new flag/command tests

## Observability Impact

- **Test count signal:** `npm test --workspace=packages/cli` reports total test count — any decrease from 67 indicates regression
- **Mock coverage:** Tests verify exact arguments passed to `createAgentSession`, `SessionManager.create/continueRecent/list`, and `InteractiveMode` — changes to wiring in source files will break specific test assertions with clear diffs
- **CLI help output tests:** Any removal of `--continue`, `-c`, or `sessions` from the CLI interface will be caught by `cli.test.ts` integration tests
- **Failure path coverage:** Tests verify `process.exitCode = 1` and stderr error messages on `createAgentSession` / `SessionManager.list()` failures
