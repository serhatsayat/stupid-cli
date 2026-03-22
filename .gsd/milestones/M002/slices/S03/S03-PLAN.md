# S03: Complexity Classifier & Routing Enhancements

**Goal:** TaskRouter classifies tasks into light/standard/heavy complexity tiers and selects models accordingly. Routing history stored in SQLite tracks outcomes for future adaptive learning.
**Demo:** Unit tests prove: (1) ComplexityClassifier correctly categorizes "rename variable" as light, "redesign database schema across all modules" as heavy, and "add a utility function" as standard; (2) RoutingHistory records outcomes in SQLite, returns best model after ≥3 samples, returns null on cold start; (3) Enhanced TaskRouter downgrades light tasks (sonnet→haiku), upgrades heavy tasks (sonnet→opus when ceiling allows), respects history suggestions, and all 23 existing tests still pass unchanged.

## Must-Haves

- `ComplexityTier` type (`"light" | "standard" | "heavy"`) in `types/index.ts`
- `RoutingRecord` type with phase, tier, model, success, tokensUsed, costUsd, durationMs, errorType, timestamp
- `IComplexityClassifier` and `IRoutingHistory` interfaces in `interfaces.ts`
- `OrchestratorContext` extended with optional `complexityClassifier` and `routingHistory` fields
- `ComplexityClassifier.classify()` — signal-based heuristic scoring (keywords, length, multi-step indicators)
- `RoutingHistory` class — SQLite-backed with `record()`, `getBestModel()`, `getStats()`, `close()`
- Enhanced `TaskRouter` — optional classifier+history deps in constructor, complexity-aware `selectModel()` overload
- All 23 existing TaskRouter tests pass without modification
- 25+ new tests across classifier, history, and enhanced router
- All new modules exported from `packages/core/src/index.ts`

## Proof Level

- This slice proves: contract (complexity classification + routing history + enhanced routing, all mock/unit-tested)
- Real runtime required: no (real API integration exercised in S06)
- Human/UAT required: no

## Verification

- `cd packages/core && npx vitest run src/__tests__/complexity-classifier.test.ts` — all tests pass
- `cd packages/core && npx vitest run src/__tests__/routing-history.test.ts` — all tests pass
- `cd packages/core && npx vitest run src/__tests__/task-router.test.ts` — all 23 original + new enhanced tests pass
- `cd packages/core && npx tsc --noEmit` — no type errors
- `node -e "import('@stupid/core').then(m => { console.log(typeof m.ComplexityClassifier, typeof m.RoutingHistory) })"` — prints "function function"

## Observability / Diagnostics

- Runtime signals: `RoutingHistory.record()` stores per-phase outcomes; `getBestModel()` queries historical success rates
- Inspection surfaces: `.stupid/routing.db` is a standard SQLite file; `RoutingHistory.getStats()` returns record counts per phase+tier
- Failure visibility: `RoutingRecord.errorType` captures `ProviderErrorType` on failures for post-hoc analysis

## Integration Closure

- Upstream surfaces consumed: `ProviderErrorType` from S01 (in `types/index.ts`) — used in `RoutingRecord.errorType`
- New wiring introduced in this slice: none — modules built and tested in isolation; wiring into Orchestrator/SliceRunner happens in S06
- What remains before the milestone is truly usable end-to-end: S04 (worktree), S05 (doctor), S06 (integration assembly)

## Tasks

- [x] **T01: Add types, interfaces, and ComplexityClassifier with tests** `est:45m`
  - Why: Establishes the type foundation (ComplexityTier, RoutingRecord, interfaces) that T02 and T03 depend on, and delivers the complexity classifier — the core heuristic that R031 requires. Combining types+classifier avoids a types-only task that produces no testable output.
  - Files: `packages/core/src/types/index.ts`, `packages/core/src/orchestrator/interfaces.ts`, `packages/core/src/orchestrator/complexity-classifier.ts`, `packages/core/src/__tests__/complexity-classifier.test.ts`
  - Do: Add `ComplexityTier` type and `RoutingRecord` type to types/index.ts. Add `IComplexityClassifier` and `IRoutingHistory` interfaces to interfaces.ts. Extend `OrchestratorContext` with two optional fields. Create `complexity-classifier.ts` with signal-based scoring: light signals (short desc <50 words, single-file keywords like "rename", "fix typo"), heavy signals (long desc >150 words, multi-file keywords like "refactor", "redesign", architecture keywords), standard = default. Write comprehensive tests covering light/standard/heavy classification, edge cases (empty string, very long text), and TaskSpec-based input.
  - Verify: `cd packages/core && npx vitest run src/__tests__/complexity-classifier.test.ts` — all tests pass; `npx tsc --noEmit` clean
  - Done when: ComplexityClassifier correctly categorizes known light/heavy/standard tasks in 10+ test cases, types compile, interfaces defined

