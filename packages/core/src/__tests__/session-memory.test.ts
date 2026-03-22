import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionMemory } from "../memory/session-memory.js";
import type { SessionState } from "../types/index.js";

function makeState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: "sess-1",
    startedAt: new Date().toISOString(),
    completedTasks: [],
    failedTasks: [],
    totalCostUsd: 0,
    totalTokensUsed: 0,
    ...overrides,
  };
}

describe("SessionMemory", () => {
  let tmpDir: string;
  let sm: SessionMemory;

  function setup() {
    tmpDir = mkdtempSync(join(tmpdir(), "stupid-session-"));
    sm = new SessionMemory(tmpDir);
  }

  afterEach(() => {
    try {
      sm?.close();
    } catch {
      // May already be closed
    }
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  });

  it("recordEvent() + getEvents() returns events in insertion order", () => {
    setup();
    sm.recordEvent("sess-1", "task_started", { taskId: "T01" });
    sm.recordEvent("sess-1", "task_completed", { taskId: "T01" });
    sm.recordEvent("sess-1", "task_started", { taskId: "T02" });

    const events = sm.getEvents("sess-1");
    expect(events).toHaveLength(3);
    expect(events[0].eventType).toBe("task_started");
    expect(events[0].data).toEqual({ taskId: "T01" });
    expect(events[1].eventType).toBe("task_completed");
    expect(events[2].eventType).toBe("task_started");
    expect(events[2].data).toEqual({ taskId: "T02" });
    // All timestamps should be ISO strings
    for (const ev of events) {
      expect(ev.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("getEvents() respects limit parameter", () => {
    setup();
    sm.recordEvent("sess-1", "task_started", { taskId: "T01" });
    sm.recordEvent("sess-1", "task_completed", { taskId: "T01" });
    sm.recordEvent("sess-1", "task_started", { taskId: "T02" });

    const events = sm.getEvents("sess-1", 2);
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe("task_started");
    expect(events[1].eventType).toBe("task_completed");
  });

  it("saveSnapshot() + getSnapshot() round-trips small state (≤2KB)", () => {
    setup();
    const state = makeState({
      sessionId: "sess-small",
      completedTasks: ["T01", "T02"],
      failedTasks: ["T03"],
      totalCostUsd: 1.23,
      totalTokensUsed: 5000,
    });

    sm.saveSnapshot("sess-small", state);
    const loaded = sm.getSnapshot("sess-small");

    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe("sess-small");
    expect(loaded!.completedTasks).toEqual(["T01", "T02"]);
    expect(loaded!.failedTasks).toEqual(["T03"]);
    expect(loaded!.totalCostUsd).toBe(1.23);
    expect(loaded!.totalTokensUsed).toBe(5000);
  });

  it("saveSnapshot() applies tiered compression for large state (>2KB)", () => {
    setup();
    // Create a state with many tasks to exceed 2KB threshold
    const manyTasks = Array.from({ length: 200 }, (_, i) => `task-${i.toString().padStart(4, "0")}-long-name-for-padding`);
    const state = makeState({
      sessionId: "sess-large",
      completedTasks: manyTasks,
      failedTasks: manyTasks.slice(0, 50),
    });

    // Verify it's actually > 2KB before compression
    expect(Buffer.byteLength(JSON.stringify(state), "utf-8")).toBeGreaterThan(2048);

    sm.saveSnapshot("sess-large", state);
    const loaded = sm.getSnapshot("sess-large");

    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe("sess-large");
    // Compression replaces arrays with counts
    expect(loaded!.completedTasks).toBe(200);
    expect(loaded!.failedTasks).toBe(50);
    // Other fields preserved
    expect(loaded!.totalCostUsd).toBe(0);
    expect(loaded!.totalTokensUsed).toBe(0);
  });

  it("getSnapshot() returns null for non-existent session", () => {
    setup();
    const result = sm.getSnapshot("does-not-exist");
    expect(result).toBeNull();
  });

  it("close() does not throw", () => {
    setup();
    expect(() => sm.close()).not.toThrow();
  });

  it("multiple sessions don't interfere with each other", () => {
    setup();
    // Events for session 1
    sm.recordEvent("sess-A", "task_started", { taskId: "T01" });
    sm.recordEvent("sess-A", "task_completed", { taskId: "T01" });

    // Events for session 2
    sm.recordEvent("sess-B", "task_started", { taskId: "T99" });

    // Snapshots for both
    sm.saveSnapshot("sess-A", makeState({ sessionId: "sess-A", totalCostUsd: 1.0 }));
    sm.saveSnapshot("sess-B", makeState({ sessionId: "sess-B", totalCostUsd: 2.0 }));

    // Verify isolation
    const eventsA = sm.getEvents("sess-A");
    const eventsB = sm.getEvents("sess-B");
    expect(eventsA).toHaveLength(2);
    expect(eventsB).toHaveLength(1);
    expect(eventsB[0].data).toEqual({ taskId: "T99" });

    const snapA = sm.getSnapshot("sess-A");
    const snapB = sm.getSnapshot("sess-B");
    expect(snapA!.totalCostUsd).toBe(1.0);
    expect(snapB!.totalCostUsd).toBe(2.0);
  });

  it("recordEvent() without data stores null", () => {
    setup();
    sm.recordEvent("sess-1", "budget_warning");

    const events = sm.getEvents("sess-1");
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("budget_warning");
    expect(events[0].data).toBeNull();
  });

  it("getEvents() returns empty array for session with no events", () => {
    setup();
    const events = sm.getEvents("no-events-session");
    expect(events).toEqual([]);
  });
});
