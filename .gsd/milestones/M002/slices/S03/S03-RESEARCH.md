# S03 Research: Complexity Classifier & Routing Enhancements

**Slice:** S03 — Complexity Classifier & Routing Enhancements
**Risk:** medium
**Depends on:** S01 (ProviderError type)
**Researched:** 2026-03-22

## Requirements Targeted

- **R013** — Smart model routing per task (primary owner: M001/S03, this slice extends with complexity routing)
- **R031** — Complexity-based dynamic model routing (light/standard/heavy → model selection)
- **R032** — Routing history with adaptive learning (track outcomes, improve routing over time)

## Summary

Three new modules needed, plus modifications to one existing module:

1. **ComplexityClassifier** (new) — Pure function that analyzes a task description string and returns a `ComplexityTier` (`light | standard | heavy`). Uses signal-based heuristics: keyword matching, file count, multi-step indicators, scope indicators.

2. **RoutingHistory** (new) — SQLite-backed storage in `.stupid/routing.db`. Records which model was used for which phase+tier, whether it succeeded, token cost. Provides `getBestModel(phase, tier)` that queries historical success rates to recommend a model.

3. **Updated TaskRouter** (modify) — Currently static: `role → config model → ceiling`. Enhanced to accept optional `ComplexityClassifier` and `RoutingHistory`. When available, `selectModel()` factors in task complexity to upgrade/downgrade the base model, and checks routing history for empirical guidance.

4. **Types** (modify) — Add `ComplexityTier`, `RoutingRecord`, and interfaces for the new modules.

## Implementation Landscape

### What Exists

| File | Role | Relevant API |
|------|------|-------------|
| `packages/core/src/orchestrator/task-router.ts` | Static role→model routing with ceiling + escalation | `selectModel(role)`, `getEscalationModel(currentModel)` |
| `packages/core/src/types/index.ts` | All shared types | `ProviderError`, `ProviderErrorType` (from S01), `AgentRole`, `StupidConfig` |
| `packages/core/src/orchestrator/interfaces.ts` | DI bag for orchestrator | `OrchestratorContext` — needs new optional fields |
| `packages/core/src/infrastructure/token-profiles.ts` | Profile configs | `TOKEN_PROFILES` with `modelCeiling` per profile |
| `packages/core/src/memory/project-memory.ts` | SQLite + FTS5 pattern reference | `better-sqlite3`, WAL mode, sync→async wrapping |
| `packages/core/src/memory/session-memory.ts` | Second SQLite pattern reference | Same better-sqlite3 patterns |
| `packages/core/src/__tests__/task-router.test.ts` | 23 existing tests | All must keep passing after TaskRouter changes |

### What Must Be Created

| File | Purpose |
|------|---------|
| `packages/core/src/orchestrator/complexity-classifier.ts` | `ComplexityClassifier.classify(task: string \| TaskSpec): ComplexityTier` |
| `packages/core/src/orchestrator/routing-history.ts` | `RoutingHistory` class with SQLite storage, `record()`, `getBestModel()` |
| `packages/core/src/__tests__/complexity-classifier.test.ts` | Unit tests for classifier |
| `packages/core/src/__tests__/routing-history.test.ts` | Unit tests for history (temp DB) |

### What Must Be Modified

| File | Change |
|------|--------|
| `packages/core/src/types/index.ts` | Add `ComplexityTier`, `RoutingRecord` types |
| `packages/core/src/orchestrator/task-router.ts` | Add complexity-aware `selectModel()` overload, accept optional classifier + history |
| `packages/core/src/orchestrator/interfaces.ts` | Add `IComplexityClassifier`, `IRoutingHistory` interfaces; extend `OrchestratorContext` |
| `packages/core/src/index.ts` | Export new modules |
| `packages/core/src/__tests__/task-router.test.ts` | Add tests for complexity-enhanced routing |

## Design Decisions to Make

