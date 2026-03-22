---
estimated_steps: 4
estimated_files: 3
skills_used:
  - test
---

# T03: Enhance TaskRouter with complexity routing and wire exports

**Slice:** S03 — Complexity Classifier & Routing Enhancements
**Milestone:** M002

## Description

Integrates ComplexityClassifier (T01) and RoutingHistory (T02) into TaskRouter, completing the complexity-based model routing. The enhanced `selectModel()` accepts an optional options object with task description or pre-classified tier, uses the classifier to adjust model selection, and checks history for empirical guidance. The original `selectModel(role)` signature remains backward-compatible — all 23 existing tests must pass unchanged. Also wires all new modules into `index.ts` exports. This completes R013 (smart routing per task) and R031 (complexity-based dynamic routing).

**Key design: all sync.** Since `IRoutingHistory.getBestModel()` is sync (better-sqlite3 is sync, decided in T01/T02), the enhanced `selectModel(role, options?)` can stay fully synchronous. No need for a separate async method. This is the cleanest backward-compatible approach.

## Steps

1. **Run existing 23 TaskRouter tests FIRST to confirm baseline:**
   - `cd packages/core && npx vitest run src/__tests__/task-router.test.ts`
   - All 23 must pass before any modification.

2. **Modify `packages/core/src/orchestrator/task-router.ts`:**
   - Add imports at the top:
     ```typescript
     import type { IComplexityClassifier, IRoutingHistory } from "./interfaces.js";
     import type { ComplexityTier, TaskSpec } from "../types/index.js";
     ```
   - Add exported interfaces:
     ```typescript
     export interface TaskRouterDeps {
       classifier?: IComplexityClassifier;
       history?: IRoutingHistory;
     }

     export interface SelectModelOptions {
       taskDescription?: string;
       taskSpec?: TaskSpec;
       complexityTier?: ComplexityTier;
     }
     ```
   - Add private fields to the class:
     ```typescript
     private readonly classifier?: IComplexityClassifier;
     private readonly history?: IRoutingHistory;
     ```
   - Modify constructor — add optional second parameter (existing tests pass `new TaskRouter(config)` with one arg, so this is backward-compatible):
     ```typescript
     constructor(config: StupidConfig, deps?: TaskRouterDeps) {
       this.config = config;
       this.ceiling = TOKEN_PROFILES[config.profile].modelCeiling;
       this.ceilingIdx = tierIndex(this.ceiling);
       this.classifier = deps?.classifier;
       this.history = deps?.history;
     }
     ```
   - Modify `selectModel` signature — add optional second parameter:
     ```typescript
     selectModel(role: AgentRole, options?: SelectModelOptions): ModelSelection
     ```
   - When `options` is undefined, behavior is identical to current (backward compat).
   - When `options` is provided:
     1. Determine complexity tier: use `options.complexityTier` if given, else classify via `this.classifier?.classify(options.taskDescription ?? options.taskSpec?.description ?? "")`. If no classifier and no tier, treat as `"standard"`.
     2. Check routing history: `this.history?.getBestModel(role, tier)` (sync call).
     3. If history returns a non-null model, use it (apply ceiling cap via `applyModelCeiling`).
     4. If no history result, apply complexity adjustment to the config-based model:
        - `"light"`: downgrade one tier (sonnet→haiku, opus→sonnet). Don't go below haiku (index 0).
        - `"heavy"`: upgrade one tier (haiku→sonnet, sonnet→opus). Cap at ceiling via `applyModelCeiling`.
        - `"standard"`: use config model as-is (same as current behavior).
   - Add a private helper:
     ```typescript
     private adjustModelForComplexity(baseModel: string, tier: ComplexityTier): string {
       const baseIdx = tierIndex(baseModel);
       if (tier === "light" && baseIdx > 0) {
         return MODEL_TIERS[baseIdx - 1];
       }
       if (tier === "heavy" && baseIdx < MODEL_TIERS.length - 1) {
         return this.applyModelCeiling(MODEL_TIERS[baseIdx + 1]);
       }
       return baseModel;
     }
     ```

