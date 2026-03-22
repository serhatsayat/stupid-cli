import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CrashRecovery } from "../infrastructure/crash-recovery.js";
import { DEFAULT_CONFIG } from "../index.js";
import type { StupidConfig } from "../index.js";

function makeConfig(projectRoot: string): StupidConfig {
  return { ...DEFAULT_CONFIG, projectRoot };
}

describe("CrashRecovery", () => {
  let tmpDir: string;
  let cr: CrashRecovery;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cr-test-"));
    cr = new CrashRecovery(makeConfig(tmpDir));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("acquireLock creates lock file with current PID", () => {
    const result = cr.acquireLock();
    expect(result).toBe(true);
    const lockPath = join(tmpDir, ".stupid", "auto.lock");
    expect(existsSync(lockPath)).toBe(true);

    const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
    expect(lock.pid).toBe(process.pid);
    expect(lock.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(lock.heartbeat).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("acquireLock returns true on fresh lock", () => {
    expect(cr.acquireLock()).toBe(true);
  });

  it("acquireLock returns false if lock held by live PID (self)", () => {
    cr.acquireLock();
    expect(cr.acquireLock()).toBe(false);
  });

  it("releaseLock removes lock file", () => {
    cr.acquireLock();
    cr.releaseLock();
    const lockPath = join(tmpDir, ".stupid", "auto.lock");
    expect(existsSync(lockPath)).toBe(false);
  });

  it("releaseLock does not throw when no lock exists", () => {
    expect(() => cr.releaseLock()).not.toThrow();
  });

  it("detectCrash returns null when no lock file exists", () => {
    expect(cr.detectCrash()).toBeNull();
  });

  it("detectCrash with dead PID returns crashed: true", () => {
    // Write a lock file with a PID that is certainly dead
    const stateDir = join(tmpDir, ".stupid");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "auto.lock"),
      JSON.stringify({
        pid: 999999,
        startedAt: "2025-01-01T00:00:00.000Z",
        heartbeat: "2025-01-01T00:00:00.000Z",
      }),
      "utf-8",
    );

    const result = cr.detectCrash();
    expect(result).not.toBeNull();
    expect(result!.crashed).toBe(true);
    expect(result!.stalePid).toBe(999999);
    expect(result!.lockAge).toBe("2025-01-01T00:00:00.000Z");
  });

  it("updateHeartbeat updates timestamp in lock file", () => {
    cr.acquireLock();
    const lockPath = join(tmpDir, ".stupid", "auto.lock");

    const before = JSON.parse(readFileSync(lockPath, "utf-8"));
    const oldHeartbeat = before.heartbeat;

    // Small delay to ensure timestamp changes
    const start = Date.now();
    while (Date.now() - start < 5) {
      /* spin */
    }

    cr.updateHeartbeat();
    const after = JSON.parse(readFileSync(lockPath, "utf-8"));
    expect(after.heartbeat).not.toBe(oldHeartbeat);
    expect(after.pid).toBe(process.pid);
  });

  it("getResumePoint reads from state.json", () => {
    const stateDir = join(tmpDir, ".stupid");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, "state.json"),
      JSON.stringify({
        plan: {},
        progress: {
          sessionId: "test-session",
          startedAt: "2025-01-01T00:00:00.000Z",
          currentSliceId: "S01",
          currentTaskId: "T03",
          completedTasks: [],
          failedTasks: [],
          totalCostUsd: 0,
          totalTokensUsed: 0,
        },
      }),
      "utf-8",
    );

    const resume = cr.getResumePoint();
    expect(resume).not.toBeNull();
    expect(resume!.sliceId).toBe("S01");
    expect(resume!.taskId).toBe("T03");
  });

  it("getResumePoint returns null when no state.json", () => {
    expect(cr.getResumePoint()).toBeNull();
  });
});