### 1. ComplexityClassifier: Signal-Based Heuristic

The classifier must work **without** calling an LLM (it runs before model selection). Signals to extract from the task description:

**Light signals** (→ haiku-class):
- Short description (< 50 words)
- Single-file scope keywords: "rename", "fix typo", "update comment", "change value", "add import"
- No multi-step language

**Heavy signals** (→ opus-class):
- Long description (> 150 words)
- Multi-file keywords: "refactor", "migrate", "redesign", "across all", "every file"
- Architecture keywords: "system design", "new module", "database schema", "API design"
- Multi-step language: "first...then", "step 1", numbered items
- High file count in TaskSpec (> 10 files)

**Standard** = default when neither light nor heavy signals dominate.

Implementation: Score-based. Each signal adds/subtracts from a numeric score. Thresholds determine tier. This is simple, testable, and extensible.

### 2. RoutingHistory: Per-Phase Granularity

Per the M002 context doc's open question, track **per-phase** (research, implement, review), not per-task. Rationale:
- Per-phase is less noisy — aggregates across many tasks
- Model performance varies more by *what kind of work* than by *which specific task*
- Matches how TaskRouter already thinks (role → model)

**Schema:**
```sql
CREATE TABLE routing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase TEXT NOT NULL,          -- AgentRole value
  complexityTier TEXT NOT NULL, -- 'light' | 'standard' | 'heavy'
  model TEXT NOT NULL,          -- short name: 'haiku', 'sonnet', 'opus'
  success INTEGER NOT NULL,     -- 0 or 1
  tokensUsed INTEGER DEFAULT 0,
  costUsd REAL DEFAULT 0,
  durationMs INTEGER DEFAULT 0,
  errorType TEXT,               -- ProviderErrorType if failed (S01 dependency)
  timestamp TEXT NOT NULL
);

CREATE INDEX idx_phase_tier ON routing_history(phase, complexityTier);
```

**`getBestModel(phase, tier)`** logic:
1. Query success rate per model for this phase+tier combination
2. Require minimum 3 samples before trusting history (cold start protection)
3. Return model with highest success rate; break ties by lower cost
4. Return `null` if insufficient history — caller uses default routing

### 3. TaskRouter Enhancement: Backward-Compatible

**Critical constraint:** 23 existing tests call `new TaskRouter(config)` and `selectModel(role)`. These must all pass unchanged.

Strategy: **Additive API, optional deps.**

```typescript
// NEW overload — complexity-aware routing
selectModel(role: AgentRole, options?: {
  taskDescription?: string;
  taskSpec?: TaskSpec;
  complexityTier?: ComplexityTier;  // pre-classified, skips classifier
}): ModelSelection

// OLD call signature still works: selectModel(role) → same behavior as before
```

When `options` is provided:
1. Determine complexity tier (from `options.complexityTier`, or classify `options.taskDescription`)
2. Check routing history for empirical best model
3. If history suggests a model, use it (still capped by ceiling)
4. If no history, apply complexity adjustment to config model:
   - `light` → downgrade one tier (sonnet→haiku) if not already at bottom
   - `heavy` → upgrade one tier (sonnet→opus) if ceiling allows
   - `standard` → use config model as-is

Constructor change:
```typescript
constructor(config: StupidConfig, deps?: {
  classifier?: IComplexityClassifier;
  history?: IRoutingHistory;
})
```

### 4. OrchestratorContext Extension

Add two optional fields:
```typescript
export interface OrchestratorContext {
  // ... existing fields ...
  complexityClassifier?: IComplexityClassifier;
  routingHistory?: IRoutingHistory;
}
```

Orchestrator and SliceRunner can pass these to TaskRouter when constructing it.

## Constraints & Gotchas

1. **better-sqlite3 is synchronous** — `RoutingHistory` internal methods use sync SQLite calls. The interface methods (`record()`, `getBestModel()`) should be async for consistency with other interfaces, wrapping sync calls in `Promise.resolve()`. This matches the pattern in `ProjectMemory.search()`.

