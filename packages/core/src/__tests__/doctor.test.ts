import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { Doctor } from "../infrastructure/doctor.js";
import { WorktreeManager } from "../infrastructure/worktree-manager.js";

function makeStupidDir(tmpDir: string): string {
  const stupidDir = join(tmpDir, ".stupid");
  mkdirSync(stupidDir, { recursive: true });
  return stupidDir;
}

describe("Doctor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "doctor-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ── Clean state ─────────────────────────────────────────

  describe("clean state (no .stupid/ directory)", () => {
    it("all checks pass when .stupid/ does not exist", () => {
      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      expect(report.passed).toBe(true);
      expect(report.checks.every((c) => c.status !== "fail")).toBe(true);
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── Lock File checks ───────────────────────────────────

  describe("lock file checks", () => {
    it("passes when no lock file exists", () => {
      makeStupidDir(tmpDir);
      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const lockCheck = report.checks.find((c) => c.name === "Lock File");
      expect(lockCheck).toBeDefined();
      expect(lockCheck!.status).toBe("pass");
      expect(lockCheck!.message).toBe("No lock file");
    });

    it("passes when lock file has valid JSON with current PID", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "auto.lock"),
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
          heartbeat: new Date().toISOString(),
        }),
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const lockCheck = report.checks.find((c) => c.name === "Lock File");
      expect(lockCheck!.status).toBe("pass");
      expect(lockCheck!.message).toContain("active PID");
    });

    it("fails when lock file has invalid JSON", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(join(stupidDir, "auto.lock"), "{not valid json!!!", "utf-8");

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const lockCheck = report.checks.find((c) => c.name === "Lock File");
      expect(lockCheck!.status).toBe("fail");
      expect(lockCheck!.message).toContain("Invalid JSON");
    });

    it("warns when lock file has dead PID (stale lock)", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "auto.lock"),
        JSON.stringify({
          pid: 999999,
          startedAt: "2025-01-01T00:00:00.000Z",
          heartbeat: "2025-01-01T00:00:00.000Z",
        }),
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const lockCheck = report.checks.find((c) => c.name === "Lock File");
      expect(lockCheck!.status).toBe("warn");
      expect(lockCheck!.message).toContain("Stale lock");
      expect(lockCheck!.details).toContain("999999");
    });

    it("fails when lock file is missing required fields", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "auto.lock"),
        JSON.stringify({ pid: "not-a-number" }),
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const lockCheck = report.checks.find((c) => c.name === "Lock File");
      expect(lockCheck!.status).toBe("fail");
      expect(lockCheck!.message).toContain("missing required fields");
    });
  });

  // ── State File checks ──────────────────────────────────

  describe("state file checks", () => {
    it("passes when no state.json exists", () => {
      makeStupidDir(tmpDir);
      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const stateCheck = report.checks.find((c) => c.name === "State File");
      expect(stateCheck!.status).toBe("pass");
      expect(stateCheck!.message).toBe("No active session");
    });

    it("passes when state.json has valid structure", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "state.json"),
        JSON.stringify({
          plan: { slices: [] },
          progress: {
            sessionId: "test-session-123",
            startedAt: "2025-01-01T00:00:00.000Z",
            completedTasks: [],
            failedTasks: [],
            totalCostUsd: 0,
            totalTokensUsed: 0,
          },
        }),
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const stateCheck = report.checks.find((c) => c.name === "State File");
      expect(stateCheck!.status).toBe("pass");
      expect(stateCheck!.message).toBe("State file is valid");
    });

    it("fails when state.json has invalid JSON", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(join(stupidDir, "state.json"), "not json at all", "utf-8");

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const stateCheck = report.checks.find((c) => c.name === "State File");
      expect(stateCheck!.status).toBe("fail");
      expect(stateCheck!.message).toContain("Invalid JSON");
    });

    it("fails when state.json is missing plan key", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "state.json"),
        JSON.stringify({ progress: { sessionId: "test" } }),
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const stateCheck = report.checks.find((c) => c.name === "State File");
      expect(stateCheck!.status).toBe("fail");
      expect(stateCheck!.message).toContain("Missing 'plan' key");
    });

    it("fails when state.json is missing progress.sessionId", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "state.json"),
        JSON.stringify({
          plan: { slices: [] },
          progress: { startedAt: "2025-01-01" },
        }),
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const stateCheck = report.checks.find((c) => c.name === "State File");
      expect(stateCheck!.status).toBe("fail");
      expect(stateCheck!.message).toContain("Missing 'progress.sessionId'");
    });
  });

  // ── Database checks ────────────────────────────────────

  describe("database checks", () => {
    it("passes when no DB files exist", () => {
      makeStupidDir(tmpDir);
      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const dbChecks = report.checks.filter((c) =>
        c.name.startsWith("Database"),
      );
      expect(dbChecks.length).toBe(2);
      dbChecks.forEach((c) => {
        expect(c.status).toBe("pass");
        expect(c.message).toBe("Not created yet");
      });
    });

    it("passes when DB files are valid SQLite databases", () => {
      const stupidDir = makeStupidDir(tmpDir);

      // Create a valid MEMORY.db
      const memDb = new Database(join(stupidDir, "MEMORY.db"));
      memDb.exec("CREATE TABLE test (id INTEGER PRIMARY KEY)");
      memDb.close();

      // Create a valid routing.db
      const routeDb = new Database(join(stupidDir, "routing.db"));
      routeDb.exec("CREATE TABLE test (id INTEGER PRIMARY KEY)");
      routeDb.close();

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const dbChecks = report.checks.filter((c) =>
        c.name.startsWith("Database"),
      );
      expect(dbChecks.length).toBe(2);
      dbChecks.forEach((c) => {
        expect(c.status).toBe("pass");
        expect(c.message).toBe("Integrity check passed");
      });
    });

    it("fails when DB file is corrupt", () => {
      const stupidDir = makeStupidDir(tmpDir);

      // Write garbage bytes to simulate corruption
      writeFileSync(join(stupidDir, "MEMORY.db"), "garbage data not a sqlite db");

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const memCheck = report.checks.find(
        (c) => c.name === "Database (MEMORY.db)",
      );
      expect(memCheck!.status).toBe("fail");
      expect(memCheck!.message).toContain("Cannot open");
    });
  });

  // ── Worktree checks ────────────────────────────────────

  describe("worktree checks", () => {
    it("passes when no worktrees are found", () => {
      makeStupidDir(tmpDir);
      vi.spyOn(WorktreeManager, "listWorktrees").mockReturnValue([]);

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const wtCheck = report.checks.find((c) => c.name === "Worktrees");
      expect(wtCheck!.status).toBe("pass");
      expect(wtCheck!.message).toContain("No stupid worktrees");
    });

    it("passes when all worktree paths exist", () => {
      const stupidDir = makeStupidDir(tmpDir);
      // Create a worktree directory that exists
      const wtPath = join(stupidDir, "worktrees", "S01");
      mkdirSync(wtPath, { recursive: true });

      vi.spyOn(WorktreeManager, "listWorktrees").mockReturnValue([
        { path: wtPath, branch: "stupid/S01-feature" },
      ]);

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const wtCheck = report.checks.find((c) => c.name === "Worktrees");
      expect(wtCheck!.status).toBe("pass");
      expect(wtCheck!.message).toContain("1 worktree(s) all valid");
    });

    it("warns when worktree paths are missing on disk", () => {
      makeStupidDir(tmpDir);
      vi.spyOn(WorktreeManager, "listWorktrees").mockReturnValue([
        {
          path: "/nonexistent/path/worktree1",
          branch: "stupid/S01-feature",
        },
        {
          path: "/nonexistent/path/worktree2",
          branch: "stupid/S02-bugfix",
        },
      ]);

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const wtCheck = report.checks.find((c) => c.name === "Worktrees");
      expect(wtCheck!.status).toBe("warn");
      expect(wtCheck!.message).toContain("2 stale worktree(s)");
      expect(wtCheck!.details).toContain("stupid/S01-feature");
      expect(wtCheck!.details).toContain("stupid/S02-bugfix");
    });

    it("ignores non-stupid worktrees", () => {
      makeStupidDir(tmpDir);
      vi.spyOn(WorktreeManager, "listWorktrees").mockReturnValue([
        { path: "/some/path", branch: "main" },
        { path: "/other/path", branch: "feature/something" },
      ]);

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const wtCheck = report.checks.find((c) => c.name === "Worktrees");
      expect(wtCheck!.status).toBe("pass");
      expect(wtCheck!.message).toContain("No stupid worktrees");
    });
  });

  // ── Config checks ──────────────────────────────────────

  describe("config checks", () => {
    it("passes when no config.yml exists (using defaults)", () => {
      makeStupidDir(tmpDir);
      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const configCheck = report.checks.find((c) => c.name === "Config");
      expect(configCheck!.status).toBe("pass");
      expect(configCheck!.message).toContain("Using defaults");
    });

    it("passes when config.yml is valid YAML that merges cleanly", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(
        join(stupidDir, "config.yml"),
        "verbose: true\nprofile: budget\n",
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const configCheck = report.checks.find((c) => c.name === "Config");
      expect(configCheck!.status).toBe("pass");
      expect(configCheck!.message).toBe("Config is valid");
    });

    it("fails when config.yml has invalid YAML syntax", () => {
      const stupidDir = makeStupidDir(tmpDir);
      writeFileSync(join(stupidDir, "config.yml"), "{{{invalid yaml", "utf-8");

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const configCheck = report.checks.find((c) => c.name === "Config");
      expect(configCheck!.status).toBe("fail");
      expect(configCheck!.message).toContain("Invalid YAML");
    });

    it("fails when config.yml has schema-violating values", () => {
      const stupidDir = makeStupidDir(tmpDir);
      // Write valid YAML but with invalid schema values
      writeFileSync(
        join(stupidDir, "config.yml"),
        "profile: nonexistent_profile\nbudget:\n  hardLimitUsd: -100\n",
        "utf-8",
      );

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const configCheck = report.checks.find((c) => c.name === "Config");
      expect(configCheck!.status).toBe("fail");
      expect(configCheck!.message).toContain("Config validation failed");
      expect(configCheck!.details).toBeDefined();
    });
  });

  // ── Integration tests ──────────────────────────────────

  describe("integration (full report)", () => {
    it("report.passed is true when all checks pass", () => {
      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      expect(report.passed).toBe(true);
      expect(report.checks.length).toBeGreaterThanOrEqual(5);
      expect(report.timestamp).toBeTruthy();
    });

    it("report.passed is false when any check fails", () => {
      const stupidDir = makeStupidDir(tmpDir);
      // Create a corrupt state file to trigger a fail
      writeFileSync(join(stupidDir, "state.json"), "not valid json", "utf-8");

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      expect(report.passed).toBe(false);
      expect(report.checks.some((c) => c.status === "fail")).toBe(true);
    });

    it("report includes all 5 check categories (6 checks total)", () => {
      makeStupidDir(tmpDir);
      vi.spyOn(WorktreeManager, "listWorktrees").mockReturnValue([]);

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const names = report.checks.map((c) => c.name);
      expect(names).toContain("Lock File");
      expect(names).toContain("State File");
      expect(names).toContain("Database (MEMORY.db)");
      expect(names).toContain("Database (routing.db)");
      expect(names).toContain("Worktrees");
      expect(names).toContain("Config");
      // 1 lock + 1 state + 2 DB + 1 worktree + 1 config = 6
      expect(report.checks.length).toBe(6);
    });

    it("warns don't cause report.passed to be false", () => {
      const stupidDir = makeStupidDir(tmpDir);
      // Create a stale lock (dead PID → warn, not fail)
      writeFileSync(
        join(stupidDir, "auto.lock"),
        JSON.stringify({
          pid: 999999,
          startedAt: "2025-01-01T00:00:00.000Z",
          heartbeat: "2025-01-01T00:00:00.000Z",
        }),
        "utf-8",
      );
      vi.spyOn(WorktreeManager, "listWorktrees").mockReturnValue([]);

      const doctor = new Doctor(tmpDir);
      const report = doctor.check();

      const lockCheck = report.checks.find((c) => c.name === "Lock File");
      expect(lockCheck!.status).toBe("warn");
      // Warn should not cause overall failure
      expect(report.passed).toBe(true);
    });
  });
});
