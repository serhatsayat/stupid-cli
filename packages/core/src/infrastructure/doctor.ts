import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import Database from "better-sqlite3";
import { WorktreeManager } from "./worktree-manager.js";
import {
  deepMerge,
  DEFAULT_CONFIG,
  StupidConfigSchema,
} from "../config/config.js";
import type { DoctorCheck, DoctorReport } from "../types/index.js";

/**
 * Performs health checks on the `.stupid/` state directory.
 *
 * Constructor takes `projectRoot: string` (not `StupidConfig`)
 * because Doctor must work even when config is invalid — config
 * validity is one of the things it checks (D037).
 *
 * Usage:
 * ```ts
 * const doctor = new Doctor("/path/to/project");
 * const report = doctor.check();
 * // report.passed === true if no "fail" checks
 * ```
 */
export class Doctor {
  private readonly projectRoot: string;
  private readonly stateDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.stateDir = join(projectRoot, ".stupid");
  }

  /**
   * Runs all health checks and assembles a DoctorReport.
   * Each check is independent — a failure in one does not skip others.
   */
  check(): DoctorReport {
    const checks: DoctorCheck[] = [
      this.checkLockFile(),
      this.checkStateFile(),
      ...this.checkDatabases(),
      this.checkWorktrees(),
      this.checkConfig(),
    ];

    return {
      checks,
      passed: checks.every((c) => c.status !== "fail"),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Checks `.stupid/auto.lock` — verifies JSON structure and PID liveness.
   * - No lock file → pass
   * - Valid lock, live PID → pass
   * - Valid lock, dead PID → warn (stale lock)
   * - Invalid JSON → fail
   */
  private checkLockFile(): DoctorCheck {
    const lockPath = join(this.stateDir, "auto.lock");

    if (!existsSync(lockPath)) {
      return {
        name: "Lock File",
        status: "pass",
        message: "No lock file",
      };
    }

    let raw: string;
    try {
      raw = readFileSync(lockPath, "utf-8");
    } catch (err) {
      return {
        name: "Lock File",
        status: "fail",
        message: "Cannot read lock file",
        details: err instanceof Error ? err.message : String(err),
      };
    }

    let lock: { pid?: unknown; startedAt?: unknown; heartbeat?: unknown };
    try {
      lock = JSON.parse(raw);
    } catch {
      return {
        name: "Lock File",
        status: "fail",
        message: "Invalid JSON in lock file",
        details: "auto.lock contains malformed JSON",
      };
    }

    // Verify required fields
    if (
      typeof lock.pid !== "number" ||
      typeof lock.startedAt !== "string" ||
      typeof lock.heartbeat !== "string"
    ) {
      return {
        name: "Lock File",
        status: "fail",
        message: "Lock file missing required fields",
        details:
          "Expected pid (number), startedAt (string), heartbeat (string)",
      };
    }

    // Check if the PID is alive
    if (this.isPidAlive(lock.pid)) {
      return {
        name: "Lock File",
        status: "pass",
        message: `Lock held by active PID ${lock.pid}`,
      };
    }

    return {
      name: "Lock File",
      status: "warn",
      message: "Stale lock detected",
      details: `Lock held by dead PID ${lock.pid} (started ${lock.startedAt})`,
    };
  }

  /**
   * Checks `.stupid/state.json` — verifies JSON structure and required keys.
   * - No state file → pass
   * - Valid structure → pass
   * - Invalid JSON or missing keys → fail
   */
  private checkStateFile(): DoctorCheck {
    const statePath = join(this.stateDir, "state.json");

    if (!existsSync(statePath)) {
      return {
        name: "State File",
        status: "pass",
        message: "No active session",
      };
    }

    let raw: string;
    try {
      raw = readFileSync(statePath, "utf-8");
    } catch (err) {
      return {
        name: "State File",
        status: "fail",
        message: "Cannot read state file",
        details: err instanceof Error ? err.message : String(err),
      };
    }

    let state: Record<string, unknown>;
    try {
      state = JSON.parse(raw);
    } catch {
      return {
        name: "State File",
        status: "fail",
        message: "Invalid JSON in state.json",
        details: "state.json contains malformed JSON",
      };
    }

    // Verify plan key with slices array
    if (!state.plan || typeof state.plan !== "object") {
      return {
        name: "State File",
        status: "fail",
        message: "Missing 'plan' key in state.json",
        details: "Expected state.json to contain a 'plan' object",
      };
    }
    const plan = state.plan as Record<string, unknown>;
    if (!Array.isArray(plan.slices)) {
      return {
        name: "State File",
        status: "fail",
        message: "Missing 'plan.slices' array in state.json",
        details: "Expected plan.slices to be an array",
      };
    }

    // Verify progress key with sessionId
    if (!state.progress || typeof state.progress !== "object") {
      return {
        name: "State File",
        status: "fail",
        message: "Missing 'progress' key in state.json",
        details: "Expected state.json to contain a 'progress' object",
      };
    }
    const progress = state.progress as Record<string, unknown>;
    if (typeof progress.sessionId !== "string") {
      return {
        name: "State File",
        status: "fail",
        message: "Missing 'progress.sessionId' in state.json",
        details: "Expected progress.sessionId to be a string",
      };
    }

    return {
      name: "State File",
      status: "pass",
      message: "State file is valid",
    };
  }

  /**
   * Checks MEMORY.db and routing.db via SQLite PRAGMA integrity_check.
   * - File doesn't exist → pass (not created yet)
   * - Integrity OK → pass
   * - Corrupt or unreadable → fail
   */
  private checkDatabases(): DoctorCheck[] {
    const dbNames = ["MEMORY.db", "routing.db"];
    const checks: DoctorCheck[] = [];

    for (const dbName of dbNames) {
      const dbPath = join(this.stateDir, dbName);
      const checkName = `Database (${dbName})`;

      if (!existsSync(dbPath)) {
        checks.push({
          name: checkName,
          status: "pass",
          message: "Not created yet",
        });
        continue;
      }

      let db: InstanceType<typeof Database> | null = null;
      try {
        db = new Database(dbPath, { readonly: true });
        const result = db.pragma("integrity_check") as Array<{
          integrity_check: string;
        }>;
        const status =
          result.length > 0 && result[0].integrity_check === "ok";

        if (status) {
          checks.push({
            name: checkName,
            status: "pass",
            message: "Integrity check passed",
          });
        } else {
          checks.push({
            name: checkName,
            status: "fail",
            message: "Integrity check failed",
            details: result
              .map((r) => r.integrity_check)
              .join("; "),
          });
        }
      } catch (err) {
        checks.push({
          name: checkName,
          status: "fail",
          message: `Cannot open or check ${dbName}`,
          details: err instanceof Error ? err.message : String(err),
        });
      } finally {
        try {
          db?.close();
        } catch {
          // Ignore close errors
        }
      }
    }

    return checks;
  }

  /**
   * Checks for stale git worktrees — branches starting with `stupid/`
   * whose worktree directories no longer exist on disk.
   */
  private checkWorktrees(): DoctorCheck {
    let worktrees: Array<{ path: string; branch: string }>;
    try {
      worktrees = WorktreeManager.listWorktrees(this.projectRoot);
    } catch {
      // Not a git repo or git not available — that's fine
      return {
        name: "Worktrees",
        status: "pass",
        message: "No worktrees (not a git repo or git unavailable)",
      };
    }

    const stupidWorktrees = worktrees.filter((w) =>
      w.branch.startsWith("stupid/"),
    );

    if (stupidWorktrees.length === 0) {
      return {
        name: "Worktrees",
        status: "pass",
        message: "No stupid worktrees found",
      };
    }

    const stale = stupidWorktrees.filter((w) => !existsSync(w.path));

    if (stale.length === 0) {
      return {
        name: "Worktrees",
        status: "pass",
        message: `${stupidWorktrees.length} worktree(s) all valid`,
      };
    }

    return {
      name: "Worktrees",
      status: "warn",
      message: `${stale.length} stale worktree(s) detected`,
      details: stale
        .map((w) => `${w.branch} → ${w.path} (missing)`)
        .join(", "),
    };
  }

  /**
   * Checks config.yml validity — parses YAML, merges with defaults,
   * validates against Zod schema.
   * - No config file → pass (using defaults)
   * - Valid config → pass
   * - Invalid YAML or schema violation → fail
   *
   * Uses direct YAML parsing instead of `parseConfigFile()` because
   * that function swallows errors and returns `{}`, making it impossible
   * to distinguish "no file" from "corrupt file".
   */
  private checkConfig(): DoctorCheck {
    const configPath = join(this.stateDir, "config.yml");

    if (!existsSync(configPath)) {
      return {
        name: "Config",
        status: "pass",
        message: "Using defaults (no config.yml)",
      };
    }

    let raw: string;
    try {
      raw = readFileSync(configPath, "utf-8");
    } catch (err) {
      return {
        name: "Config",
        status: "fail",
        message: "Cannot read config.yml",
        details: err instanceof Error ? err.message : String(err),
      };
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      return {
        name: "Config",
        status: "fail",
        message: "Invalid YAML in config.yml",
        details: err instanceof Error ? err.message : String(err),
      };
    }

    if (parsed === null || parsed === undefined || typeof parsed !== "object") {
      return {
        name: "Config",
        status: "pass",
        message: "Config file is empty, using defaults",
      };
    }

    // Merge with defaults and validate with Zod
    const merged = deepMerge(DEFAULT_CONFIG, parsed as Record<string, unknown>);
    const result = StupidConfigSchema.safeParse(merged);

    if (!result.success) {
      const errors = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        name: "Config",
        status: "fail",
        message: "Config validation failed",
        details: errors,
      };
    }

    return {
      name: "Config",
      status: "pass",
      message: "Config is valid",
    };
  }

  /**
   * Checks if a process with the given PID is alive.
   */
  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