2. **No circular dependency** — ComplexityClassifier must not import TaskRouter. TaskRouter optionally depends on both classifier and history. History depends on nothing except types.

3. **Existing 23 TaskRouter tests must pass** — The constructor change must be backward-compatible. `new TaskRouter(config)` with no second arg must produce identical behavior.

4. **RoutingHistory DB location** — Should be in `.stupid/routing.db`, alongside `MEMORY.db` and `sessions.db`. Same `mkdirSync(stateDir, { recursive: true })` pattern.

5. **Cold start** — When routing history is empty (first run, new project), the classifier-based heuristic is the only input. History only matters after enough data accumulates. The 3-sample minimum prevents premature optimization from a single lucky/unlucky run.

6. **ProviderError dependency from S01** — `RoutingHistory.record()` accepts an optional `errorType: ProviderErrorType` field. This is the only cross-slice dependency. The type already exists in `types/index.ts`.

## Natural Task Seams

The work divides into 4 independent units with clear ordering:

### T01: Types & Interfaces (unblocks everything)
- Add `ComplexityTier` type and `RoutingRecord` type to `types/index.ts`
- Add `IComplexityClassifier` and `IRoutingHistory` interfaces to `interfaces.ts`
- Extend `OrchestratorContext` with two new optional fields
- **No tests to break** — additive only

### T02: ComplexityClassifier (independent after T01)
- New file: `packages/core/src/orchestrator/complexity-classifier.ts`
- Pure function, zero external deps. Signal extraction + scoring.
- Test file: `packages/core/src/__tests__/complexity-classifier.test.ts`
- Test cases: light tasks (rename, fix typo), heavy tasks (refactor, redesign), standard tasks, edge cases (empty string, very long text), TaskSpec-based classification

### T03: RoutingHistory (independent after T01)
- New file: `packages/core/src/orchestrator/routing-history.ts`
- SQLite DB with schema creation, `record()`, `getBestModel()`, `getStats()`
- Test file: `packages/core/src/__tests__/routing-history.test.ts`
- Test with temp directories (like project-memory.test.ts pattern)
- Test cases: record + retrieve, cold start (< 3 samples returns null), multiple models compared by success rate, tie-breaking by cost, `close()` lifecycle

### T04: TaskRouter Enhancement + Exports (depends on T01, T02, T03)
- Modify `task-router.ts`: add optional deps to constructor, add complexity-aware selectModel
- Run existing 23 tests first — must all pass with zero changes
- Add new tests for complexity-enhanced routing in `task-router.test.ts`
- Update `index.ts` exports for new modules
- Test cases: selectModel with complexity override, history-based selection, ceiling still enforced on history suggestion, backward compat

## Verification Strategy

1. **Existing tests pass:** `npx vitest run packages/core/src/__tests__/task-router.test.ts` — all 23 green
2. **New unit tests:** ~25-35 new tests across classifier, history, and enhanced router
3. **Type safety:** `npx tsc --noEmit` clean
4. **Build:** `npm run build` clean
5. **Integration proof:** TaskRouter with classifier + history produces different model selections than without, for the same role, when task complexity varies

## Recommendation

**Build order:** T01 → T02 + T03 (parallel) → T04

Start with types/interfaces (T01) since everything depends on them. ComplexityClassifier (T02) and RoutingHistory (T03) are fully independent of each other — they can be built in parallel. TaskRouter enhancement (T04) integrates both and must go last.

The riskiest piece is **backward compatibility of TaskRouter** — the enhanced constructor and selectModel must not break 23 existing tests. The safest approach is optional second arguments with fallback to current behavior when absent.

The classifier heuristic is intentionally simple (keyword scoring). It doesn't need to be perfect — routing history will learn from outcomes over time. A wrong classification just means a suboptimal model choice on the first attempt, which the escalation chain already handles.
