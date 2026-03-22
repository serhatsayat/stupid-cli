---
estimated_steps: 4
estimated_files: 2
skills_used:
  - test
---

# T02: Implement RoutingHistory SQLite module with tests

**Slice:** S03 — Complexity Classifier & Routing Enhancements
**Milestone:** M002

## Description

Creates the SQLite-backed routing history module that records which model was used for each phase+tier combination and whether it succeeded. Provides `getBestModel()` which queries historical success rates to recommend a model, with cold-start protection (≥3 samples required). This delivers R032 (adaptive learning from routing outcomes). All methods are synchronous (better-sqlite3 is sync), matching the `IRoutingHistory` interface from T01.

## Steps

1. **Create `packages/core/src/orchestrator/routing-history.ts`:**
   - Import `Database` from `better-sqlite3`, `mkdirSync` from `node:fs`, `join` from `node:path`
   - Import `ComplexityTier`, `RoutingRecord`, `ProviderErrorType` from `../types/index.js`
   - Import `IRoutingHistory` from `./interfaces.js`
   - Class `RoutingHistory implements IRoutingHistory`:
     - Constructor takes `stateDir: string` (the `.stupid/` directory path)
     - `mkdirSync(stateDir, { recursive: true })`
     - Open `better-sqlite3` database at `join(stateDir, 'routing.db')`
     - Enable WAL mode: `this.db.pragma('journal_mode = WAL')`
     - Create schema:
       ```sql
       CREATE TABLE IF NOT EXISTS routing_history (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         phase TEXT NOT NULL,
         complexityTier TEXT NOT NULL,
         model TEXT NOT NULL,
         success INTEGER NOT NULL,
         tokensUsed INTEGER DEFAULT 0,
         costUsd REAL DEFAULT 0,
         durationMs INTEGER DEFAULT 0,
         errorType TEXT,
         timestamp TEXT NOT NULL
       );
       CREATE INDEX IF NOT EXISTS idx_phase_tier ON routing_history(phase, complexityTier);
       ```
   - `record(entry: Omit<RoutingRecord, 'id'>): void` — INSERT via prepared statement. Synchronous.
   - `getBestModel(phase: string, tier: ComplexityTier): string | null` — **Synchronous.** Query:
     ```sql
     SELECT model, COUNT(*) as total, SUM(success) as successes, AVG(costUsd) as avgCost
     FROM routing_history WHERE phase = ? AND complexityTier = ?
     GROUP BY model HAVING total >= 3
     ORDER BY (CAST(successes AS REAL) / total) DESC, avgCost ASC LIMIT 1
     ```
     Return `model` from first row, or `null` if no rows (cold start).
   - `getStats(): { total: number; byPhase: Record<string, number> }` — Synchronous. Query total count and per-phase counts.
   - `close(): void` — `this.db.close()`

2. **Create `packages/core/src/__tests__/routing-history.test.ts`:**
   - Follow the temp-directory pattern from `project-memory.test.ts`:
     ```typescript
     import { mkdtempSync, rmSync } from 'node:fs';
     import { join } from 'node:path';
     import { tmpdir } from 'node:os';
     // Create temp dir in beforeEach, rm -rf in afterEach
     ```
   - Test cases (10+ tests):
     - **Record and retrieve**: Record 3+ entries for same phase+tier, `getBestModel` returns the highest-success-rate model
     - **Cold start**: `getBestModel` with <3 samples returns null
     - **Exactly 3 samples threshold**: 3 entries for one model → returns it; 2 entries → returns null
     - **Multiple models compared**: Record entries for haiku (2/3 success) and sonnet (3/3 success) — `getBestModel` returns sonnet
     - **Tie-breaking by cost**: Two models with same success rate → return lower `avgCost` one
     - **Error type recording**: Record entry with `errorType: ProviderErrorType.RateLimit`, verify it's stored and doesn't crash
     - **Stats**: Record entries, `getStats` returns correct total and byPhase counts
     - **Empty DB stats**: `getStats` on fresh DB returns `{ total: 0, byPhase: {} }`
     - **Close lifecycle**: Close DB, verify instance can be created again on same path
     - **Multiple phase+tier combinations**: Different phases don't interfere with each other's `getBestModel` results

3. **Run tests:**
   - `cd packages/core && npx vitest run src/__tests__/routing-history.test.ts`

4. **Verify types:**
   - `cd packages/core && npx tsc --noEmit`

## Must-Haves

- [ ] `RoutingHistory` class implements `IRoutingHistory` interface (from T01)
- [ ] SQLite DB created at `stateDir/routing.db` with WAL mode
- [ ] `record()` inserts routing outcomes synchronously
- [ ] `getBestModel()` is synchronous, returns highest-success-rate model with ≥3 samples, `null` on cold start
- [ ] `getBestModel()` breaks ties by lower average cost
- [ ] `getStats()` is synchronous, returns total count and per-phase breakdown
- [ ] `close()` closes the database connection
- [ ] 10+ passing test cases
- [ ] `npx tsc --noEmit` clean

## Verification

- `cd packages/core && npx vitest run src/__tests__/routing-history.test.ts` — all tests pass
- `cd packages/core && npx tsc --noEmit` — no type errors

## Inputs

- `packages/core/src/types/index.ts` — uses `ComplexityTier`, `RoutingRecord`, `ProviderErrorType` types (added in T01)
- `packages/core/src/orchestrator/interfaces.ts` — implements `IRoutingHistory` interface (added in T01)
- `packages/core/src/memory/project-memory.ts` — reference for better-sqlite3 + WAL + mkdirSync pattern

## Observability Impact

- **New persistence surface:** `.stupid/routing.db` is a standard SQLite file, inspectable with any SQLite client (e.g., `sqlite3 .stupid/routing.db "SELECT * FROM routing_history"`)
- **Diagnostic method:** `RoutingHistory.getStats()` returns `{ total, byPhase }` — record counts for quick health checks without raw SQL
- **Failure visibility:** `errorType` column captures `ProviderErrorType` values on failed routing outcomes, enabling post-hoc analysis of rate limits, overloads, auth errors, etc.
- **Cold-start signal:** `getBestModel()` returns `null` when insufficient data exists (< 3 samples), clearly indicating the system hasn't learned yet for that phase+tier combination

## Expected Output

- `packages/core/src/orchestrator/routing-history.ts` — new file, RoutingHistory class with sync SQLite storage
- `packages/core/src/__tests__/routing-history.test.ts` — new file, 10+ passing tests
