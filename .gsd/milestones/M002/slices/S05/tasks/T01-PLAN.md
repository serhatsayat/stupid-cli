---
estimated_steps: 4
estimated_files: 4
skills_used:
  - test
---

# T01: Implement Doctor core class with types and unit tests

**Slice:** S05 — Doctor System (Basic)
**Milestone:** M002

## Description

Create the `Doctor` class that performs 5 health checks on `.stupid/` state directory and returns a typed `DoctorReport`. Add the required types to the shared type file, implement all checks as private methods, export everything from the core package index, and write comprehensive unit tests.

The Doctor constructor takes `projectRoot: string` — NOT `StupidConfig`. This is a deliberate design choice (D037): Doctor must work even when config is invalid, since config validity is one of the things it checks.

## Steps

1. **Add types to `packages/core/src/types/index.ts`** — Append these interfaces at the end of the file:
   ```typescript
   // ─── Doctor Types ─────────────────────────────────────────────
   export interface DoctorCheck {
     name: string;
     status: "pass" | "fail" | "warn";
     message: string;
     details?: string;
   }

   export interface DoctorReport {
     checks: DoctorCheck[];
     passed: boolean;   // true if zero "fail" checks
     timestamp: string;
   }
   ```

2. **Create `packages/core/src/infrastructure/doctor.ts`** — Implement the Doctor class:
   - Constructor: `constructor(projectRoot: string)` — stores projectRoot, derives `stateDir = join(projectRoot, '.stupid')`
   - Public method: `check(): DoctorReport` — calls all 5 private check methods, assembles DoctorReport with `passed = checks.every(c => c.status !== 'fail')` and ISO timestamp
   - `private checkLockFile(): DoctorCheck` — If `.stupid/auto.lock` doesn't exist → pass ("No lock file"). If exists → parse JSON, verify `pid`, `startedAt`, `heartbeat` fields are present. Check if PID is alive via `process.kill(pid, 0)`. Dead PID → warn ("Stale lock"). Invalid JSON → fail.
   - `private checkStateFile(): DoctorCheck` — If `.stupid/state.json` doesn't exist → pass ("No active session"). If exists → parse JSON, verify `plan` and `progress` keys exist, verify `plan.slices` is an array, verify `progress.sessionId` is a string. Missing keys → fail. Invalid JSON → fail.
   - `private checkDatabases(): DoctorCheck[]` — For each of `MEMORY.db` and `routing.db` in `.stupid/`: if file doesn't exist → pass ("Not created yet"). If exists → open with `new Database(path, { readonly: true })`, run `PRAGMA integrity_check`, verify result is `"ok"`. Catch errors → fail. Returns array of 1-2 checks.
   - `private checkWorktrees(): DoctorCheck` — Call `WorktreeManager.listWorktrees(this.projectRoot)`. Filter entries whose branch starts with `stupid/`. For each, check if the worktree path exists on disk via `existsSync()`. Missing paths → warn with details. No stale entries → pass.
   - `private checkConfig(): DoctorCheck` — Import `parseConfigFile`, `deepMerge`, `DEFAULT_CONFIG`, `StupidConfigSchema` from the config module (use relative import `../config/config.js`). Try `parseConfigFile(join(stateDir, 'config.yml'))`, then `deepMerge(DEFAULT_CONFIG, parsed)`, then `StupidConfigSchema.safeParse(merged)`. If safeParse fails → fail with Zod error messages. If config.yml doesn't exist → pass ("Using defaults"). If parse succeeds → pass.
   - Important: import `Database` from `better-sqlite3`, `WorktreeManager` from `./worktree-manager.js`, config utilities from `../config/config.js`
   - Use `{ readonly: true }` when opening SQLite DBs to avoid side effects

3. **Export from `packages/core/src/index.ts`** — Add these exports:
   - In the Types section: add `DoctorCheck` and `DoctorReport` to the type exports
   - In the Infrastructure section: add `export { Doctor } from "./infrastructure/doctor.js";`
   - In the Config section: add `parseConfigFile` to the existing config exports (needed by Doctor and useful for S06)

