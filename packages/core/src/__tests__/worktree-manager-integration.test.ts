import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

// Import directly — not via barrel — to avoid mock interference from unit tests
import { WorktreeManager } from "../infrastructure/worktree-manager.js";

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Creates a fresh temp directory with an initialized git repo and one
 * initial commit. Configures user.name/email so commits succeed.
 */
function createTempGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "wm-integration-"));
  execSync("git init -b main", { cwd: dir, stdio: "pipe" });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: "pipe" });
  execSync('git config user.email "test@example.com"', {
    cwd: dir,
    stdio: "pipe",
  });
  writeFileSync(join(dir, "README.md"), "# Test Repo\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "initial commit"', { cwd: dir, stdio: "pipe" });
  return dir;
}

/** Returns `git log --oneline` lines for the given directory. */
function gitLog(cwd: string): string[] {
  return execSync("git log --oneline", { cwd, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

/** Returns branch names from `git branch`. */
function gitBranches(cwd: string): string[] {
  return execSync("git branch", { cwd, encoding: "utf-8" })
    .trim()
    .split("\n")
    .map((b) => b.replace(/^\*?\s*/, "").trim())
    .filter(Boolean);
}

/** Removes a directory tree. Safe to call on already-removed paths. */
function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// ─── Integration Tests ──────────────────────────────────────

describe("WorktreeManager integration (real git)", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      cleanup(dir);
    }
    tempDirs.length = 0;
  });

  // ── branch mode ─────────────────────────────────────────

  describe("branch mode full lifecycle", () => {
    it("create → commit × 2 → merge → teardown with real git", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "branch",
      });

      // ── create ──────────────────────────────────────────
      mgr.create("S01", "test slice");

      const branchesAfterCreate = gitBranches(tempDir);
      expect(branchesAfterCreate).toContain("stupid/S01-test-slice");

      // Current branch should be the new one (branch mode checks out)
      const currentBranch = execSync(
        "git rev-parse --abbrev-ref HEAD",
        { cwd: tempDir, encoding: "utf-8" },
      ).trim();
      expect(currentBranch).toBe("stupid/S01-test-slice");

      // ── commit T01 ─────────────────────────────────────
      writeFileSync(join(tempDir, "feature.ts"), "export const x = 1;\n");
      mgr.commit("S01", "T01", "add feature");

      const logAfterT01 = gitLog(tempDir);
      expect(logAfterT01[0]).toContain("feat(S01/T01): add feature");

      // ── commit T02 ─────────────────────────────────────
      writeFileSync(
        join(tempDir, "test.ts"),
        "import { x } from './feature';\n",
      );
      mgr.commit("S01", "T02", "add tests");

      const logAfterT02 = gitLog(tempDir);
      expect(logAfterT02[0]).toContain("feat(S01/T02): add tests");
      // Branch should have: initial + T01 + T02 = 3 commits
      expect(logAfterT02).toHaveLength(3);

      // ── merge (squash) ─────────────────────────────────
      mgr.merge("S01");

      // Should be back on main
      const branchAfterMerge = execSync(
        "git rev-parse --abbrev-ref HEAD",
        { cwd: tempDir, encoding: "utf-8" },
      ).trim();
      expect(branchAfterMerge).toBe("main");

      // Squash merge = 1 new commit on main → total 2 (initial + squash)
      const mainLog = gitLog(tempDir);
      expect(mainLog).toHaveLength(2);
      expect(mainLog[0]).toContain("feat(S01): squash merge");

      // Files from the branch should exist on main after squash merge
      expect(existsSync(join(tempDir, "feature.ts"))).toBe(true);
      expect(existsSync(join(tempDir, "test.ts"))).toBe(true);

      // ── teardown ───────────────────────────────────────
      mgr.teardown("S01");

      const branchesAfterTeardown = gitBranches(tempDir);
      expect(branchesAfterTeardown).not.toContain("stupid/S01-test-slice");
      expect(branchesAfterTeardown).toEqual(["main"]);
    });
  });

  // ── worktree mode ───────────────────────────────────────

  describe("worktree mode full lifecycle", () => {
    it("create → commit → merge → teardown with real git", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "worktree",
      });

      // ── create ──────────────────────────────────────────
      mgr.create("S01", "test slice");

      // Worktree directory should exist physically
      const worktreeDir = join(tempDir, ".stupid", "worktrees", "S01");
      expect(existsSync(worktreeDir)).toBe(true);

      // git worktree list should show it
      const worktreeList = execSync("git worktree list", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();
      expect(worktreeList).toContain(".stupid/worktrees/S01");

      // getWorkingDirectory returns the worktree path
      expect(mgr.getWorkingDirectory("S01")).toBe(worktreeDir);

      // Main working tree should still be on main
      const mainBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();
      expect(mainBranch).toBe("main");

      // ── commit T01 (in worktree dir) ───────────────────
      writeFileSync(
        join(worktreeDir, "feature.ts"),
        "export const y = 2;\n",
      );
      mgr.commit("S01", "T01", "add feature");

      // Commit appears in worktree's git log
      const worktreeLog = gitLog(worktreeDir);
      expect(worktreeLog[0]).toContain("feat(S01/T01): add feature");

      // ── merge (squash) ─────────────────────────────────
      mgr.merge("S01");

      // Squash commit should be on main
      const mainLog = gitLog(tempDir);
      expect(mainLog).toHaveLength(2); // initial + squash
      expect(mainLog[0]).toContain("feat(S01): squash merge");

      // File from worktree should now exist in main working tree
      expect(existsSync(join(tempDir, "feature.ts"))).toBe(true);

      // ── teardown ───────────────────────────────────────
      mgr.teardown("S01");

      // Worktree directory should be removed
      expect(existsSync(worktreeDir)).toBe(false);

      // Branch should be deleted
      const branchesAfterTeardown = gitBranches(tempDir);
      expect(branchesAfterTeardown).not.toContain("stupid/S01-test-slice");
      expect(branchesAfterTeardown).toEqual(["main"]);
    });
  });

  // ── none mode ───────────────────────────────────────────

  describe("none mode", () => {
    it("commits directly to current branch; create/merge/teardown are no-ops", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "none",
      });

      // ── create (no-op) ─────────────────────────────────
      mgr.create("S01", "test");

      // No new branch should be created
      const branchesAfterCreate = gitBranches(tempDir);
      expect(branchesAfterCreate).toEqual(["main"]);

      // getWorkingDirectory returns projectRoot
      expect(mgr.getWorkingDirectory("S01")).toBe(tempDir);

      // ── commit T01 ─────────────────────────────────────
      writeFileSync(join(tempDir, "direct.ts"), "export const z = 3;\n");
      mgr.commit("S01", "T01", "direct commit");

      // Commit goes directly to main with R009 format
      const logAfterCommit = gitLog(tempDir);
      expect(logAfterCommit[0]).toContain("feat(S01/T01): direct commit");
      expect(logAfterCommit).toHaveLength(2); // initial + T01

      // Still on main
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();
      expect(branch).toBe("main");

      // ── merge (no-op) ──────────────────────────────────
      expect(() => mgr.merge("S01")).not.toThrow();

      // Log unchanged — no squash commit in none mode
      const logAfterMerge = gitLog(tempDir);
      expect(logAfterMerge).toHaveLength(2);

      // ── teardown (no-op) ───────────────────────────────
      expect(() => mgr.teardown("S01")).not.toThrow();

      // Branches unchanged
      const branchesAfterTeardown = gitBranches(tempDir);
      expect(branchesAfterTeardown).toEqual(["main"]);
    });
  });

  // ── R009 commit format ──────────────────────────────────

  describe("R009 commit format", () => {
    it("commit message is exactly feat(SLICE/TASK): message in git log", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "none",
      });

      mgr.create("S04", "format test");

      writeFileSync(join(tempDir, "code.ts"), "// code\n");
      mgr.commit("S04", "T01", "verify format");

      const subject = execSync("git log --format=%s -1", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      expect(subject).toBe("feat(S04/T01): verify format");
    });

    it("squash merge message contains feat(SLICE): pattern", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "branch",
      });

      mgr.create("S02", "merge format");

      writeFileSync(join(tempDir, "a.ts"), "a\n");
      mgr.commit("S02", "T01", "task one");

      mgr.merge("S02");

      const subject = execSync("git log --format=%s -1", {
        cwd: tempDir,
        encoding: "utf-8",
      }).trim();

      expect(subject).toBe("feat(S02): squash merge merge format");

      mgr.teardown("S02");
    });
  });

  // ── listWorktrees static ────────────────────────────────

  describe("listWorktrees() with real repo", () => {
    it("returns worktree entries from a real git repo", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      // Only the main worktree initially
      const initial = WorktreeManager.listWorktrees(tempDir);
      expect(initial).toHaveLength(1);
      expect(initial[0].branch).toBe("main");

      // Add a worktree
      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "worktree",
      });
      mgr.create("S02", "list test");

      const afterCreate = WorktreeManager.listWorktrees(tempDir);
      expect(afterCreate).toHaveLength(2);
      expect(
        afterCreate.some((w) => w.branch === "stupid/S02-list-test"),
      ).toBe(true);

      // Make a commit so merge has something to squash
      const wtDir = mgr.getWorkingDirectory("S02");
      writeFileSync(join(wtDir, "list-test.ts"), "// list test\n");
      mgr.commit("S02", "T01", "list test commit");

      // Clean up properly
      mgr.merge("S02");
      mgr.teardown("S02");

      const afterTeardown = WorktreeManager.listWorktrees(tempDir);
      expect(afterTeardown).toHaveLength(1);
      expect(afterTeardown[0].branch).toBe("main");
    });

    it("returns empty array for non-git directory", () => {
      const dir = mkdtempSync(join(tmpdir(), "wm-no-git-"));
      tempDirs.push(dir);

      const result = WorktreeManager.listWorktrees(dir);
      expect(result).toEqual([]);
    });
  });

  // ── Squash verification ─────────────────────────────────

  describe("squash merge verification", () => {
    it("branch mode: main has exactly initial + 1 commits (not individual task commits)", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "branch",
      });

      mgr.create("S01", "multi task");

      // Make 3 task commits on the branch
      writeFileSync(join(tempDir, "t1.ts"), "t1\n");
      mgr.commit("S01", "T01", "task one");

      writeFileSync(join(tempDir, "t2.ts"), "t2\n");
      mgr.commit("S01", "T02", "task two");

      writeFileSync(join(tempDir, "t3.ts"), "t3\n");
      mgr.commit("S01", "T03", "task three");

      // Branch should have 4 commits (initial + 3 tasks)
      const branchLog = gitLog(tempDir);
      expect(branchLog).toHaveLength(4);

      // Squash merge
      mgr.merge("S01");

      // Main should have exactly 2 commits (initial + 1 squash)
      // NOT 4 (initial + 3 individual tasks)
      const mainLog = gitLog(tempDir);
      expect(mainLog).toHaveLength(2);

      // All 3 files should exist on main
      expect(existsSync(join(tempDir, "t1.ts"))).toBe(true);
      expect(existsSync(join(tempDir, "t2.ts"))).toBe(true);
      expect(existsSync(join(tempDir, "t3.ts"))).toBe(true);

      mgr.teardown("S01");
    });

    it("worktree mode: main has exactly initial + 1 commits after squash", () => {
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      const mgr = new WorktreeManager({
        projectRoot: tempDir,
        worktreeMode: "worktree",
      });

      mgr.create("S01", "worktree squash");

      const worktreeDir = mgr.getWorkingDirectory("S01");

      // Make 2 task commits in the worktree
      writeFileSync(join(worktreeDir, "w1.ts"), "w1\n");
      mgr.commit("S01", "T01", "wt task one");

      writeFileSync(join(worktreeDir, "w2.ts"), "w2\n");
      mgr.commit("S01", "T02", "wt task two");

      // Squash merge
      mgr.merge("S01");

      // Main should have exactly 2 commits
      const mainLog = gitLog(tempDir);
      expect(mainLog).toHaveLength(2);
      expect(mainLog[0]).toContain("feat(S01): squash merge");

      mgr.teardown("S01");
    });
  });

  // ── Temp directory cleanup ──────────────────────────────

  describe("temp directory cleanup", () => {
    it("all temp dirs tracked for cleanup in afterEach", () => {
      // This test just verifies the cleanup mechanism works —
      // creating a temp dir and confirming it was tracked
      const tempDir = createTempGitRepo();
      tempDirs.push(tempDir);

      expect(existsSync(tempDir)).toBe(true);
      expect(tempDirs).toContain(tempDir);
      // afterEach will remove it — next test can verify no leaks
    });
  });
});
