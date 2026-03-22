# S05: Doctor System (Basic)

**Goal:** `stupid doctor` checks `.stupid/` state directory health and reports pass/fail per check.
**Demo:** Run `stupid doctor` — it prints ✅/⚠️/❌ for lock file integrity, state.json consistency, SQLite DB integrity, stale worktree detection, and config validity. Exit code 0 if all pass, 1 if any fail.

## Must-Haves

- `Doctor` class with `check()` returning typed `DoctorReport` with per-check pass/fail/warn
- 5 checks: lock file, state.json, SQLite DBs, stale worktrees, config validity
- Constructor takes `projectRoot: string` (not `StupidConfig`) — must work even with invalid config
- `stupid doctor` CLI command with colored output and correct exit code
- Unit tests covering all 5 checks in clean, corrupt, and missing states
- R025 requirement addressed (basic health checks)

## Verification

- `cd packages/core && npx vitest run src/__tests__/doctor.test.ts` — all pass (≥15 assertions)
- `npm run build && npm run typecheck` — clean across all packages
- `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` — all pass including new `doctor --help` test
- `npx vitest run` — all 484+ existing tests still pass, new tests added

## Tasks

- [ ] **T01: Implement Doctor core class with types and unit tests** `est:45m`
  - Why: Produces the `Doctor` class that S06 integration test consumes and that the CLI command wraps. Types must exist first; tests prove all 5 checks work.
  - Files: `packages/core/src/types/index.ts`, `packages/core/src/infrastructure/doctor.ts`, `packages/core/src/index.ts`, `packages/core/src/__tests__/doctor.test.ts`
  - Do: (1) Add `DoctorCheck` and `DoctorReport` interfaces to `types/index.ts`. (2) Create `Doctor` class in `infrastructure/doctor.ts` with 5 private check methods and one public `check()` that returns `DoctorReport`. Constructor takes `projectRoot: string`. For lock file: parse JSON, verify pid/startedAt/heartbeat, detect dead PIDs. For state.json: parse JSON, verify plan/progress/slices structure. For SQLite DBs: open MEMORY.db and routing.db with `readonly: true`, run `PRAGMA integrity_check`. For worktrees: call `WorktreeManager.listWorktrees()`, flag `stupid/` branches with missing directories. For config: use `parseConfigFile()` + `deepMerge()` + `StupidConfigSchema.safeParse()`. (3) Export `Doctor`, `DoctorCheck`, `DoctorReport`, and `parseConfigFile` from `packages/core/src/index.ts`. (4) Write comprehensive unit tests using `mkdtempSync`/`rmSync` pattern from crash-recovery.test.ts — cover clean state, missing .stupid/, corrupt lock, stale lock (dead PID), corrupt state.json, invalid state structure, corrupt SQLite, valid SQLite, stale worktrees (mock listWorktrees), invalid config YAML, missing config.
  - Verify: `cd packages/core && npx vitest run src/__tests__/doctor.test.ts` — ≥15 tests pass; `npm run typecheck` clean
  - Done when: `Doctor.check()` returns correct DoctorReport for all 5 check categories, all tests green, types exported

- [ ] **T02: Wire doctor CLI command and add CLI test** `est:20m`
  - Why: Exposes Doctor to users via `stupid doctor` command. Without CLI wiring, the core class is invisible.
  - Files: `packages/cli/src/commands/doctor.ts`, `packages/cli/src/cli.ts`, `packages/cli/src/__tests__/cli.test.ts`
  - Do: (1) Create `doctorCommand()` in `packages/cli/src/commands/doctor.ts` following `statusCommand` pattern — try `loadConfig()` for projectRoot with `process.cwd()` fallback, instantiate `Doctor(projectRoot)`, call `check()`, print each check with ✅/⚠️/❌ icons via chalk, exit code 1 if any check has status "fail". (2) Register in `cli.ts`: import `doctorCommand`, add `program.command("doctor").description("Check .stupid/ directory health").action(...)`. (3) Add `doctor --help` test to `cli.test.ts`. (4) Update the existing `--help lists all N commands` test to include "doctor" and bump the command count.
  - Verify: `npm run build && cd packages/cli && npx vitest run src/__tests__/cli.test.ts` — all tests pass including doctor; `node packages/cli/dist/cli.js doctor --help` shows description
  - Done when: `stupid doctor` prints health report with colored output, exit code reflects check results, CLI tests pass

## Files Likely Touched

- `packages/core/src/types/index.ts`
- `packages/core/src/infrastructure/doctor.ts`
- `packages/core/src/index.ts`
- `packages/core/src/__tests__/doctor.test.ts`
- `packages/cli/src/commands/doctor.ts`
- `packages/cli/src/cli.ts`
- `packages/cli/src/__tests__/cli.test.ts`
