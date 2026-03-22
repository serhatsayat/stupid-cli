---
estimated_steps: 4
estimated_files: 3
skills_used:
  - test
  - lint
---

# T04: Wire WorktreeManager into SliceRunner, exports, and CLI composition root

**Slice:** S04 — Git Worktree Manager
**Milestone:** M002

## Description

Connect `WorktreeManager` to the execution pipeline. `SliceRunner` currently creates a `PRBuilder` in `run()` and calls `prBuilder.createCommit()` per task. Update it to prefer `context.worktreeManager` when available — calling `create()` at slice start, `commit()` per task, and `merge()` + `teardown()` at slice end. When `worktreeManager` is absent (backward compat), the existing `PRBuilder` path remains.

Add barrel exports for `WorktreeManager`, `WorktreeMode`, and `IWorktreeManager` in `packages/core/src/index.ts`. Wire `WorktreeManager` instantiation into `packages/cli/src/context.ts`.

**Critical constraint:** The 23+ existing `SliceRunner` tests do NOT inject `worktreeManager` into context. They mock `child_process.execSync` globally. The `PRBuilder` fallback path must remain so these tests pass unchanged.

## Steps

1. **Update `packages/core/src/workflow/slice-runner.ts`:**
   - At the start of `run()`, check if `context.worktreeManager` is defined. If so:
     - Call `context.worktreeManager.create(slice.id, slice.title)` before any task execution.
     - Replace all `prBuilder.createCommit(slice.id, task.id, task.title)` calls with `context.worktreeManager.commit(slice.id, task.id, task.title)`.
     - After all tasks complete successfully (before returning `done`), call `context.worktreeManager.merge(slice.id)` then `context.worktreeManager.teardown(slice.id)`.
     - On failure paths (returning `failed`), call `context.worktreeManager.teardown(slice.id)` to clean up.
   - If `context.worktreeManager` is NOT defined, keep the existing `PRBuilder` logic exactly as-is.
   - The `branchPerSlice` config check is no longer needed when worktreeManager handles branching — but keep it for the PRBuilder fallback path.
   - Important: wrap merge/teardown in try-catch so failures there don't mask the actual slice result.

2. **Add exports to `packages/core/src/index.ts`:**
   - In the `// ─── Types` section, add `WorktreeMode` to the type exports from `./types/index.js`.
   - In the `// ─── Orchestrator` section, add `IWorktreeManager` to the interface exports from `./orchestrator/interfaces.js`.
   - In the `// ─── Infrastructure` section, add: `export { WorktreeManager } from "./infrastructure/worktree-manager.js";`

3. **Wire in `packages/cli/src/context.ts`:**
   - Import `WorktreeManager` from `@stupid/core`.
   - In `buildContext()`, instantiate: `const worktreeManager = new WorktreeManager({ projectRoot: config.projectRoot, worktreeMode: config.git.worktreeMode });`
   - Add `worktreeManager` to the returned `OrchestratorContext` object.

4. **Run all tests to verify backward compatibility:**
   - `cd packages/core && npx vitest run` — all tests pass (especially the 23+ slice-runner tests).
   - `npm run typecheck --workspace=packages/core` — zero errors.
   - `npm run typecheck --workspace=packages/cli` — zero errors (context.ts compiles with new import).

## Must-Haves

- [ ] `SliceRunner` uses `context.worktreeManager` when available (create at start, commit per task, merge+teardown at end)
- [ ] `SliceRunner` falls back to `PRBuilder` when `worktreeManager` is absent
- [ ] All 23+ existing `SliceRunner` tests pass unchanged
- [ ] `WorktreeManager`, `WorktreeMode`, `IWorktreeManager` exported from `@stupid/core`
- [ ] `WorktreeManager` instantiated and wired in CLI `buildContext()`
- [ ] `merge`/`teardown` failures don't mask the actual slice result

## Verification

- `cd packages/core && npx vitest run src/__tests__/slice-runner.test.ts` — all 23+ existing tests pass
- `cd packages/core && npx vitest run` — full test suite passes
- `npm run typecheck --workspace=packages/core` — zero errors
- `npm run typecheck --workspace=packages/cli` — zero errors
- `grep -q "WorktreeManager" packages/core/src/index.ts` — export exists
- `grep -q "worktreeManager" packages/cli/src/context.ts` — wired in CLI

## Inputs

- `packages/core/src/infrastructure/worktree-manager.ts` — `WorktreeManager` class from T02
- `packages/core/src/workflow/slice-runner.ts` — existing `SliceRunner` to update
- `packages/core/src/index.ts` — barrel exports to extend
- `packages/cli/src/context.ts` — CLI composition root to wire

## Expected Output

- `packages/core/src/workflow/slice-runner.ts` — uses `context.worktreeManager` with PRBuilder fallback
- `packages/core/src/index.ts` — exports `WorktreeManager`, `WorktreeMode`, `IWorktreeManager`
- `packages/cli/src/context.ts` — instantiates `WorktreeManager` from config

## Observability Impact

- **SliceRunner now logs merge/teardown failures** to `console.error` with `WorktreeManager merge failed for slice X:` and `WorktreeManager teardown failed for slice X:` messages. These are non-fatal — the slice result ("done"/"failed") is preserved even when cleanup fails.
- **Failure path teardown:** Every early-return "failed" path in `SliceRunner.run()` calls `safeWorktreeTeardown()`, which catches and logs teardown errors rather than masking the original failure.
- **Inspection:** `grep "worktreeManager" packages/cli/src/context.ts` confirms wiring. `grep "context.worktreeManager" packages/core/src/workflow/slice-runner.ts` confirms integration. The existing 14 SliceRunner tests verify the PRBuilder fallback still works when `worktreeManager` is absent from context.
