import { describe, it, expect, vi, beforeEach } from "vitest";
import { join } from "node:path";

// ─── Mock child_process ──────────────────────────────────────

const mockExecSync = vi.fn();

vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// ─── Import after mocks ─────────────────────────────────────

const { WorktreeManager } = await import(
  "../infrastructure/worktree-manager.js"
);

// ─── Helpers ─────────────────────────────────────────────────

const PROJECT_ROOT = "/tmp/my-project";

function createManager(mode: "worktree" | "branch" | "none") {
  return new WorktreeManager({ projectRoot: PROJECT_ROOT, worktreeMode: mode });
}

/**
 * Pre-configure mockExecSync so `git rev-parse --abbrev-ref HEAD`
 * returns "main" (needed by create() to track original branch).
 */
function mockCurrentBranch(branch = "main") {
  mockExecSync.mockImplementation((cmd: string) => {
    if (typeof cmd === "string" && cmd.includes("rev-parse --abbrev-ref HEAD")) {
      return `${branch}\n`;
    }
    return "";
  });
}

// ─── Tests ───────────────────────────────────────────────────

describe("WorktreeManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: return empty string for all commands
    mockExecSync.mockReturnValue("");
  });

  // ── getMode() ───────────────────────────────────────────

  describe("getMode()", () => {
    it("returns 'worktree' when configured", () => {
      expect(createManager("worktree").getMode()).toBe("worktree");
    });

    it("returns 'branch' when configured", () => {
      expect(createManager("branch").getMode()).toBe("branch");
    });

    it("returns 'none' when configured", () => {
      expect(createManager("none").getMode()).toBe("none");
    });
  });

  // ── getWorkingDirectory() ───────────────────────────────

  describe("getWorkingDirectory()", () => {
    it("returns worktree directory path in worktree mode", () => {
      const mgr = createManager("worktree");
      const dir = mgr.getWorkingDirectory("S01");
      expect(dir).toBe(join(PROJECT_ROOT, ".stupid", "worktrees", "S01"));
    });

    it("returns projectRoot in branch mode", () => {
      const mgr = createManager("branch");
      expect(mgr.getWorkingDirectory("S01")).toBe(PROJECT_ROOT);
    });

    it("returns projectRoot in none mode", () => {
      const mgr = createManager("none");
      expect(mgr.getWorkingDirectory("S01")).toBe(PROJECT_ROOT);
    });
  });

  // ── create() ────────────────────────────────────────────

  describe("create()", () => {
    describe("worktree mode", () => {
      it("records original branch and creates worktree with new branch", () => {
        mockCurrentBranch("main");
        const mgr = createManager("worktree");

        mgr.create("S01", "Login Page");

        // 1st call: rev-parse to get current branch
        expect(mockExecSync.mock.calls[0][0]).toBe(
          "git rev-parse --abbrev-ref HEAD",
        );

        // 2nd call: git worktree add
        const worktreeDir = join(PROJECT_ROOT, ".stupid", "worktrees", "S01");
        expect(mockExecSync.mock.calls[1][0]).toBe(
          `git worktree add ${worktreeDir} -b stupid/S01-login-page`,
        );
      });

      it("passes projectRoot as cwd for git commands", () => {
        mockCurrentBranch("develop");
        const mgr = createManager("worktree");

        mgr.create("S02", "Auth Feature");

        // Both calls should use projectRoot as cwd
        for (const call of mockExecSync.mock.calls) {
          expect(call[1]).toEqual(
            expect.objectContaining({ cwd: PROJECT_ROOT }),
          );
        }
      });
    });

    describe("branch mode", () => {
      it("records original branch and creates new branch", () => {
        mockCurrentBranch("main");
        const mgr = createManager("branch");

        mgr.create("S01", "Login Page");

        expect(mockExecSync.mock.calls[0][0]).toBe(
          "git rev-parse --abbrev-ref HEAD",
        );
        expect(mockExecSync.mock.calls[1][0]).toBe(
          "git checkout -b stupid/S01-login-page",
        );
      });
    });

    describe("none mode", () => {
      it("records original branch but does not create branch or worktree", () => {
        mockCurrentBranch("main");
        const mgr = createManager("none");

        mgr.create("S01", "Login Page");

        // Only the rev-parse call, no git branch/worktree creation
        expect(mockExecSync).toHaveBeenCalledTimes(1);
        expect(mockExecSync.mock.calls[0][0]).toBe(
          "git rev-parse --abbrev-ref HEAD",
        );
      });
    });

    it("slugifies special characters in branch name", () => {
      mockCurrentBranch("main");
      const mgr = createManager("branch");

      mgr.create("S02", "Fix Auth & Session (v2)");

      expect(mockExecSync.mock.calls[1][0]).toBe(
        "git checkout -b stupid/S02-fix-auth-session-v2",
      );
    });
  });

  // ── commit() ────────────────────────────────────────────

  describe("commit()", () => {
    describe("worktree mode", () => {
      it("stages all files and commits in worktree directory", () => {
        const mgr = createManager("worktree");

        mgr.commit("S01", "T01", "Add login endpoint");

        const worktreeDir = join(PROJECT_ROOT, ".stupid", "worktrees", "S01");

        expect(mockExecSync).toHaveBeenCalledTimes(2);
        expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");
        expect(mockExecSync.mock.calls[0][1]).toEqual(
          expect.objectContaining({ cwd: worktreeDir }),
        );

        expect(mockExecSync.mock.calls[1][0]).toBe(
          'git commit -m "feat(S01/T01): Add login endpoint"',
        );
        expect(mockExecSync.mock.calls[1][1]).toEqual(
          expect.objectContaining({ cwd: worktreeDir }),
        );
      });

      it("stages specific files when provided", () => {
        const mgr = createManager("worktree");

        mgr.commit("S01", "T02", "Fix auth", ["src/auth.ts", "src/utils.ts"]);

        expect(mockExecSync.mock.calls[0][0]).toBe(
          "git add src/auth.ts src/utils.ts",
        );
      });
    });

    describe("branch mode", () => {
      it("stages all files and commits in projectRoot", () => {
        const mgr = createManager("branch");

        mgr.commit("S01", "T01", "Add login endpoint");

        expect(mockExecSync).toHaveBeenCalledTimes(2);
        expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");
        expect(mockExecSync.mock.calls[0][1]).toEqual(
          expect.objectContaining({ cwd: PROJECT_ROOT }),
        );

        expect(mockExecSync.mock.calls[1][0]).toBe(
          'git commit -m "feat(S01/T01): Add login endpoint"',
        );
        expect(mockExecSync.mock.calls[1][1]).toEqual(
          expect.objectContaining({ cwd: PROJECT_ROOT }),
        );
      });
    });

    describe("none mode", () => {
      it("stages all files and commits in projectRoot", () => {
        const mgr = createManager("none");

        mgr.commit("S01", "T01", "Add login endpoint");

        expect(mockExecSync).toHaveBeenCalledTimes(2);
        expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");
        expect(mockExecSync.mock.calls[0][1]).toEqual(
          expect.objectContaining({ cwd: PROJECT_ROOT }),
        );

        expect(mockExecSync.mock.calls[1][0]).toBe(
          'git commit -m "feat(S01/T01): Add login endpoint"',
        );
      });
    });

    it("preserves R009 commit format: feat(SLICE_ID/TASK_ID): message", () => {
      const mgr = createManager("branch");
      mgr.commit("S04", "T01", "Build test runner");

      const commitCall = mockExecSync.mock.calls[1][0] as string;
      expect(commitCall).toMatch(/^git commit -m "feat\(S04\/T01\): /);
    });

    it("stages all changes when files array is empty", () => {
      const mgr = createManager("branch");
      mgr.commit("S01", "T02", "Update tests", []);

      expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");
    });

    it("stages specific files when files array is non-empty", () => {
      const mgr = createManager("branch");
      mgr.commit("S02", "T03", "Fix auth bug", [
        "src/auth.ts",
        "src/utils.ts",
      ]);

      expect(mockExecSync.mock.calls[0][0]).toBe(
        "git add src/auth.ts src/utils.ts",
      );
    });
  });

  // ── merge() ─────────────────────────────────────────────

  describe("merge()", () => {
    describe("worktree mode", () => {
      it("checks out original branch, squash merges, and commits", () => {
        mockCurrentBranch("main");
        const mgr = createManager("worktree");
        mgr.create("S01", "Login Page");

        mockExecSync.mockReset();
        mockExecSync.mockReturnValue("");

        mgr.merge("S01");

        expect(mockExecSync).toHaveBeenCalledTimes(3);
        expect(mockExecSync.mock.calls[0][0]).toBe("git checkout main");
        expect(mockExecSync.mock.calls[1][0]).toBe(
          "git merge --squash stupid/S01-login-page",
        );
        expect(mockExecSync.mock.calls[2][0]).toBe(
          'git commit -m "feat(S01): squash merge Login Page"',
        );
      });

      it("runs merge commands from projectRoot", () => {
        mockCurrentBranch("main");
        const mgr = createManager("worktree");
        mgr.create("S01", "Login Page");

        mockExecSync.mockReset();
        mockExecSync.mockReturnValue("");

        mgr.merge("S01");

        for (const call of mockExecSync.mock.calls) {
          expect(call[1]).toEqual(
            expect.objectContaining({ cwd: PROJECT_ROOT }),
          );
        }
      });
    });

    describe("branch mode", () => {
      it("checks out original branch, squash merges, and commits", () => {
        mockCurrentBranch("develop");
        const mgr = createManager("branch");
        mgr.create("S01", "Auth Feature");

        mockExecSync.mockReset();
        mockExecSync.mockReturnValue("");

        mgr.merge("S01");

        expect(mockExecSync).toHaveBeenCalledTimes(3);
        expect(mockExecSync.mock.calls[0][0]).toBe("git checkout develop");
        expect(mockExecSync.mock.calls[1][0]).toBe(
          "git merge --squash stupid/S01-auth-feature",
        );
        expect(mockExecSync.mock.calls[2][0]).toBe(
          'git commit -m "feat(S01): squash merge Auth Feature"',
        );
      });
    });

    describe("none mode", () => {
      it("is a no-op — no git commands executed", () => {
        const mgr = createManager("none");

        mgr.merge("S01");

        expect(mockExecSync).not.toHaveBeenCalled();
      });
    });

    it("throws descriptive error for unknown sliceId", () => {
      const mgr = createManager("branch");

      expect(() => mgr.merge("S99")).toThrow(
        /unknown sliceId "S99"/,
      );
      expect(() => mgr.merge("S99")).toThrow(
        /Was create\(\) called/,
      );
    });
  });

  // ── teardown() ──────────────────────────────────────────

  describe("teardown()", () => {
    describe("worktree mode", () => {
      it("removes worktree and deletes branch", () => {
        mockCurrentBranch("main");
        const mgr = createManager("worktree");
        mgr.create("S01", "Login Page");

        mockExecSync.mockReset();
        mockExecSync.mockReturnValue("");

        mgr.teardown("S01");

        const worktreeDir = join(PROJECT_ROOT, ".stupid", "worktrees", "S01");
        expect(mockExecSync).toHaveBeenCalledTimes(2);
        expect(mockExecSync.mock.calls[0][0]).toBe(
          `git worktree remove ${worktreeDir}`,
        );
        expect(mockExecSync.mock.calls[1][0]).toBe(
          "git branch -D stupid/S01-login-page",
        );
      });
    });

    describe("branch mode", () => {
      it("deletes branch only (no worktree removal)", () => {
        mockCurrentBranch("main");
        const mgr = createManager("branch");
        mgr.create("S01", "Login Page");

        mockExecSync.mockReset();
        mockExecSync.mockReturnValue("");

        mgr.teardown("S01");

        expect(mockExecSync).toHaveBeenCalledTimes(1);
        expect(mockExecSync.mock.calls[0][0]).toBe(
          "git branch -D stupid/S01-login-page",
        );
      });
    });

    describe("none mode", () => {
      it("is a no-op — no git commands executed", () => {
        const mgr = createManager("none");

        mgr.teardown("S01");

        expect(mockExecSync).not.toHaveBeenCalled();
      });
    });

    it("throws descriptive error for unknown sliceId", () => {
      const mgr = createManager("worktree");

      expect(() => mgr.teardown("S99")).toThrow(
        /unknown sliceId "S99"/,
      );
    });

    it("cleans up tracking entry after teardown", () => {
      mockCurrentBranch("main");
      const mgr = createManager("branch");
      mgr.create("S01", "Login Page");

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      mgr.teardown("S01");

      // Second teardown for same slice should throw (entry was removed)
      expect(() => mgr.teardown("S01")).toThrow(/unknown sliceId "S01"/);
    });
  });

  // ── listWorktrees() static ──────────────────────────────

  describe("listWorktrees() static", () => {
    it("parses porcelain output into path/branch pairs", () => {
      mockExecSync.mockReturnValue(
        [
          "worktree /tmp/my-project",
          "HEAD abc123def456",
          "branch refs/heads/main",
          "",
          "worktree /tmp/my-project/.stupid/worktrees/S01",
          "HEAD def456abc789",
          "branch refs/heads/stupid/S01-login-page",
        ].join("\n"),
      );

      const result = WorktreeManager.listWorktrees("/tmp/my-project");

      expect(result).toEqual([
        { path: "/tmp/my-project", branch: "main" },
        {
          path: "/tmp/my-project/.stupid/worktrees/S01",
          branch: "stupid/S01-login-page",
        },
      ]);
    });

    it("strips refs/heads/ prefix from branch names", () => {
      mockExecSync.mockReturnValue(
        [
          "worktree /tmp/proj",
          "HEAD aaa",
          "branch refs/heads/develop",
        ].join("\n"),
      );

      const result = WorktreeManager.listWorktrees("/tmp/proj");

      expect(result[0].branch).toBe("develop");
    });

    it("returns empty array when git command fails", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("not a git repository");
      });

      const result = WorktreeManager.listWorktrees("/tmp/not-a-repo");

      expect(result).toEqual([]);
    });

    it("returns empty array when output is empty", () => {
      mockExecSync.mockReturnValue("");

      const result = WorktreeManager.listWorktrees("/tmp/empty-repo");

      expect(result).toEqual([]);
    });

    it("handles worktree entries without branch line (detached HEAD)", () => {
      mockExecSync.mockReturnValue(
        [
          "worktree /tmp/proj",
          "HEAD abc123",
          "detached",
        ].join("\n"),
      );

      const result = WorktreeManager.listWorktrees("/tmp/proj");

      expect(result).toEqual([{ path: "/tmp/proj", branch: "" }]);
    });

    it("passes projectRoot as cwd", () => {
      mockExecSync.mockReturnValue("");

      WorktreeManager.listWorktrees("/my/project");

      expect(mockExecSync.mock.calls[0][1]).toEqual(
        expect.objectContaining({ cwd: "/my/project" }),
      );
    });
  });

  // ── Error Handling ──────────────────────────────────────

  describe("error handling", () => {
    it("throws descriptive error when git command fails", () => {
      mockExecSync.mockImplementation(() => {
        const err = new Error("Command failed") as Error & { stderr: string };
        err.stderr = "fatal: not a git repository";
        throw err;
      });

      const mgr = createManager("branch");

      expect(() => mgr.create("S01", "Test")).toThrow(
        /WorktreeManager git command failed/,
      );
      expect(() => mgr.create("S01", "Test")).toThrow(
        /not a git repository/,
      );
    });

    it("includes the failed command in the error message", () => {
      mockExecSync.mockImplementation(() => {
        const err = new Error("Command failed") as Error & { stderr: string };
        err.stderr = "error: branch already exists";
        throw err;
      });

      const mgr = createManager("branch");

      expect(() => mgr.create("S01", "Test")).toThrow(
        /git rev-parse --abbrev-ref HEAD/,
      );
    });
  });

  // ── Full lifecycle ──────────────────────────────────────

  describe("full lifecycle (integration-style with mocks)", () => {
    it("worktree mode: create → commit → merge → teardown", () => {
      mockCurrentBranch("main");
      const mgr = createManager("worktree");

      // create
      mgr.create("S01", "Login Page");

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      // commit
      mgr.commit("S01", "T01", "Add login form");

      const worktreeDir = join(PROJECT_ROOT, ".stupid", "worktrees", "S01");
      expect(mockExecSync.mock.calls[0][1]).toEqual(
        expect.objectContaining({ cwd: worktreeDir }),
      );

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      // merge
      mgr.merge("S01");
      expect(mockExecSync.mock.calls[0][0]).toBe("git checkout main");
      expect(mockExecSync.mock.calls[1][0]).toContain("merge --squash");

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      // teardown
      mgr.teardown("S01");
      expect(mockExecSync.mock.calls[0][0]).toContain("worktree remove");
      expect(mockExecSync.mock.calls[1][0]).toContain("branch -D");
    });

    it("branch mode: create → commit → merge → teardown", () => {
      mockCurrentBranch("main");
      const mgr = createManager("branch");

      mgr.create("S01", "Login Page");

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      mgr.commit("S01", "T01", "Add login form");
      expect(mockExecSync.mock.calls[0][1]).toEqual(
        expect.objectContaining({ cwd: PROJECT_ROOT }),
      );

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      mgr.merge("S01");
      expect(mockExecSync.mock.calls[0][0]).toBe("git checkout main");

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      mgr.teardown("S01");
      expect(mockExecSync.mock.calls[0][0]).toContain("branch -D");
    });

    it("none mode: create → commit → merge → teardown (minimal ops)", () => {
      mockCurrentBranch("main");
      const mgr = createManager("none");

      // create — only rev-parse, no branch/worktree
      mgr.create("S01", "Login Page");
      expect(mockExecSync).toHaveBeenCalledTimes(1);

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      // commit — stages and commits in projectRoot
      mgr.commit("S01", "T01", "Add login form");
      expect(mockExecSync).toHaveBeenCalledTimes(2);

      mockExecSync.mockReset();
      mockExecSync.mockReturnValue("");

      // merge — no-op
      mgr.merge("S01");
      expect(mockExecSync).not.toHaveBeenCalled();

      // teardown — no-op
      mgr.teardown("S01");
      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });
});
