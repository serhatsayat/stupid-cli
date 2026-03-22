---
estimated_steps: 5
estimated_files: 4
skills_used:
  - test
---

# T01: Add types, interfaces, and ComplexityClassifier with tests

**Slice:** S03 — Complexity Classifier & Routing Enhancements
**Milestone:** M002

## Description

Establishes the type foundation and delivers the complexity classifier. Adds `ComplexityTier` and `RoutingRecord` types, `IComplexityClassifier` and `IRoutingHistory` interfaces with `OrchestratorContext` extensions, and implements the signal-based `ComplexityClassifier` with comprehensive unit tests. This unblocks T02 (RoutingHistory) and T03 (TaskRouter enhancement).

## Steps

1. **Add types to `packages/core/src/types/index.ts`:**
   - Add `ComplexityTier` type: `"light" | "standard" | "heavy"`
   - Add `RoutingRecord` interface:
     ```typescript
     interface RoutingRecord {
       id?: number;
       phase: string;          // AgentRole value
       complexityTier: ComplexityTier;
       model: string;          // short name: 'haiku', 'sonnet', 'opus'
       success: boolean;
       tokensUsed: number;
       costUsd: number;
       durationMs: number;
       errorType?: ProviderErrorType;  // from S01
       timestamp: string;
     }
     ```
   - Place these in a new `// ─── Routing Types ───` section after the Provider Error Types section.

2. **Add interfaces and extend context in `packages/core/src/orchestrator/interfaces.ts`:**
   - Import `ComplexityTier`, `RoutingRecord` from types (TaskSpec already imported)
   - Add `IComplexityClassifier` interface:
     ```typescript
     interface IComplexityClassifier {
       classify(task: string | TaskSpec): ComplexityTier;
     }
     ```
   - Add `IRoutingHistory` interface — **all methods are synchronous** because `better-sqlite3` is sync and `selectModel()` in TaskRouter must remain sync for backward compatibility:
     ```typescript
     interface IRoutingHistory {
       record(entry: Omit<RoutingRecord, 'id'>): void;
       getBestModel(phase: string, tier: ComplexityTier): string | null;
       getStats(): { total: number; byPhase: Record<string, number> };
       close(): void;
     }
     ```
   - Add to `OrchestratorContext`:
     ```typescript
     complexityClassifier?: IComplexityClassifier;
     routingHistory?: IRoutingHistory;
     ```

3. **Create `packages/core/src/orchestrator/complexity-classifier.ts`:**
   - Implement `ComplexityClassifier` class with `IComplexityClassifier` interface.
   - Signal-based scoring system:
     - Start at score 0
     - **Light signals** (subtract from score):
       - Short description < 50 words: -2
       - Single-file keywords ("rename", "fix typo", "update comment", "change value", "add import", "remove unused", "update version", "fix spelling"): -1 each (max -3)
     - **Heavy signals** (add to score):
       - Long description > 150 words: +2
       - Multi-file keywords ("refactor", "migrate", "redesign", "across all", "every file", "throughout"): +1 each (max +3)
       - Architecture keywords ("system design", "new module", "database schema", "API design", "new architecture"): +1 each (max +2)
       - Multi-step language ("first...then", "step 1", "step 2", numbered lists): +1
       - High file count in TaskSpec (> 10 files): +2
     - **Thresholds**: score ≤ -2 → light, score ≥ 2 → heavy, else → standard
   - Accept both `string` and `TaskSpec` input. For TaskSpec, classify `taskSpec.description` and factor in `taskSpec.files.length`.
   - Export the class as named export.

4. **Create `packages/core/src/__tests__/complexity-classifier.test.ts`:**
   - Follow existing test patterns (import from source, use `describe`/`it`/`expect` from vitest)
   - Test cases (10+ tests):
     - Light tasks: "rename variable x to y", "fix typo in README", "update comment", "add import for lodash"
     - Heavy tasks: "refactor the entire authentication system across all modules", "redesign database schema and migrate all queries", "create new module for payment processing with API design"
     - Standard tasks: "add a utility function", "implement user login", "create a new endpoint"
     - Edge cases: empty string → standard, very long description (200+ words) trends heavy, single keyword not enough for light (needs short description too)
     - TaskSpec input: TaskSpec with >10 files trends heavy, TaskSpec with 1 file and simple description → light

5. **Run tests and verify types:**
   - `cd packages/core && npx vitest run src/__tests__/complexity-classifier.test.ts`
   - `cd packages/core && npx tsc --noEmit`

## Must-Haves

- [ ] `ComplexityTier` type exported from `types/index.ts`
- [ ] `RoutingRecord` interface exported from `types/index.ts`
- [ ] `IComplexityClassifier` interface in `interfaces.ts` (sync `classify()`)
- [ ] `IRoutingHistory` interface in `interfaces.ts` (all methods sync — `getBestModel` returns `string | null`, not a Promise)
- [ ] `OrchestratorContext` extended with `complexityClassifier?` and `routingHistory?` fields
- [ ] `ComplexityClassifier.classify()` returns correct tier for known light/standard/heavy examples
- [ ] 10+ passing test cases in `complexity-classifier.test.ts`
- [ ] `npx tsc --noEmit` clean

## Verification

- `cd packages/core && npx vitest run src/__tests__/complexity-classifier.test.ts` — all tests pass
- `cd packages/core && npx tsc --noEmit` — no type errors
- Existing tests still work: `cd packages/core && npx vitest run src/__tests__/task-router.test.ts` — 23 tests pass (interfaces are additive)

## Inputs

- `packages/core/src/types/index.ts` — existing types file, add new types after ProviderError section
- `packages/core/src/orchestrator/interfaces.ts` — existing interfaces file, add new interfaces and extend OrchestratorContext
- `packages/core/src/__tests__/task-router.test.ts` — reference for test patterns (describe/it/expect style)

## Expected Output

- `packages/core/src/types/index.ts` — modified with ComplexityTier and RoutingRecord additions
- `packages/core/src/orchestrator/interfaces.ts` — modified with IComplexityClassifier, IRoutingHistory, extended OrchestratorContext
- `packages/core/src/orchestrator/complexity-classifier.ts` — new file, ComplexityClassifier class
- `packages/core/src/__tests__/complexity-classifier.test.ts` — new file, 10+ passing tests
