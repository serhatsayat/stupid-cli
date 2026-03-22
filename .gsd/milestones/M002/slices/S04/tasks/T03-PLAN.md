---
estimated_steps: 4
estimated_files: 1
skills_used:
  - test
---

# T03: Add integration tests with real temp git repos

**Slice:** S04 — Git Worktree Manager
**Milestone:** M002

## Description

Create integration tests that exercise `WorktreeManager` against real git repositories. Unit tests (T02) verify command sequences with mocked `execSync`, but only real git operations can prove the lifecycle actually works — that branches exist after `create()`, commits appear in `git log`, squash merge produces a single commit, worktree directories are physically created/removed, and branches are deleted after teardown.

Each test creates a fresh temp directory with `mkdtemp`, initializes a git repo with an initial commit, runs the full lifecycle, and verifies git state at each step. All temp dirs are cleaned up in `afterEach`.

**Important:** These tests must NOT mock `execSync` — they use the real git binary. The test file is separate from the unit test file to allow independent execution.

## Steps

1. **Create `packages/core/src/__tests__/worktree-manager-integration.test.ts`:**
   - Import `WorktreeManager` directly from `../infrastructure/worktree-manager.js` (not via barrel — avoid mock interference).
   - Import `mkdtempSync`, `rmSync`, `existsSync`, `writeFileSync` from `node:fs`, `join` from `node:path`, `tmpdir` from `node:os`, `execSync` from `node:child_process`.
   - Helper: `createTempGitRepo()` that creates a temp dir, runs `git init`, configures `user.name`/`user.email` (required for commits), creates a dummy file, and makes an initial commit. Returns the temp dir path.
   - Helper: `gitLog(cwd)` that runs `git log --oneline` and returns the output lines.
   - Helper: `gitBranches(cwd)` that runs `git branch` and returns branch names.
   - Helper: `cleanup(dir)` that runs `rmSync(dir, { recursive: true, force: true })`.

2. **Test `branch` mode full lifecycle:**
   - Create temp repo, instantiate `WorktreeManager({ projectRoot: tempDir, worktreeMode: 'branch' })`.
   - Call `create('S01', 'test slice')` → verify branch `stupid/S01-test-slice` exists via `git branch`.
   - Create a file in `projectRoot`, call `commit('S01', 'T01', 'add feature')` → verify `git log` shows `feat(S01/T01): add feature` on the branch.
   - Create another file, call `commit('S01', 'T02', 'add tests')` → verify second commit in log.
   - Call `merge('S01')` → verify we're back on `main`/`master`, squash merge produced exactly 1 new commit on main.
   - Call `teardown('S01')` → verify branch `stupid/S01-test-slice` is deleted.
   - Verify total commits on main: initial + 1 squash = 2.

3. **Test `worktree` mode full lifecycle:**
   - Create temp repo, instantiate with `worktreeMode: 'worktree'`.
   - Call `create('S01', 'test slice')` → verify worktree directory `.stupid/worktrees/S01` exists physically; verify `git worktree list` shows the worktree.
   - Create a file in the worktree directory (use `getWorkingDirectory('S01')` to get path), call `commit()` → verify commit appears in worktree's `git log`.
   - Call `merge('S01')` → verify squash commit on main branch.
   - Call `teardown('S01')` → verify worktree directory removed, branch deleted.

4. **Test `none` mode:**
   - Create temp repo, instantiate with `worktreeMode: 'none'`.
   - Call `create('S01', 'test')` → verify no new branch created (still on main/master only).
   - Create a file, call `commit('S01', 'T01', 'direct commit')` → verify commit appears on current branch with `feat(S01/T01):` format.
   - Call `merge('S01')` → no-op, verify no error.
   - Call `teardown('S01')` → no-op, verify no error.
   - `getWorkingDirectory('S01')` returns `projectRoot`.

## Must-Haves

- [ ] `branch` mode: full lifecycle with real git — branch created, commits made, squash merge produces 1 commit, branch deleted
- [ ] `worktree` mode: full lifecycle — worktree dir created, commits in worktree, squash merge, worktree removed
- [ ] `none` mode: commit goes to current branch, create/merge/teardown are no-ops
- [ ] R009 format verified: `git log` output contains `feat(S01/T01):` pattern
- [ ] Squash merge verified: main branch has exactly `initial + 1` commits after merge (not individual task commits)
- [ ] All temp directories cleaned up after tests

## Verification

- `cd packages/core && npx vitest run src/__tests__/worktree-manager-integration.test.ts` — all tests pass
- Tests run against real git (not mocked)

## Inputs

- `packages/core/src/infrastructure/worktree-manager.ts` — `WorktreeManager` class from T02

## Expected Output

- `packages/core/src/__tests__/worktree-manager-integration.test.ts` — integration tests proving real git lifecycle for all 3 modes
