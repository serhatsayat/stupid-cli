---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T02: Add stupid sessions command and welcome screen

**Slice:** S02 — Interactive TUI mode
**Milestone:** M003

## Description

Create the `stupid sessions` subcommand that lists past interactive sessions, and add a welcome banner to the interactive mode entry. The sessions command uses `SessionManager.list()` with stupid-specific session paths. The welcome screen is a brief chalk-styled message printed before `InteractiveMode.run()` takes over the terminal.

## Steps

1. **Create `packages/cli/src/commands/sessions.ts`**:
   - Import `SessionManager`, `getDefaultSessionDir` from `@mariozechner/pi-coding-agent`
   - Import `chalk` for formatting
   - Define `AGENT_DIR = join(homedir(), '.stupid', 'agent')`
   - Export `async function sessionsCommand(): Promise<void>`
   - Inside: compute `sessionDir = getDefaultSessionDir(process.cwd(), AGENT_DIR)`, call `const sessions = await SessionManager.list(process.cwd(), sessionDir)`
   - If no sessions: print "No sessions found for this directory." and return
   - Otherwise: for each session, print formatted line with:
     - Session ID (dimmed)
     - First message preview (truncated to ~60 chars, cyan)
     - Created timestamp (formatted, dim)
     - Message count (dim)
   - Sort by modified date descending (most recent first)

2. **Wire `stupid sessions` into `packages/cli/src/cli.ts`**:
   - Add new `program.command("sessions")` block
   - `.description("List past interactive sessions")`
   - `.action(async () => { const { sessionsCommand } = await import("./commands/sessions.js"); await sessionsCommand(); })`
   - Use dynamic import to keep startup fast

3. **Add welcome banner in `packages/cli/src/interactive.ts`**:
   - Before `mode.run()`, print a brief welcome message using chalk:
     - `chalk.bold("stupid") + chalk.dim(" — interactive mode")`
     - If continuing: `chalk.dim("Resuming session...")` 
     - If new session: `chalk.dim("New session started")`
   - Keep it to 1-2 lines — `InteractiveMode` will take over the terminal immediately after
   - Print via `console.log()` since `InteractiveMode` hasn't initialized its TUI yet

4. **Verify build and help output**:
   - `npm run build --workspace=packages/cli`
   - `node packages/cli/dist/cli.js --help` shows `sessions`
   - `node packages/cli/dist/cli.js sessions --help` shows description

## Must-Haves

- [ ] `sessions.ts` exists and exports `sessionsCommand()`
- [ ] `SessionManager.list()` called with correct `sessionDir` (derived from `~/.stupid/agent`)
- [ ] `stupid sessions` registered as a subcommand in `cli.ts`
- [ ] Welcome banner printed before `InteractiveMode.run()` in `interactive.ts`
- [ ] Empty sessions handled gracefully (no crash, friendly message)

## Verification

- `npm run build --workspace=packages/cli` succeeds
- `node packages/cli/dist/cli.js --help` output contains `sessions`
- `node packages/cli/dist/cli.js sessions --help` output contains "session" (case-insensitive)
- `grep -q "SessionManager.list" packages/cli/src/commands/sessions.ts` confirms correct API usage

## Inputs

- `packages/cli/src/interactive.ts` — T01's composition root (add welcome banner)
- `packages/cli/src/cli.ts` — T01's modified entry point (add sessions subcommand)
- `packages/cli/src/auth.ts` — S01's auth exports (for AGENT_DIR constant reference pattern)

## Observability Impact

- **New signal:** `stupid sessions` command reads and displays session metadata from `~/.stupid/agent/sessions/<encoded-cwd>/` — agents can inspect this output to verify session persistence
- **New signal:** Welcome banner prints "Resuming session..." or "New session started" to stdout before TUI takeover — visible in logs when interactive mode launches
- **Error visibility:** `sessionsCommand()` catches `SessionManager.list()` failures and prints `"Failed to list sessions: <message>"` to stderr in red
- **Inspection surface:** `node packages/cli/dist/cli.js sessions` can be run non-interactively to verify session file discovery and formatting

## Expected Output

- `packages/cli/src/commands/sessions.ts` — new sessions list command
- `packages/cli/src/cli.ts` — modified with sessions subcommand registration
- `packages/cli/src/interactive.ts` — modified with welcome banner before `mode.run()`