3. **Add new tests to `packages/core/src/__tests__/task-router.test.ts`:**
   - Add a new `describe("selectModel — complexity-aware routing")` block AFTER all existing tests.
   - Create mock objects matching the interfaces from T01:
     ```typescript
     const mockClassifier: IComplexityClassifier = { classify: () => "standard" };
     const mockHistory: IRoutingHistory = { getBestModel: () => null, record: () => {}, getStats: () => ({ total: 0, byPhase: {} }), close: () => {} };
     ```
   - Test cases (10+ new tests):
     - **Light downgrade (balanced)**: selectModel(Implementer, { complexityTier: "light" }) → haiku (downgraded from sonnet)
     - **Heavy upgrade (quality)**: selectModel(Research, { complexityTier: "heavy" }) → sonnet (upgraded from haiku, quality ceiling allows it)
     - **Heavy blocked by ceiling (balanced)**: selectModel(Implementer, { complexityTier: "heavy" }) → sonnet (already at ceiling, can't upgrade beyond)
     - **Standard no change**: selectModel(Implementer, { complexityTier: "standard" }) → same as selectModel(Implementer) with no options
     - **Classifier integration**: Router created with mock classifier that returns "light", selectModel(Implementer, { taskDescription: "anything" }) → haiku
     - **No options = original behavior**: Router with deps injected, selectModel(role) with no second arg → same result as vanilla router
     - **History override**: Mock history returns "haiku", quality profile → haiku used (even though config says sonnet for implementer)
     - **History capped by ceiling**: Mock history returns "opus", balanced profile (ceiling: sonnet) → sonnet
     - **History null falls back to classifier**: Mock history returns null, classifier says "heavy" → upgrade applied
     - **Light can't go below haiku**: selectModel(Research, { complexityTier: "light" }) → haiku (already at haiku, no further downgrade)
   - Verify all 23 original tests still pass unchanged.

4. **Update `packages/core/src/index.ts` exports:**
   - Add to Types section:
     ```typescript
     export type { ComplexityTier, RoutingRecord } from "./types/index.js";
     ```
   - Add to Orchestrator section:
     ```typescript
     export { ComplexityClassifier } from "./orchestrator/complexity-classifier.js";
     export { RoutingHistory } from "./orchestrator/routing-history.js";
     export type { TaskRouterDeps, SelectModelOptions } from "./orchestrator/task-router.js";
     ```
   - Add to Orchestrator interfaces section:
     ```typescript
     export type { IComplexityClassifier, IRoutingHistory } from "./orchestrator/interfaces.js";
     ```
   - Final verification:
     - `cd packages/core && npx vitest run src/__tests__/task-router.test.ts` — all original 23 + new tests pass
     - `cd packages/core && npx vitest run src/__tests__/complexity-classifier.test.ts` — still passes
     - `cd packages/core && npx vitest run src/__tests__/routing-history.test.ts` — still passes
     - `cd packages/core && npx tsc --noEmit` — clean
     - `node -e "import('@stupid/core').then(m => { console.log(typeof m.ComplexityClassifier, typeof m.RoutingHistory) })"` — prints "function function"

## Must-Haves

- [ ] TaskRouter constructor accepts optional `TaskRouterDeps` second parameter
- [ ] `selectModel(role)` (no options) behaves identically to before — all 23 original tests pass unchanged
- [ ] `selectModel(role, options)` applies complexity tier adjustment (light→downgrade, heavy→upgrade, standard→no change)
- [ ] `selectModel(role, options)` checks routing history when available, falls back to classifier-based adjustment
- [ ] Model ceiling still enforced on all paths (adjusted model and history suggestion both capped)
- [ ] 10+ new tests for complexity-aware and history-aware routing
- [ ] All new modules (`ComplexityClassifier`, `RoutingHistory`, types, interfaces) exported from `index.ts`
- [ ] `npx tsc --noEmit` clean
- [ ] Full test suite: `npx vitest run src/__tests__/task-router.test.ts` passes 33+ tests

## Verification

- `cd packages/core && npx vitest run src/__tests__/task-router.test.ts` — all 23 original + 10+ new tests pass
- `cd packages/core && npx tsc --noEmit` — clean
- `node -e "import('@stupid/core').then(m => { console.log(typeof m.ComplexityClassifier, typeof m.RoutingHistory) })"` — prints "function function"

## Inputs

- `packages/core/src/orchestrator/task-router.ts` — existing TaskRouter to enhance
- `packages/core/src/__tests__/task-router.test.ts` — existing 23 tests that must not break
- `packages/core/src/orchestrator/complexity-classifier.ts` — ComplexityClassifier from T01
- `packages/core/src/orchestrator/routing-history.ts` — RoutingHistory from T02
- `packages/core/src/orchestrator/interfaces.ts` — IComplexityClassifier, IRoutingHistory from T01
- `packages/core/src/types/index.ts` — ComplexityTier, RoutingRecord from T01
- `packages/core/src/index.ts` — current exports file to extend

## Expected Output

- `packages/core/src/orchestrator/task-router.ts` — modified with optional deps, complexity-aware selectModel
- `packages/core/src/__tests__/task-router.test.ts` — modified with 10+ new tests appended
- `packages/core/src/index.ts` — modified with new exports for ComplexityClassifier, RoutingHistory, types, interfaces

## Observability Impact

- **New signal:** `selectModel(role, options)` with options produces a model selection influenced by complexity tier and routing history — the caller can compare with and without options to see the routing adjustment effect.
- **Inspection:** Callers can inspect the returned `ModelSelection.modelId` to confirm complexity-based downgrades (light→haiku) or upgrades (heavy→opus). History-suggested models are capped by the profile ceiling, which is observable as a discrepancy between history suggestion and returned model.
- **Failure visibility:** When no classifier is injected and no explicit tier is provided, the tier defaults to `"standard"` — this is a silent fallback. No error is surfaced; the behavior is identical to calling `selectModel(role)` without options.
- **Dependency transparency:** `TaskRouterDeps` fields are optional. A router constructed without deps behaves identically to pre-enhancement behavior, making it safe to deploy incrementally.
