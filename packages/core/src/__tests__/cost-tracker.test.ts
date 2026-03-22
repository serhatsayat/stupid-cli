import { describe, it, expect } from "vitest";
import { CostTracker } from "../governance/cost-tracker.js";
import { DEFAULT_CONFIG } from "../index.js";
import type { ICostTracker } from "../index.js";

describe("CostTracker", () => {
  it("implements ICostTracker interface", () => {
    const tracker: ICostTracker = new CostTracker(DEFAULT_CONFIG);
    expect(tracker).toBeDefined();
    expect(typeof tracker.track).toBe("function");
    expect(typeof tracker.getTotalCost).toBe("function");
    expect(typeof tracker.getReport).toBe("function");
  });

  it("returns 0 total cost when no entries", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    expect(tracker.getTotalCost()).toBe(0);
  });

  it("returns empty report when no entries", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    expect(tracker.getReport()).toEqual([]);
  });

  it("track() stores entries with correct fields", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    tracker.track("research", 1000, 0.05);
    const report = tracker.getReport();
    expect(report).toHaveLength(1);
    expect(report[0].tokensUsed).toBe(1000);
    expect(report[0].costUsd).toBe(0.05);
    expect(report[0].model).toBe("unknown");
    expect(report[0].taskId).toBe("");
    expect(report[0].sliceId).toBe("");
  });

  it("maps phase string to agentRole field", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    tracker.track("architect", 500, 0.10);
    const report = tracker.getReport();
    expect(report[0].agentRole).toBe("architect");
  });

  it("stores entries with ISO timestamp", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    tracker.track("research", 100, 0.01);
    const report = tracker.getReport();
    // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(report[0].timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it("getTotalCost() sums correctly after multiple tracks", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    tracker.track("research", 1000, 0.05);
    tracker.track("implementer", 2000, 0.10);
    tracker.track("reviewer", 500, 0.03);
    expect(tracker.getTotalCost()).toBeCloseTo(0.18);
  });

  it("getReport() returns all entries in order", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    tracker.track("research", 100, 0.01);
    tracker.track("spec", 200, 0.02);
    tracker.track("architect", 300, 0.03);
    const report = tracker.getReport();
    expect(report).toHaveLength(3);
    expect(report[0].agentRole).toBe("research");
    expect(report[1].agentRole).toBe("spec");
    expect(report[2].agentRole).toBe("architect");
  });

  it("getReport() returns a copy, not the internal reference", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    tracker.track("research", 100, 0.01);
    const report1 = tracker.getReport();
    const report2 = tracker.getReport();
    expect(report1).not.toBe(report2);
    expect(report1).toEqual(report2);

    // Mutating the returned array does not affect tracker
    report1.pop();
    expect(tracker.getReport()).toHaveLength(1);
  });

  it("handles large number of entries", () => {
    const tracker = new CostTracker(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) {
      tracker.track("implementer", 100, 0.01);
    }
    expect(tracker.getTotalCost()).toBeCloseTo(1.0);
    expect(tracker.getReport()).toHaveLength(100);
  });
});