- [ ] **T02: Implement RoutingHistory SQLite module with tests** `est:45m`
  - Why: Delivers R032 — routing history with adaptive learning. Records which model was used per phase+tier, tracks success rates, and recommends the best model based on empirical data. The 3-sample cold-start protection prevents premature optimization.
  - Files: `packages/core/src/orchestrator/routing-history.ts`, `packages/core/src/__tests__/routing-history.test.ts`
  - Do: Create `routing-history.ts` implementing `IRoutingHistory`. Use `better-sqlite3` with WAL mode (same pattern as `ProjectMemory`). Schema: `routing_history` table with id, phase, complexityTier, model, success, tokensUsed, costUsd, durationMs, errorType, timestamp. Index on (phase, complexityTier). `getBestModel()`: query success rate per model for phase+tier, require ≥3 samples (cold start protection), return highest success rate model (break ties by lower cost), return null if insufficient data. `getStats()`: return record counts. `close()`: close DB. Write tests using temp directories (mkdtemp pattern from project-memory.test.ts). Test cases: record + retrieve, cold start returns null, multiple models compared, tie-breaking, close lifecycle, error type recording.
  - Verify: `cd packages/core && npx vitest run src/__tests__/routing-history.test.ts` — all tests pass; `npx tsc --noEmit` clean
  - Done when: RoutingHistory stores and queries routing outcomes correctly in 10+ test cases, cold start returns null, getBestModel returns highest-success-rate model

- [ ] **T03: Enhance TaskRouter with complexity routing and wire exports** `est:45m`
  - Why: Integrates classifier and history into TaskRouter (R013 extension), completing the slice. Enhanced selectModel uses complexity tier to upgrade/downgrade model selection and checks history for empirical guidance. Backward compatibility with 23 existing tests is critical — the constructor and selectModel changes must be additive-only with optional params.
  - Files: `packages/core/src/orchestrator/task-router.ts`, `packages/core/src/__tests__/task-router.test.ts`, `packages/core/src/index.ts`
  - Do: Modify TaskRouter constructor to accept optional second arg `{ classifier?: IComplexityClassifier; history?: IRoutingHistory }`. Add selectModel overload accepting `options?: { taskDescription?: string; taskSpec?: TaskSpec; complexityTier?: ComplexityTier }`. When options provided: (1) determine tier from options.complexityTier or classify taskDescription, (2) check history for best model, (3) if history suggests model use it (still capped by ceiling), (4) if no history apply complexity adjustment (light→downgrade one tier, heavy→upgrade one tier if ceiling allows, standard→use config model). Run existing 23 tests FIRST to verify backward compat. Add new tests: selectModel with complexity override, history-based selection, ceiling enforcement on history suggestion, light downgrade, heavy upgrade, standard no-change. Update index.ts exports for ComplexityClassifier, RoutingHistory, and new types.
  - Verify: `cd packages/core && npx vitest run src/__tests__/task-router.test.ts` — all 23 original + new tests pass; `cd packages/core && npx tsc --noEmit` clean; `node -e "import('@stupid/core').then(m => { console.log(typeof m.ComplexityClassifier, typeof m.RoutingHistory) })"` prints "function function"
  - Done when: Enhanced TaskRouter passes all original 23 tests unchanged, 10+ new tests prove complexity-aware routing, all new modules exported from @stupid/core

## Files Likely Touched

- `packages/core/src/types/index.ts`
- `packages/core/src/orchestrator/interfaces.ts`
- `packages/core/src/orchestrator/complexity-classifier.ts`
- `packages/core/src/orchestrator/routing-history.ts`
- `packages/core/src/orchestrator/task-router.ts`
- `packages/core/src/__tests__/complexity-classifier.test.ts`
- `packages/core/src/__tests__/routing-history.test.ts`
- `packages/core/src/__tests__/task-router.test.ts`
- `packages/core/src/index.ts`
