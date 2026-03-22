# S04: Git Worktree Manager

**Goal:** `WorktreeManager` provides per-slice git isolation across three modes (`worktree`, `branch`, `none`) and is wired into the execution pipeline via `OrchestratorContext`.
**Demo:** All 3 worktree modes tested with real temp git repos — create branch → commit per task → squash merge → cleanup — with the `feat(SLICE/TASK): summary` commit format preserved.

## Must-Haves

- `WorktreeMode` type (`"worktree" | "branch" | "none"`) in `types/index.ts`
- `worktreeMode` field in `StupidConfig.git` with Zod validation and `"branch"` default
- `IWorktreeManager` interface in `orchestrator/interfaces.ts` with `create`, `commit`, `merge`, `teardown`, `getMode`, `getWorkingDirectory`
- `WorktreeManager` class in `infrastructure/worktree-manager.ts` implementing all 3 modes
- `WorktreeManager.commit()` preserves `feat(SLICE/TASK): summary` format (R009)
- `worktreeManager?` optional field in `OrchestratorContext`
- `SliceRunner` uses `context.worktreeManager` when available, falls back to `PRBuilder` (backward compat)
- Unit tests with mocked `execSync` covering all 3 modes
- Integration tests with real temp git repos verifying full lifecycle per mode
- Squash merge produces single commit on target branch
- Existing 23+ `SliceRunner` tests still pass unchanged
- Static `listWorktrees(projectRoot)` for S05 Doctor to detect stale worktrees

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (real git repos in integration tests)
- Human/UAT required: no

## Verification

- `cd packages/core && npx vitest run src/__tests__/worktree-manager.test.ts` — unit tests pass for all 3 modes (mocked execSync)
- `cd packages/core && npx vitest run src/__tests__/worktree-manager-integration.test.ts` — integration tests pass with real git repos
- `cd packages/core && npx vitest run src/__tests__/slice-runner.test.ts` — all 23+ existing tests still pass
- `npm run typecheck --workspace=packages/core` — no type errors
- Integration tests verify: branch created/deleted, worktree dir created/removed, squash merge produces 1 commit, `feat(S01/T01):` format preserved

## Observability / Diagnostics

- Runtime signals: `WorktreeManager` methods throw descriptive errors on git failures (merge conflict, missing worktree, dirty state)
- Inspection surfaces: `WorktreeManager.listWorktrees(projectRoot)` static method returns active worktree paths (used by S05 Doctor)
- Failure visibility: git command stderr captured and included in thrown error messages
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `PRBuilder` pattern (`execSync` usage, `cwd` handling, commit message format), `OrchestratorContext` interface
- New wiring introduced in this slice: `WorktreeManager` instantiation in `packages/cli/src/context.ts`, `worktreeManager` field in `OrchestratorContext`, `SliceRunner` reads `context.worktreeManager`
- What remains before the milestone is truly usable end-to-end: S05 (Doctor stale worktree detection), S06 (real API end-to-end test using WorktreeManager)

## Tasks

- [x] **T01: Add WorktreeMode type, config schema field, and IWorktreeManager interface** `est:30m`
  - Why: Foundation types and contracts must exist before the implementation. All subsequent tasks depend on `WorktreeMode`, `IWorktreeManager`, and the config schema.
  - Files: `packages/core/src/types/index.ts`, `packages/core/src/config/config.ts`, `packages/core/src/orchestrator/interfaces.ts`
  - Do: Add `WorktreeMode` union type to types. Add `worktreeMode: WorktreeMode` to `StupidConfig.git` interface and Zod schema with `"branch"` default. Add `IWorktreeManager` interface with 6 methods to interfaces.ts. Add `worktreeManager?: IWorktreeManager` to `OrchestratorContext`. Keep `branchPerSlice` for backward compat.
  - Verify: `npm run typecheck --workspace=packages/core` passes; existing tests still pass
  - Done when: `WorktreeMode`, `IWorktreeManager`, and `worktreeMode` config field all compile cleanly

- [x] **T02: Implement WorktreeManager class with unit tests** `est:1h`
  - Why: Core implementation — the `WorktreeManager` class implements all 3 isolation modes. Unit tests with mocked `execSync` verify correct git command sequences per mode.
  - Files: `packages/core/src/infrastructure/worktree-manager.ts`, `packages/core/src/__tests__/worktree-manager.test.ts`
  - Do: Create `WorktreeManager` class following `PRBuilder` pattern. Implement `worktree` mode (git worktree add/remove, squash merge), `branch` mode (checkout -b, merge --squash), `none` mode (no-ops for create/merge/teardown, direct commits). Add `listWorktrees()` static. Write unit tests mocking `execSync` for each mode and method.
  - Verify: `cd packages/core && npx vitest run src/__tests__/worktree-manager.test.ts` — all tests pass
  - Done when: All 3 modes have mocked unit tests for create, commit, merge, teardown, getMode, getWorkingDirectory

- [x] **T03: Add integration tests with real temp git repos** `est:45m`
  - Why: Mocked tests verify command sequences but miss real git behavior (merge conflicts, worktree directory creation, actual branch states). Integration tests with real repos prove the full lifecycle works.
  - Files: `packages/core/src/__tests__/worktree-manager-integration.test.ts`
  - Do: Create integration test file. For each mode, create a temp git repo (mkdtemp + git init + initial commit), run full lifecycle (create → commit → merge → teardown), and verify git state after each step. Verify squash merge produces single commit. Verify worktree directory exists/removed. Verify branch created/deleted. Verify `feat(SLICE/TASK): summary` format in git log. Clean up temp dirs in afterEach.
  - Verify: `cd packages/core && npx vitest run src/__tests__/worktree-manager-integration.test.ts` — all tests pass
  - Done when: All 3 modes have passing integration tests proving real git lifecycle

- [x] **T04: Wire WorktreeManager into SliceRunner, exports, and CLI composition root** `est:45m`
  - Why: The WorktreeManager must be connected to the execution pipeline. SliceRunner currently uses PRBuilder directly — it needs to prefer WorktreeManager when available while preserving backward compatibility for existing tests.
  - Files: `packages/core/src/workflow/slice-runner.ts`, `packages/core/src/index.ts`, `packages/cli/src/context.ts`
  - Do: Update `SliceRunner.run()` to check `context.worktreeManager` — if present, call `worktreeManager.create()` at slice start, `worktreeManager.commit()` per task, `worktreeManager.merge()` + `worktreeManager.teardown()` at end. Fall back to `PRBuilder` when `worktreeManager` is absent. Add `WorktreeManager`, `WorktreeMode`, `IWorktreeManager` to barrel exports in `index.ts`. Instantiate `WorktreeManager` in `context.ts` and add to `OrchestratorContext`. Run all existing tests to verify backward compat.
  - Verify: `cd packages/core && npx vitest run` — all tests pass (existing + new); `npm run typecheck --workspace=packages/core` clean
  - Done when: SliceRunner uses WorktreeManager when injected, all 23+ existing tests pass unchanged, CLI context wires WorktreeManager

## Files Likely Touched

- `packages/core/src/types/index.ts`
- `packages/core/src/config/config.ts`
- `packages/core/src/orchestrator/interfaces.ts`
- `packages/core/src/infrastructure/worktree-manager.ts`
- `packages/core/src/__tests__/worktree-manager.test.ts`
- `packages/core/src/__tests__/worktree-manager-integration.test.ts`
- `packages/core/src/workflow/slice-runner.ts`
- `packages/core/src/index.ts`
- `packages/cli/src/context.ts`
