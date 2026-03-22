---
estimated_steps: 5
estimated_files: 2
skills_used:
  - test
  - lint
---

# T02: Implement WorktreeManager class with unit tests

**Slice:** S04 — Git Worktree Manager
**Milestone:** M002

## Description

Create the `WorktreeManager` class in `packages/core/src/infrastructure/worktree-manager.ts` that implements `IWorktreeManager` from T01. The class supports three isolation modes — `worktree`, `branch`, and `none` — using `execSync` from `child_process` (same pattern as `PRBuilder` in `packages/core/src/workflow/pr-builder.ts`).

Write comprehensive unit tests with mocked `execSync` verifying correct git command sequences for each mode and method. Follow the test pattern from `packages/core/src/__tests__/pr-builder.test.ts`.

**Commit format (R009):** The `commit()` method MUST produce commits with the format `feat(SLICE_ID/TASK_ID): message` — exactly matching `PRBuilder.createCommit()`.

## Steps

1. **Create `packages/core/src/infrastructure/worktree-manager.ts`:**
   - Import `execSync` from `node:child_process`, `join` from `node:path`.
   - Import `WorktreeMode` from `../types/index.js` and `IWorktreeManager` from `../orchestrator/interfaces.js`.
   - Constructor takes `{ projectRoot: string; worktreeMode: WorktreeMode }`.
   - Private `exec(command, cwd?)` helper wrapping `execSync(cmd, { cwd, stdio: ['pipe','pipe','pipe'], encoding: 'utf-8' })` — matches PRBuilder pattern.
   - Private `branchName(sliceId, title)` helper: returns `stupid/<sliceId>-<slugified-title>`.
   - Private `worktreeDir(sliceId)` helper: returns `join(projectRoot, '.stupid', 'worktrees', sliceId)`.

2. **Implement mode-specific behavior for each method:**

   **`create(sliceId, title)`:**
   - `worktree`: `git worktree add <worktreeDir> -b <branchName>` (from projectRoot)
   - `branch`: `git checkout -b <branchName>` (from projectRoot)
   - `none`: no-op

   **`commit(sliceId, taskId, message, files?)`:**
   - All modes: stage files (`git add <files>` or `git add -A`), then `git commit -m "feat(<sliceId>/<taskId>): <message>"` — preserving R009 format.
   - `worktree`: runs in worktree directory
   - `branch`/`none`: runs in projectRoot

   **`merge(sliceId)`:**
   - `worktree`: from projectRoot, `git checkout <originalBranch>`, `git merge --squash <branchName>`, `git commit -m "feat(<sliceId>): squash merge <title>"`
   - `branch`: `git checkout <originalBranch>`, `git merge --squash <branchName>`, `git commit -m "feat(<sliceId>): squash merge <title>"`
   - `none`: no-op

   **`teardown(sliceId)`:**
   - `worktree`: `git worktree remove <worktreeDir>`, `git branch -D <branchName>`
   - `branch`: `git branch -D <branchName>`
   - `none`: no-op

   **`getMode()`:** returns `this.worktreeMode`

   **`getWorkingDirectory(sliceId)`:**
   - `worktree`: returns worktree directory path
   - `branch`/`none`: returns `projectRoot`

3. **Track original branch:** In `create()`, save the current branch via `git rev-parse --abbrev-ref HEAD` before creating a new branch. Store in a `Map<string, { branch: string; title: string; originalBranch: string }>` keyed by sliceId.

4. **Add static `listWorktrees(projectRoot)`:** Runs `git worktree list --porcelain` and parses output to return array of `{ path: string; branch: string }`. This is for S05 Doctor to detect stale worktrees.

5. **Create `packages/core/src/__tests__/worktree-manager.test.ts`:**
   - Mock `node:child_process` (same pattern as pr-builder.test.ts).
   - Test each mode (`worktree`, `branch`, `none`) for each method:
     - `create()`: verify correct git commands per mode
     - `commit()`: verify staging + commit with R009 format per mode
     - `merge()`: verify squash merge commands per mode, verify `none` is no-op
     - `teardown()`: verify cleanup commands per mode, verify `none` is no-op
     - `getMode()`: returns the configured mode
     - `getWorkingDirectory()`: returns correct path per mode
   - Test `listWorktrees()` static: mock porcelain output, verify parsing.
   - Test error case: `merge()` with unknown sliceId throws.
   - Test `commit()` with specific files vs `git add -A`.

## Must-Haves

- [ ] `WorktreeManager` implements `IWorktreeManager` interface (all 6 methods)
- [ ] `worktree` mode: creates git worktree, commits in worktree dir, squash merges, removes worktree
- [ ] `branch` mode: creates branch, commits on branch, squash merges, deletes branch
- [ ] `none` mode: create/merge/teardown are no-ops, commit goes to current branch
- [ ] `commit()` format: `feat(<sliceId>/<taskId>): <message>` (R009)
- [ ] `listWorktrees()` static method parses `git worktree list --porcelain`
- [ ] Unit tests cover all 3 modes × all methods with mocked execSync
- [ ] Error handling: descriptive errors on git failures

## Verification

- `cd packages/core && npx vitest run src/__tests__/worktree-manager.test.ts` — all tests pass
- `npm run typecheck --workspace=packages/core` — zero errors

## Inputs

- `packages/core/src/types/index.ts` — `WorktreeMode` type from T01
- `packages/core/src/orchestrator/interfaces.ts` — `IWorktreeManager` interface from T01
- `packages/core/src/workflow/pr-builder.ts` — reference pattern for `execSync` usage and commit format
- `packages/core/src/__tests__/pr-builder.test.ts` — reference pattern for mocking `execSync` in tests

## Observability Impact

- **Signals changed:** `WorktreeManager` methods throw descriptive `Error` instances on git failures. The error message includes the failed git command and captured stderr, making failures diagnosable without extra logging.
- **Inspection surfaces:** `WorktreeManager.listWorktrees(projectRoot)` static method returns active worktree paths — used by S05 Doctor to detect stale worktrees. `getMode()` returns the active isolation mode for runtime inspection.
- **How a future agent inspects this task:** `grep -r "WorktreeManager" packages/core/src/infrastructure/` confirms the class exists. `grep "implements IWorktreeManager" packages/core/src/infrastructure/worktree-manager.ts` verifies interface compliance. Unit test file covers all 3 modes × all methods.
- **Failure visibility:** Git command stderr is captured and included in thrown error messages (e.g., merge conflict, missing worktree, dirty state). Unknown sliceId in `merge()` throws with message identifying the missing tracking entry.

## Expected Output

- `packages/core/src/infrastructure/worktree-manager.ts` — complete `WorktreeManager` class with all 3 modes
- `packages/core/src/__tests__/worktree-manager.test.ts` — unit tests covering all modes and methods
