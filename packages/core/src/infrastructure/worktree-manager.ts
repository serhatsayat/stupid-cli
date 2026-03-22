import { execSync } from "node:child_process";
import { join } from "node:path";
import type { WorktreeMode } from "../types/index.js";
import type { IWorktreeManager } from "../orchestrator/interfaces.js";

// ─── WorktreeManager ─────────────────────────────────────────

/**
 * Per-slice git isolation across three modes:
 *
 * - `worktree`: Full isolation via `git worktree add/remove`.
 *   Each slice gets its own working directory.
 * - `branch`: Lightweight isolation via `git checkout -b`.
 *   All slices share the same working tree but use separate branches.
 * - `none`: No git isolation. Commits go directly to the current branch.
 *   Create/merge/teardown are no-ops.
 *
 * The `commit()` method preserves the R009 format:
 * `feat(SLICE_ID/TASK_ID): message`
 */
export class WorktreeManager implements IWorktreeManager {
  private readonly projectRoot: string;
  private readonly worktreeMode: WorktreeMode;

  /**
   * Tracks per-slice metadata needed for merge and teardown.
   * Populated in `create()`, consumed in `merge()` and `teardown()`.
   */
  private readonly slices = new Map<
    string,
    { branch: string; title: string; originalBranch: string }
  >();

  constructor(options: { projectRoot: string; worktreeMode: WorktreeMode }) {
    this.projectRoot = options.projectRoot;
    this.worktreeMode = options.worktreeMode;
  }

  // ── Helpers ──────────────────────────────────────────────

  private exec(command: string, cwd?: string): string {
    try {
      return execSync(command, {
        cwd: cwd ?? this.projectRoot,
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf-8",
      }).trim();
    } catch (err: unknown) {
      const error = err as { stderr?: string; message?: string };
      const stderr = error.stderr ?? error.message ?? "Unknown git error";
      throw new Error(
        `WorktreeManager git command failed: ${command}\n${stderr.toString().trim()}`,
      );
    }
  }

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private branchName(sliceId: string, title: string): string {
    return `stupid/${sliceId}-${WorktreeManager.slugify(title)}`;
  }

  private worktreeDir(sliceId: string): string {
    return join(this.projectRoot, ".stupid", "worktrees", sliceId);
  }

  // ── IWorktreeManager ────────────────────────────────────

  /**
   * Create per-slice git isolation.
   *
   * - `worktree`: `git worktree add <dir> -b <branch>` from projectRoot
   * - `branch`: `git checkout -b <branch>` from projectRoot
   * - `none`: no-op
   */
  create(sliceId: string, title: string): void {
    const originalBranch = this.exec("git rev-parse --abbrev-ref HEAD");
    const branch = this.branchName(sliceId, title);

    this.slices.set(sliceId, { branch, title, originalBranch });

    switch (this.worktreeMode) {
      case "worktree": {
        const dir = this.worktreeDir(sliceId);
        this.exec(`git worktree add ${dir} -b ${branch}`);
        break;
      }
      case "branch":
        this.exec(`git checkout -b ${branch}`);
        break;
      case "none":
        // no-op
        break;
    }
  }

  /**
   * Create an atomic git commit for a completed task (R009).
   *
   * Message format: `feat(SLICE_ID/TASK_ID): message`
   *
   * - `worktree`: runs in worktree directory
   * - `branch`/`none`: runs in projectRoot
   */
  commit(sliceId: string, taskId: string, message: string, files?: string[]): void {
    const cwd =
      this.worktreeMode === "worktree"
        ? this.worktreeDir(sliceId)
        : this.projectRoot;

    if (files && files.length > 0) {
      this.exec(`git add ${files.join(" ")}`, cwd);
    } else {
      this.exec("git add -A", cwd);
    }

    const commitMsg = `feat(${sliceId}/${taskId}): ${message}`;
    this.exec(`git commit -m "${commitMsg}"`, cwd);
  }

  /**
   * Squash-merge the slice branch back to the original branch.
   *
   * - `worktree`: checkout original, squash merge, commit
   * - `branch`: checkout original, squash merge, commit
   * - `none`: no-op
   */
  merge(sliceId: string): void {
    if (this.worktreeMode === "none") return;

    const entry = this.slices.get(sliceId);
    if (!entry) {
      throw new Error(
        `WorktreeManager.merge(): unknown sliceId "${sliceId}". ` +
          `Was create() called for this slice?`,
      );
    }

    const { branch, title, originalBranch } = entry;

    this.exec(`git checkout ${originalBranch}`);
    this.exec(`git merge --squash ${branch}`);
    this.exec(
      `git commit -m "feat(${sliceId}): squash merge ${title}"`,
    );
  }

  /**
   * Clean up git resources after a slice is merged.
   *
   * - `worktree`: remove worktree directory, delete branch
   * - `branch`: delete branch
   * - `none`: no-op
   */
  teardown(sliceId: string): void {
    if (this.worktreeMode === "none") return;

    const entry = this.slices.get(sliceId);
    if (!entry) {
      throw new Error(
        `WorktreeManager.teardown(): unknown sliceId "${sliceId}". ` +
          `Was create() called for this slice?`,
      );
    }

    const { branch } = entry;

    if (this.worktreeMode === "worktree") {
      const dir = this.worktreeDir(sliceId);
      this.exec(`git worktree remove ${dir}`);
    }

    this.exec(`git branch -D ${branch}`);
    this.slices.delete(sliceId);
  }

  /**
   * Returns the configured isolation mode.
   */
  getMode(): WorktreeMode {
    return this.worktreeMode;
  }

  /**
   * Returns the working directory for a slice.
   *
   * - `worktree`: worktree directory path
   * - `branch`/`none`: projectRoot
   */
  getWorkingDirectory(sliceId: string): string {
    if (this.worktreeMode === "worktree") {
      return this.worktreeDir(sliceId);
    }
    return this.projectRoot;
  }

  // ── Static Utilities ────────────────────────────────────

  /**
   * List all git worktrees for a project.
   * Used by S05 Doctor to detect stale worktrees.
   *
   * Parses `git worktree list --porcelain` output format:
   * ```
   * worktree /path/to/main
   * HEAD abc123
   * branch refs/heads/main
   *
   * worktree /path/to/wt1
   * HEAD def456
   * branch refs/heads/stupid/S01-feature
   * ```
   */
  static listWorktrees(
    projectRoot: string,
  ): Array<{ path: string; branch: string }> {
    let output: string;
    try {
      output = execSync("git worktree list --porcelain", {
        cwd: projectRoot,
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf-8",
      }).trim();
    } catch {
      return [];
    }

    if (!output) return [];

    const results: Array<{ path: string; branch: string }> = [];
    const blocks = output.split("\n\n");

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      let path = "";
      let branch = "";

      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          path = line.slice("worktree ".length);
        } else if (line.startsWith("branch ")) {
          // Strip refs/heads/ prefix for readability
          branch = line.slice("branch ".length).replace("refs/heads/", "");
        }
      }

      if (path) {
        results.push({ path, branch });
      }
    }

    return results;
  }
}
