# S02 — Research: Interactive TUI mode

**Date:** 2026-03-22

## Summary

This slice wires Pi SDK's `InteractiveMode` into the `stupid` CLI so that running `stupid` with no arguments (and auth configured) launches a full interactive coding assistant TUI — the same experience as Pi/GSD. S01 already built the auth foundation (`auth.ts`, `onboarding.ts`); S02 connects it to the Pi SDK's `createAgentSession()` → `InteractiveMode.run()` pipeline and adds session management commands.

The Pi SDK provides everything needed via `createAgentSession()` which accepts explicit `authStorage`, `modelRegistry`, `settingsManager`, and `sessionManager` — all of which S01's `auth.ts` already exports. `InteractiveMode` is a self-contained TUI class that takes an `AgentSession` and handles all rendering, input, keybindings, extensions, compaction, and model cycling. The main integration work is: (1) a new `interactive.ts` module that wires `createAgentSession()` with stupid-specific paths, (2) modifying `cli.ts`'s default action to launch interactive mode when auth is available, (3) adding `--continue`/`-c` for session resume, (4) adding a `stupid sessions` command, and (5) a welcome screen.

The pattern is well-established in Pi's own `main.ts` (lines 630–730): create a `SessionManager` → build session options → call `createAgentSession()` → instantiate `InteractiveMode(session, opts)` → call `mode.run()`. This slice replicates that pattern with stupid-specific paths (`~/.stupid/agent` instead of `~/.gsd/agent`).

## Recommendation

Follow Pi SDK's `main.ts` wiring pattern exactly. Create a single `packages/cli/src/interactive.ts` module as the composition root for interactive mode. It should accept a `continueSession` flag and build the full session pipeline. The `cli.ts` default action should: (1) check `shouldRunOnboarding()` → run wizard if needed, (2) call `launchInteractiveMode()`. The `--continue`/`-c` flag controls whether `SessionManager.continueRecent()` or `SessionManager.create()` is used. The `stupid sessions` command uses `SessionManager.list()`. All session data goes under `~/.stupid/agent/sessions/<encoded-cwd>/` via `getDefaultSessionDir(cwd, agentDir)`.

## Implementation Landscape

### Key Files

- `packages/cli/src/cli.ts` — Entry point. Currently shows help when no task and no onboarding needed. Needs: (1) add `--continue`/`-c` option on root program, (2) replace `program.help()` fallback with `launchInteractiveMode()` call when auth is available, (3) add `stupid sessions` subcommand
- `packages/cli/src/interactive.ts` — **NEW**. Composition root for interactive mode. Exports `launchInteractiveMode(options: { continue?: boolean })`. Internally: creates `SessionManager` (via `.continueRecent()` or `.create()`), calls `createAgentSession()` with stupid-specific auth/settings/sessionManager, instantiates `InteractiveMode(session, opts)`, calls `mode.run()`. This is the core of S02.
- `packages/cli/src/auth.ts` — **EXISTS (S01)**. Exports `getAuthStorage()`, `getModelRegistry()`, `getSettingsManager()`, `shouldRunOnboarding()`. All needed by `interactive.ts`.
- `packages/cli/src/onboarding.ts` — **EXISTS (S01)**. The onboarding wizard. Already wired into `cli.ts` for first-run.
- `packages/cli/src/commands/sessions.ts` — **NEW**. The `stupid sessions` command. Uses `SessionManager.list(cwd, sessionDir)` to list past sessions with timestamps and first-message previews.
- `packages/cli/package.json` — Already has `@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui` as deps.
- `packages/cli/tsup.config.ts` — Already externalizes all Pi SDK packages. No changes needed.

### Pi SDK API Surface for Interactive Mode

```typescript
// Session creation
import { createAgentSession, codingTools, InteractiveMode, SessionManager } from "@mariozechner/pi-coding-agent";

// createAgentSession options relevant to stupid:
interface CreateAgentSessionOptions {
  cwd?: string;                    // Default: process.cwd()
  agentDir?: string;               // Default: ~/.gsd/agent — MUST override to ~/.stupid/agent
  authStorage?: AuthStorage;       // From S01's getAuthStorage()
  modelRegistry?: ModelRegistry;   // From S01's getModelRegistry()
  sessionManager?: SessionManager; // Created per-launch
  settingsManager?: SettingsManager; // From S01's getSettingsManager()
  tools?: Tool[];                  // Default: codingTools [read, bash, edit, write]
}

// Session management
SessionManager.create(cwd, sessionDir?)       // New session
SessionManager.continueRecent(cwd, sessionDir?) // Resume most recent
SessionManager.list(cwd, sessionDir?)          // List all sessions for a directory
SessionManager.listAll()                       // List sessions across all directories

// getDefaultSessionDir computes: join(agentDir, "sessions", encodedCwd)
getDefaultSessionDir(cwd, agentDir)            // NOT exported from main index, import from core/session-manager

// InteractiveMode
new InteractiveMode(session: AgentSession, options?: InteractiveModeOptions)
mode.run()  // Main entry — handles all TUI lifecycle
```

### Session Path Architecture