4. **Write unit tests in `packages/core/src/__tests__/doctor.test.ts`** — Follow the `crash-recovery.test.ts` pattern with `mkdtempSync`/`rmSync`:
   - Setup: `beforeEach` creates tmpDir, `afterEach` removes it
   - Helper: `makeStupidDir(tmpDir)` creates `.stupid/` subdirectory
   - Test groups:
     - **Clean state**: No `.stupid/` → all checks pass
     - **Lock file checks**: No lock → pass; valid lock with current PID → pass; invalid JSON → fail; dead PID (use PID 999999) → warn with stale detection
     - **State file checks**: No state.json → pass; valid state → pass; invalid JSON → fail; missing `plan` key → fail; missing `progress.sessionId` → fail
     - **Database checks**: No DB files → pass; valid DB (create with `new Database(path)` then `db.pragma('integrity_check')`) → pass; corrupt DB (write "garbage" bytes to file) → fail
     - **Worktree checks**: No worktrees → pass; mock `WorktreeManager.listWorktrees` using `vi.spyOn` to return entries with missing paths → warn
     - **Config checks**: No config.yml → pass; valid YAML → pass; invalid YAML (write `{{{invalid` to file) → fail; schema-violating config (write valid YAML with bad values) → fail
     - **Integration**: Full report with mixed pass/fail → `report.passed` is false; all pass → `report.passed` is true
   - Target: ≥15 test cases

## Must-Haves

- [ ] `DoctorCheck` and `DoctorReport` types added to `packages/core/src/types/index.ts`
- [ ] `Doctor` class in `packages/core/src/infrastructure/doctor.ts` with all 5 checks
- [ ] Constructor takes `projectRoot: string`, not `StupidConfig`
- [ ] SQLite DBs opened with `{ readonly: true }`
- [ ] Doctor and types exported from `packages/core/src/index.ts`
- [ ] `parseConfigFile` exported from `packages/core/src/index.ts`
- [ ] ≥15 unit tests covering all 5 checks in clean, corrupt, and missing states
- [ ] All existing 484 tests still pass
- [ ] `npm run typecheck` clean

## Verification

- `cd packages/core && npx vitest run src/__tests__/doctor.test.ts` — ≥15 tests pass
- `npm run typecheck` — clean, no errors
- `npx vitest run` — all 484+ existing tests still pass

## Inputs

- `packages/core/src/types/index.ts` — existing types file to extend with DoctorCheck/DoctorReport
- `packages/core/src/index.ts` — existing barrel export file to extend
- `packages/core/src/infrastructure/crash-recovery.ts` — pattern reference for lock file format and PID checking
- `packages/core/src/infrastructure/worktree-manager.ts` — `listWorktrees()` static method for stale worktree detection
- `packages/core/src/config/config.ts` — `parseConfigFile()`, `deepMerge()`, `DEFAULT_CONFIG`, `StupidConfigSchema` for config check
- `packages/core/src/__tests__/crash-recovery.test.ts` — test pattern reference (mkdtempSync/rmSync)

## Expected Output

- `packages/core/src/types/index.ts` — extended with DoctorCheck and DoctorReport interfaces
- `packages/core/src/infrastructure/doctor.ts` — new file with Doctor class
- `packages/core/src/index.ts` — extended with Doctor, DoctorCheck, DoctorReport, parseConfigFile exports
- `packages/core/src/__tests__/doctor.test.ts` — new test file with ≥15 tests

## Observability Impact

- **Signals introduced:** `DoctorReport` is the first structured health-check surface in the codebase. Each `DoctorCheck` has `name`, `status`, `message`, `details` — future agents can call `new Doctor(root).check()` programmatically to assess project state.
- **Inspection:** A future agent inspects this task's output by instantiating `Doctor` and reading the `checks` array. No config required — just a `projectRoot` string.
- **Failure visibility:** Corrupt lock files, invalid JSON state, SQLite integrity failures, stale worktrees, and Zod config validation errors all produce `DoctorCheck` entries with `status: "fail"` or `"warn"` and human-readable `details`.
