import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ActivityLogger } from "../infrastructure/activity-logger.js";
import { DEFAULT_CONFIG } from "../index.js";
import type { StupidConfig, ActivityEventType } from "../index.js";

function makeConfig(projectRoot: string): StupidConfig {
  return { ...DEFAULT_CONFIG, projectRoot };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

describe("ActivityLogger", () => {
  let tmpDir: string;
  let logger: ActivityLogger;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "al-test-"));
    logger = new ActivityLogger(makeConfig(tmpDir));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("log creates activity directory", () => {
    logger.log({
      type: "task_started",
      data: { taskId: "T01" },
    });
    const activityDir = join(tmpDir, ".stupid", "activity");
    expect(existsSync(activityDir)).toBe(true);
  });

  it("log appends a JSONL line to date-named file", () => {
    logger.log({
      type: "task_started",
      data: { taskId: "T01" },
    });

    const logFile = join(tmpDir, ".stupid", "activity", `${today()}.jsonl`);
    expect(existsSync(logFile)).toBe(true);

    const content = readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.type).toBe("task_started");
    expect(parsed.data.taskId).toBe("T01");
  });

  it("readLogs returns parsed events", () => {
    logger.log({ type: "task_started", data: { taskId: "T01" } });
    logger.log({ type: "task_completed", data: { taskId: "T01" } });

    const events = logger.readLogs();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("task_started");
    expect(events[1].type).toBe("task_completed");
  });

  it("readLogs filters by type", () => {
    logger.log({ type: "task_started", data: { taskId: "T01" } });
    logger.log({ type: "cost_recorded", data: { cost: 0.05 } });
    logger.log({ type: "task_started", data: { taskId: "T02" } });

    const filtered = logger.readLogs({ type: "task_started" });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.type === "task_started")).toBe(true);
  });

  it("readLogs returns empty array for missing file", () => {
    const events = logger.readLogs({ date: "1999-01-01" });
    expect(events).toEqual([]);
  });

  it("multiple log calls append to same file", () => {
    logger.log({ type: "task_started", data: { id: 1 } });
    logger.log({ type: "task_completed", data: { id: 2 } });
    logger.log({ type: "task_failed", data: { id: 3 } });

    const logFile = join(tmpDir, ".stupid", "activity", `${today()}.jsonl`);
    const lines = readFileSync(logFile, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(3);
  });

  it("events have correct timestamp and type fields", () => {
    const fixedTimestamp = "2025-06-15T10:30:00.000Z";
    logger.log({
      type: "budget_warning",
      data: { cost: 4.5 },
      timestamp: fixedTimestamp,
    });

    // Read from the date in the provided timestamp
    const events = logger.readLogs({ date: "2025-06-15" });
    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toBe(fixedTimestamp);
    expect(events[0].type).toBe("budget_warning");
    expect(events[0].data.cost).toBe(4.5);
  });

  it("log auto-generates timestamp when not provided", () => {
    logger.log({ type: "agent_spawned", data: { role: "research" } });
    const events = logger.readLogs();
    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("readLogs returns empty array when activity directory doesn't exist", () => {
    // Fresh logger — no log() calls, so no directory
    const freshLogger = new ActivityLogger(
      makeConfig(join(tmpDir, "nonexistent")),
    );
    expect(freshLogger.readLogs()).toEqual([]);
  });
});