Pi SDK defaults to `~/.gsd/agent/sessions/<encoded-cwd>/`. For stupid:
- `agentDir` = `~/.stupid/agent` (same as S01's `getSettingsManager()` uses)
- Sessions stored at `~/.stupid/agent/sessions/--Users-businessup5-Desktop-myproject--/`
- `getDefaultSessionDir(cwd, agentDir)` computes this path — imported from `@mariozechner/pi-coding-agent` (the `SessionManager` module)
- `createAgentSession({ agentDir: '~/.stupid/agent' })` automatically uses this path when no explicit `sessionManager` is provided. **But** passing explicit `sessionManager` is cleaner since we control session dir.

### Build Order

1. **Create `packages/cli/src/interactive.ts`** — The composition root. Wire `createAgentSession()` with S01's auth exports + `SessionManager`. This is the riskiest piece — if the session options are wrong, InteractiveMode won't launch. Prove this works first.
2. **Modify `cli.ts` default action** — Replace `program.help()` with `launchInteractiveMode()`. Add `--continue`/`-c` option. This connects the entry point to the new interactive module.
3. **Create `packages/cli/src/commands/sessions.ts`** — The `stupid sessions` list command. Uses `SessionManager.list()`. Lower risk — it's read-only display.
4. **Add welcome screen** — A brief intro message shown on first interactive launch (before `InteractiveMode.run()` takes over). Can be a simple chalk banner.
5. **Wire `stupid sessions` into `cli.ts`** — Add the subcommand registration.

### Verification Approach

1. **Unit tests for interactive module**: Mock `createAgentSession` + `InteractiveMode` to verify correct option wiring (authStorage, modelRegistry, settingsManager, sessionManager, agentDir)
2. **Unit tests for sessions command**: Mock `SessionManager.list()` and verify output format
3. **CLI integration tests**: `node dist/cli.js --help` shows `--continue`/`-c` flag and `sessions` command
4. **Manual verification**: `stupid` with API key → interactive TUI launches; `stupid -c` → resumes last session; `stupid sessions` → lists past sessions
5. **Backward compat**: `stupid "task"` still works unchanged (single-shot flow untouched)

## Constraints

- **`agentDir` must be `~/.stupid/agent`** — NOT `~/.gsd/agent` (Pi default). Either pass `agentDir` to `createAgentSession()` or construct `SessionManager` explicitly with the right `sessionDir`. Passing explicit `sessionManager` is safer since it guarantees path isolation.
- **`getDefaultSessionDir` is not re-exported from `@mariozechner/pi-coding-agent` main index** — It's only in `core/session-manager.d.ts`. Import via `SessionManager.create(cwd, sessionDir)` and compute `sessionDir` manually: `join(homedir(), '.stupid', 'agent', 'sessions', encodedCwd)`. Or just pass `agentDir` to `createAgentSession()` and let the SDK compute it.
- **`InteractiveMode` requires a TTY** — Must guard with `process.stdin.isTTY` before launching. Non-TTY (piped input, CI) should fall back to help or error.
- **ESM-only imports** — All new files must use `.js` extensions in imports. All new deps must be in tsup externals.
- **D033: Externalize all runtime deps** — Any new import paths from Pi SDK must be externalized in `tsup.config.ts`. Current config already covers `@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `@mariozechner/pi-tui`.

## Common Pitfalls

- **Not passing `agentDir` to `createAgentSession()`** — Without it, the SDK defaults to `~/.gsd/agent` for resource loading, theme discovery, and prompt templates. Must explicitly pass `join(homedir(), '.stupid', 'agent')`.
- **Forgetting `sessionManager` explicit creation** — If you pass `agentDir` but not `sessionManager`, `createAgentSession()` will create one at `getDefaultSessionDir(cwd, agentDir)`. This should work but is implicit. Safer to create `SessionManager` explicitly and pass it.
- **Session path vs agentDir confusion** — `SessionManager.create(cwd, sessionDir)` takes a `sessionDir` parameter, NOT `agentDir`. The `sessionDir` is `~/.stupid/agent/sessions/<encoded-cwd>/`. The `agentDir` is `~/.stupid/agent`. Don't mix them up.
- **`--continue` flag name collision** — Commander.js reserves `-c` for nothing by default, but double-check there's no existing short alias. Current CLI has no `-c` flag.
- **Welcome screen timing** — Must print welcome BEFORE `mode.run()` takes over the terminal. `InteractiveMode` has its own init sequence that clears the screen in some terminals.

## Open Risks

- **`InteractiveMode` terminal requirements** — The TUI depends on `@mariozechner/pi-tui` which needs terminal capabilities (color, cursor control, alternate screen). Some terminals may have issues. The Pi SDK handles this internally but stupid hasn't tested it.
- **Resource loader initialization** — `createAgentSession()` creates a `DefaultResourceLoader` if none is provided. It reads from `agentDir` for skills, prompts, themes, context files. With `~/.stupid/agent` as agentDir, these directories won't exist initially. The SDK should handle missing dirs gracefully (returns empty), but worth verifying.
- **Extension loading** — Pi SDK auto-discovers extensions from `agentDir`. With a fresh `~/.stupid/agent` there should be no extensions, so this is a no-op. But if a user copies Pi extensions there, they'll load. This is probably desirable.
