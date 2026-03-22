---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T01: Create interactive.ts composition root and wire cli.ts entry point

**Slice:** S02 — Interactive TUI mode
**Milestone:** M003

## Description

Create the `interactive.ts` module that serves as the composition root for Pi SDK's interactive TUI mode. This module wires `createAgentSession()` with S01's auth exports (`getAuthStorage`, `getModelRegistry`, `getSettingsManager`), an explicit `SessionManager`, and `codingTools`. Then modify `cli.ts` to route the no-argument case to interactive mode when auth is available, with a `--continue`/`-c` flag for session resumption.

This is the riskiest task in S02 — if session options are wrong, `InteractiveMode` won't launch. The key constraints are: `agentDir` must be `~/.stupid/agent` (not Pi default `~/.gsd/agent`), the `SessionManager` must be created explicitly with the correct session directory, and `InteractiveMode` requires a TTY.

## Steps

1. **Create `packages/cli/src/interactive.ts`** with:
   - Import `createAgentSession`, `InteractiveMode`, `SessionManager`, `getDefaultSessionDir`, `codingTools` from `@mariozechner/pi-coding-agent`
   - Import `getAuthStorage`, `getModelRegistry`, `getSettingsManager` from `./auth.js`
   - Define `AGENT_DIR = join(homedir(), '.stupid', 'agent')`
   - Export `async function launchInteractiveMode(options: { continue?: boolean }): Promise<void>`
   - Inside: compute `sessionDir = getDefaultSessionDir(process.cwd(), AGENT_DIR)`, create `SessionManager` via `.continueRecent(cwd, sessionDir)` or `.create(cwd, sessionDir)` based on `options.continue`, call `createAgentSession({ cwd: process.cwd(), agentDir: AGENT_DIR, authStorage: getAuthStorage(), modelRegistry: getModelRegistry(), settingsManager: getSettingsManager(), sessionManager, tools: codingTools })`, instantiate `new InteractiveMode(session, { modelFallbackMessage })`, call `await mode.run()`

2. **Modify `packages/cli/src/cli.ts`** root program:
   - Add `.option("--continue, -c", "Continue most recent session")` (note: Commander syntax is `.option("-c, --continue", "...")`)
   - In the default action handler, when `!task`:
     - Keep the existing `shouldRunOnboarding()` check → wizard
     - After onboarding check, add TTY guard: `if (!process.stdin.isTTY) { program.help(); return; }`
     - Otherwise: `const { launchInteractiveMode } = await import("./interactive.js"); await launchInteractiveMode({ continue: opts.continue });`
   - The existing `runCommand(task, opts)` path stays unchanged

3. **Handle `--continue` flag naming** — Commander.js might have issues with `--continue` as a reserved word. Use the option name carefully: `.option("-c, --continue", "Continue most recent session")`. Commander stores it as `opts.continue`. Verify this works.

4. **Add error handling** in `interactive.ts` — wrap the `createAgentSession` + `mode.run()` in try/catch, print user-friendly error with `chalk.red()` and set `process.exitCode = 1`.

5. **Verify build** — run `npm run build --workspace=packages/cli` and check `node packages/cli/dist/cli.js --help` shows `--continue` and `-c`.

## Must-Haves

- [ ] `interactive.ts` exists and exports `launchInteractiveMode()`
- [ ] `createAgentSession()` called with `agentDir: ~/.stupid/agent`, S01's auth exports, explicit `SessionManager`, and `codingTools`
- [ ] `--continue`/`-c` flag registered on root program
- [ ] TTY guard prevents interactive mode in non-TTY environments
- [ ] `stupid "task"` single-shot flow remains unchanged
- [ ] ESM imports use `.js` extensions

## Verification

- `npm run build --workspace=packages/cli` succeeds with no type errors
- `node packages/cli/dist/cli.js --help` output contains `--continue` and `-c`
- `node packages/cli/dist/cli.js --help` still shows all existing commands (auto, status, recall, init, cost, doctor)
- `grep -q "agentDir" packages/cli/src/interactive.ts && grep -q ".stupid" packages/cli/src/interactive.ts` confirms stupid-specific paths

## Inputs

- `packages/cli/src/cli.ts` — existing entry point to modify
- `packages/cli/src/auth.ts` — S01's auth exports (`getAuthStorage`, `getModelRegistry`, `getSettingsManager`, `shouldRunOnboarding`)
- `packages/cli/src/onboarding.ts` — S01's onboarding wizard (already wired into cli.ts)
- `packages/cli/tsup.config.ts` — build config (verify externals cover all imports)

## Expected Output

- `packages/cli/src/interactive.ts` — new composition root for interactive mode
- `packages/cli/src/cli.ts` — modified with `--continue` flag and interactive mode routing

## Observability Impact

- **New signal: session directory creation.** `getSessionDir()` creates `~/.stupid/agent/sessions/<encoded-cwd>/` on first invocation. Presence of this directory confirms interactive mode was attempted for a given project.
- **Error path: structured stderr output.** `launchInteractiveMode()` wraps `createAgentSession()` + `InteractiveMode.run()` in try/catch. Failures emit `chalk.red("Failed to launch interactive mode: <message>")` to stderr. Verbose mode (--verbose, VERBOSE, DEBUG env vars) additionally logs the full stack trace.
- **TTY guard diagnostic.** Non-TTY invocations (`echo '' | stupid`) fall through to `program.help()` before `interactive.ts` is even imported, preventing crash from `InteractiveMode` expecting a terminal.
- **Inspection:** `ls ~/.stupid/agent/sessions/` shows all projects that have started interactive sessions. Each subdirectory contains JSONL session files managed by Pi SDK's `SessionManager`.
