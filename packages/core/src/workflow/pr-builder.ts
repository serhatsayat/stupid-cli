import { execSync } from "node:child_process";

// ─── PRBuilder ───────────────────────────────────────────────

/**
 * Handles atomic git operations for the task execution pipeline.
 *
 * - `createCommit`: one commit per completed task (R009)
 * - `createBranch`: per-slice branch with slugified title
 * - `createPR`: optional GitHub PR creation (silent fallback)
 */
export class PRBuilder {
  private readonly cwd?: string;

  constructor(options?: { cwd?: string }) {
    this.cwd = options?.cwd;
  }

  // ── Helpers ──────────────────────────────────────────────

  private exec(command: string): void {
    execSync(command, {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });
  }

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ── Public API ───────────────────────────────────────────

  /**
   * Create an atomic git commit for a completed task (R009).
   *
   * Message format: `feat(SLICE_ID/TASK_ID): summary`
   *
   * @param sliceId  e.g. "S01"
   * @param taskId   e.g. "T01"
   * @param summary  Human-readable one-liner
   * @param files    Specific files to stage; omit to `git add -A`
   */
  createCommit(sliceId: string, taskId: string, summary: string, files?: string[]): void {
    if (files && files.length > 0) {
      this.exec(`git add ${files.join(" ")}`);
    } else {
      this.exec("git add -A");
    }
    const message = `feat(${sliceId}/${taskId}): ${summary}`;
    this.exec(`git commit -m "${message}"`);
  }

  /**
   * Create a per-slice feature branch.
   *
   * Branch format: `stupid/SLICE_ID-slugified-title`
   */
  createBranch(sliceId: string, title: string): void {
    const slug = PRBuilder.slugify(title);
    this.exec(`git checkout -b stupid/${sliceId}-${slug}`);
  }

  /**
   * Create a GitHub Pull Request via `gh` CLI.
   *
   * Fails silently if `gh` is not installed or not authenticated —
   * PR creation is best-effort, never blocks the pipeline.
   */
  createPR(title: string, body: string): void {
    try {
      this.exec(`gh pr create --title "${title}" --body "${body}"`);
    } catch {
      // gh may not be installed — silent fallback per design
    }
  }
}
