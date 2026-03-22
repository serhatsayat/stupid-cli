import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock child_process ──────────────────────────────────────

const mockExecSync = vi.fn();

vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// ─── Import after mocks ─────────────────────────────────────

const { TestRunner } = await import("../workflow/test-runner.js");
import type { TestResult } from "../workflow/test-runner.js";

// ─── Helpers ─────────────────────────────────────────────────

function vitestOutput(passed: number, failed: number, total: number): string {
  const parts = [`${passed} passed`];
  if (failed > 0) parts.push(`${failed} failed`);
  return ` ✓ src/__tests__/example.test.ts (${total} tests)\n\nTests  ${parts.join(" | ")} (${total})`;
}

function jestOutput(passed: number, failed: number, total: number): string {
  const parts: string[] = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  parts.push(`${total} total`);
  return `Test Suites: 1 passed, 1 total\nTests: ${parts.join(", ")}`;
}

// ─── Tests ───────────────────────────────────────────────────

describe("TestRunner", () => {
  let runner: InstanceType<typeof TestRunner>;

  beforeEach(() => {
    vi.clearAllMocks();
    runner = new TestRunner();
  });

  describe("Vitest output parsing", () => {
    it("parses passing Vitest output correctly", () => {
      mockExecSync.mockReturnValue(Buffer.from(vitestOutput(5, 0, 5)));
      const result: TestResult = runner.run("npx vitest run");

      expect(result.passed).toBe(true);
      expect(result.passing).toBe(5);
      expect(result.failing).toBe(0);
      expect(result.total).toBe(5);
      expect(result.output).toContain("Tests");
    });

    it("parses Vitest output with failures", () => {
      // Simulate non-zero exit via thrown error
      const err = new Error("Command failed") as Error & {
        stdout: Buffer;
        stderr: Buffer;
      };
      err.stdout = Buffer.from(vitestOutput(3, 2, 5));
      err.stderr = Buffer.from("");
      mockExecSync.mockImplementation(() => {
        throw err;
      });

      const result = runner.run("npx vitest run");

      expect(result.passed).toBe(false);
      expect(result.passing).toBe(3);
      expect(result.failing).toBe(2);
      expect(result.total).toBe(5);
    });
  });

  describe("Jest output parsing", () => {
    it("parses passing Jest output correctly", () => {
      mockExecSync.mockReturnValue(Buffer.from(jestOutput(8, 0, 8)));
      const result = runner.run("npx jest");

      expect(result.passed).toBe(true);
      expect(result.passing).toBe(8);
      expect(result.failing).toBe(0);
      expect(result.total).toBe(8);
    });

    it("parses Jest output with failures", () => {
      const err = new Error("Command failed") as Error & {
        stdout: Buffer;
        stderr: Buffer;
      };
      err.stdout = Buffer.from(jestOutput(6, 2, 8));
      err.stderr = Buffer.from("");
      mockExecSync.mockImplementation(() => {
        throw err;
      });

      const result = runner.run("npx jest");

      expect(result.passed).toBe(false);
      expect(result.passing).toBe(6);
      expect(result.failing).toBe(2);
      expect(result.total).toBe(8);
    });
  });

  describe("error handling", () => {
    it("returns passed: false on non-zero exit code", () => {
      const err = new Error("exit code 1") as Error & {
        stdout: Buffer;
        stderr: Buffer;
      };
      err.stdout = Buffer.from(vitestOutput(0, 3, 3));
      err.stderr = Buffer.from("FAIL");
      mockExecSync.mockImplementation(() => {
        throw err;
      });

      const result = runner.run("npx vitest run");

      expect(result.passed).toBe(false);
      expect(result.output).toContain("FAIL");
    });

    it("captures output even on failure", () => {
      const err = new Error("Command failed") as Error & {
        stdout: Buffer;
        stderr: Buffer;
      };
      err.stdout = Buffer.from("some stdout");
      err.stderr = Buffer.from("some stderr");
      mockExecSync.mockImplementation(() => {
        throw err;
      });

      const result = runner.run("npx vitest run");

      expect(result.output).toContain("some stdout");
      expect(result.output).toContain("some stderr");
    });

    it("handles empty/malformed output gracefully (returns zeros)", () => {
      mockExecSync.mockReturnValue(Buffer.from("no test summary here"));
      const result = runner.run("npx vitest run");

      // No parsable test counts → zeros, but command succeeded so passed is true
      expect(result.passing).toBe(0);
      expect(result.failing).toBe(0);
      expect(result.total).toBe(0);
      expect(result.passed).toBe(true);
    });
  });

  describe("options", () => {
    it("respects timeout option", () => {
      mockExecSync.mockReturnValue(Buffer.from(vitestOutput(1, 0, 1)));
      runner.run("npx vitest run", { timeout: 30_000 });

      expect(mockExecSync).toHaveBeenCalledWith(
        "npx vitest run",
        expect.objectContaining({ timeout: 30_000 }),
      );
    });

    it("passes cwd option to execSync", () => {
      mockExecSync.mockReturnValue(Buffer.from(vitestOutput(1, 0, 1)));
      runner.run("npx vitest run", { cwd: "/some/project" });

      expect(mockExecSync).toHaveBeenCalledWith(
        "npx vitest run",
        expect.objectContaining({ cwd: "/some/project" }),
      );
    });

    it("uses default 60s timeout when not specified", () => {
      mockExecSync.mockReturnValue(Buffer.from(vitestOutput(1, 0, 1)));
      runner.run("npx vitest run");

      expect(mockExecSync).toHaveBeenCalledWith(
        "npx vitest run",
        expect.objectContaining({ timeout: 60_000 }),
      );
    });
  });

  describe("duration tracking", () => {
    it("returns durationMs as a non-negative number", () => {
      mockExecSync.mockReturnValue(Buffer.from(vitestOutput(1, 0, 1)));
      const result = runner.run("npx vitest run");

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe("number");
    });
  });
});
