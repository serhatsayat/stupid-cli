---
estimated_steps: 4
estimated_files: 3
skills_used:
  - test
  - lint
---

# T01: Add WorktreeMode type, config schema field, and IWorktreeManager interface

**Slice:** S04 — Git Worktree Manager
**Milestone:** M002

## Description

Add the foundation types and contracts required by all subsequent tasks. This includes the `WorktreeMode` union type, the `worktreeMode` field in `StupidConfig.git` (with Zod validation and `"branch"` default), the `IWorktreeManager` interface, and the `worktreeManager?` optional field in `OrchestratorContext`.

The existing `branchPerSlice` boolean stays for backward compat — `worktreeMode` is the new authoritative field for isolation mode selection. The `IWorktreeManager` interface follows D017 (interface injection pattern) and D032 (implementations follow interface signatures exactly).

## Steps

1. **Add `WorktreeMode` type to `packages/core/src/types/index.ts`:**
   - Add `export type WorktreeMode = "worktree" | "branch" | "none";` in a new `// ─── Git Isolation Types` section near the Configuration types.
   - Add `worktreeMode: WorktreeMode;` to the `StupidConfig.git` interface (alongside existing `commitPerTask`, `branchPerSlice`, `autoCommitMessage` fields).

2. **Update Zod schema and defaults in `packages/core/src/config/config.ts`:**
   - Import `WorktreeMode` is not needed (Zod validates independently).
   - Add `worktreeMode: z.enum(["worktree", "branch", "none"])` to the `git` object in `StupidConfigSchema`.
   - Add `worktreeMode: "branch"` to `DEFAULT_CONFIG.git`.

3. **Add `IWorktreeManager` interface to `packages/core/src/orchestrator/interfaces.ts`:**
   - Add import for `WorktreeMode` from types.
   - Add the interface with these methods:
     ```typescript
     export interface IWorktreeManager {
       create(sliceId: string, title: string): void;
       commit(sliceId: string, taskId: string, message: string, files?: string[]): void;
       merge(sliceId: string): void;
       teardown(sliceId: string): void;
       getMode(): WorktreeMode;
       getWorkingDirectory(sliceId: string): string;
     }
     ```
   - Add `worktreeManager?: IWorktreeManager;` to `OrchestratorContext`.

4. **Verify typecheck and existing tests pass:**
   - Run `npm run typecheck --workspace=packages/core`.
   - Run `cd packages/core && npx vitest run` — all existing tests must pass. The new `worktreeMode` field in DEFAULT_CONFIG means existing test configs already pick it up via spread.

## Must-Haves

- [ ] `WorktreeMode` type exported from `types/index.ts`
- [ ] `StupidConfig.git.worktreeMode` field exists in both TypeScript type and Zod schema
- [ ] Default value is `"branch"`
- [ ] `IWorktreeManager` interface has all 6 methods: `create`, `commit`, `merge`, `teardown`, `getMode`, `getWorkingDirectory`
- [ ] `OrchestratorContext.worktreeManager` is optional (`?`)
- [ ] `branchPerSlice` field preserved (not removed)
- [ ] All existing tests pass unchanged

## Verification

- `npm run typecheck --workspace=packages/core` — zero errors
- `cd packages/core && npx vitest run` — all existing tests pass (321+ tests)
- `grep -q "WorktreeMode" packages/core/src/types/index.ts` confirms type exists
- `grep -q "worktreeMode" packages/core/src/config/config.ts` confirms config field exists
- `grep -q "IWorktreeManager" packages/core/src/orchestrator/interfaces.ts` confirms interface exists

## Inputs

- `packages/core/src/types/index.ts` — existing types file, add `WorktreeMode` and extend `StupidConfig.git`
- `packages/core/src/config/config.ts` — existing config with Zod schema + `DEFAULT_CONFIG`, add `worktreeMode`
- `packages/core/src/orchestrator/interfaces.ts` — existing interfaces file with `OrchestratorContext`, add `IWorktreeManager`

## Expected Output

- `packages/core/src/types/index.ts` — now exports `WorktreeMode` type and has `worktreeMode` in `StupidConfig.git`
- `packages/core/src/config/config.ts` — Zod schema validates `worktreeMode`, `DEFAULT_CONFIG.git.worktreeMode` is `"branch"`
- `packages/core/src/orchestrator/interfaces.ts` — has `IWorktreeManager` interface and `worktreeManager?` in `OrchestratorContext`
