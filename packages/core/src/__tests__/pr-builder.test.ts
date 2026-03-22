import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock child_process ──────────────────────────────────────

const mockExecSync = vi.fn();

vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// ─── Import after mocks ─────────────────────────────────────

const { PRBuilder } = await import("../workflow/pr-builder.js");

// ─── Tests ───────────────────────────────────────────────────

describe("PRBuilder", () => {
  let builder: InstanceType<typeof PRBuilder>;

  beforeEach(() => {
    vi.resetAllMocks();
    builder = new PRBuilder();
  });

  describe("createCommit (R009)", () => {
    it("calls git add -A then git commit with correct message format", () => {
      builder.createCommit("S01", "T01", "Add login endpoint");

      expect(mockExecSync).toHaveBeenCalledTimes(2);

      // First call: git add -A (stage all)
      expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");

      // Second call: git commit with R009 format
      expect(mockExecSync.mock.calls[1][0]).toBe(
        'git commit -m "feat(S01/T01): Add login endpoint"',
      );
    });

    it("stages only specific files when provided", () => {
      builder.createCommit("S02", "T03", "Fix auth bug", [
        "src/auth.ts",
        "src/utils.ts",
      ]);

      expect(mockExecSync).toHaveBeenCalledTimes(2);

      // First call: git add with specific files
      expect(mockExecSync.mock.calls[0][0]).toBe(
        "git add src/auth.ts src/utils.ts",
      );

      // Second call: git commit
      expect(mockExecSync.mock.calls[1][0]).toBe(
        'git commit -m "feat(S02/T03): Fix auth bug"',
      );
    });

    it("stages all changes when no files provided", () => {
      builder.createCommit("S01", "T02", "Update tests");

      expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");
    });

    it("stages all changes when files array is empty", () => {
      builder.createCommit("S01", "T02", "Update tests", []);

      expect(mockExecSync.mock.calls[0][0]).toBe("git add -A");
    });

    it("uses correct feat(SLICE/TASK) prefix format", () => {
      builder.createCommit("S04", "T01", "Build test runner");

      const commitCall = mockExecSync.mock.calls[1][0] as string;
      expect(commitCall).toMatch(/^git commit -m "feat\(S04\/T01\): /);
    });
  });

  describe("createBranch", () => {
    it("creates branch with stupid/SLICE_ID-slug format", () => {
      builder.createBranch("S01", "Login Page Implementation");

      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync.mock.calls[0][0]).toBe(
        "git checkout -b stupid/S01-login-page-implementation",
      );
    });

    it("slugifies special characters in title", () => {
      builder.createBranch("S02", "Fix Auth & Session (v2)");

      expect(mockExecSync.mock.calls[0][0]).toBe(
        "git checkout -b stupid/S02-fix-auth-session-v2",
      );
    });

    it("handles multiple spaces and hyphens", () => {
      builder.createBranch("S03", "  multiple   spaces--here  ");

      const branchCmd = mockExecSync.mock.calls[0][0] as string;
      expect(branchCmd).toMatch(/^git checkout -b stupid\/S03-/);
      // No leading/trailing hyphens, no double hyphens in slug portion
      const slug = branchCmd.replace("git checkout -b stupid/S03-", "");
      expect(slug).not.toMatch(/^-|-$/);
      expect(slug).not.toMatch(/--/);
    });
  });

  describe("createPR", () => {
    it("calls gh pr create with title and body", () => {
      builder.createPR("Add login", "Implements login page with tests");

      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync.mock.calls[0][0]).toBe(
        'gh pr create --title "Add login" --body "Implements login page with tests"',
      );
    });

    it("does not throw when gh is missing (catches error silently)", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("gh: command not found");
      });

      // Should not throw
      expect(() =>
        builder.createPR("title", "body"),
      ).not.toThrow();
    });

    it("does not throw when gh is not authenticated", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("gh: not authenticated");
      });

      expect(() =>
        builder.createPR("title", "body"),
      ).not.toThrow();
    });
  });

  describe("cwd option", () => {
    it("passes cwd to all execSync calls", () => {
      const cwdBuilder = new PRBuilder({ cwd: "/my/project" });
      cwdBuilder.createCommit("S01", "T01", "test");

      for (const call of mockExecSync.mock.calls) {
        expect(call[1]).toEqual(
          expect.objectContaining({ cwd: "/my/project" }),
        );
      }
    });

    it("omits cwd when not provided", () => {
      const noCwdBuilder = new PRBuilder();
      noCwdBuilder.createCommit("S01", "T01", "test");

      for (const call of mockExecSync.mock.calls) {
        expect(call[1]?.cwd).toBeUndefined();
      }
    });
  });
});
