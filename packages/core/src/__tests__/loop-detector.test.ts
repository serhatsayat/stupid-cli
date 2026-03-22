import { describe, it, expect } from "vitest";
import { LoopDetector } from "../governance/loop-detector.js";
import { DEFAULT_CONFIG, LoopState } from "../index.js";
import type { ILoopDetector, StupidConfig } from "../index.js";

describe("LoopDetector", () => {
  // DEFAULT_CONFIG: stagnationThreshold = 5, maxRetries = 3

  it("implements ILoopDetector interface", () => {
    const detector: ILoopDetector = new LoopDetector(DEFAULT_CONFIG);
    expect(detector).toBeDefined();
    expect(typeof detector.recordAction).toBe("function");
    expect(typeof detector.getState).toBe("function");
    expect(typeof detector.reset).toBe("function");
  });

  it("initial state is Productive", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    expect(detector.getState()).toBe(LoopState.Productive);
  });

  it("stays Productive with varied actions", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    detector.recordAction("edit", "file1.ts");
    detector.recordAction("test", "file2.ts");
    detector.recordAction("review", "file3.ts");
    expect(detector.getState()).toBe(LoopState.Productive);
  });

  it("transitions to Stuck after stagnationThreshold edits to same file", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    for (let i = 0; i < 5; i++) {
      detector.recordAction("edit", "problem-file.ts");
    }
    expect(detector.getState()).toBe(LoopState.Stuck);
  });

  it("transitions to Failing after maxRetries errors", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    detector.recordAction("error: compilation failed");
    detector.recordAction("error: test failed");
    detector.recordAction("error: build failed");
    expect(detector.getState()).toBe(LoopState.Failing);
  });

  it("transitions to Stagnating with 3+ identical consecutive actions", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    detector.recordAction("lint fix");
    detector.recordAction("lint fix");
    detector.recordAction("lint fix");
    expect(detector.getState()).toBe(LoopState.Stagnating);
  });

  it("transitions to Recovering after Stuck when new productive action", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    // First, get to Stuck state
    for (let i = 0; i < 5; i++) {
      detector.recordAction("edit", "problem-file.ts");
    }
    expect(detector.getState()).toBe(LoopState.Stuck);
    // Now record a productive action on a different file
    detector.recordAction("edit", "new-file.ts");
    expect(detector.getState()).toBe(LoopState.Recovering);
  });

  it("transitions to Recovering after Failing when productive action", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    detector.recordAction("error: test failed");
    detector.recordAction("error: build failed");
    detector.recordAction("error: lint failed");
    expect(detector.getState()).toBe(LoopState.Failing);
    // Productive action
    detector.recordAction("edit", "fix.ts");
    expect(detector.getState()).toBe(LoopState.Recovering);
  });

  it("reset() returns to Productive", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    // Get into Failing state
    for (let i = 0; i < 3; i++) {
      detector.recordAction("error: failed");
    }
    expect(detector.getState()).toBe(LoopState.Failing);
    detector.reset();
    expect(detector.getState()).toBe(LoopState.Productive);
  });

  it("tracks multiple files independently", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    // Edit 4 times each — below threshold of 5
    // Use distinct action strings to avoid triggering stagnation detection
    for (let i = 0; i < 4; i++) {
      detector.recordAction(`edit-${i}`, "file-a.ts");
      detector.recordAction(`review-${i}`, "file-b.ts");
    }
    expect(detector.getState()).toBe(LoopState.Productive);
    // Push file-a over the threshold
    detector.recordAction("push-final", "file-a.ts");
    expect(detector.getState()).toBe(LoopState.Stuck);
  });

  it("respects custom config thresholds", () => {
    const customConfig: StupidConfig = {
      ...DEFAULT_CONFIG,
      governance: {
        ...DEFAULT_CONFIG.governance,
        stagnationThreshold: 2,
        maxRetries: 1,
      },
    };
    const detector = new LoopDetector(customConfig);

    // 1 error should be enough with maxRetries=1
    detector.recordAction("error: something");
    expect(detector.getState()).toBe(LoopState.Failing);

    detector.reset();

    // 2 edits to same file should trigger Stuck with stagnationThreshold=2
    detector.recordAction("edit", "file.ts");
    detector.recordAction("edit", "file.ts");
    expect(detector.getState()).toBe(LoopState.Stuck);
  });

  it("detects error keywords case-insensitively", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    detector.recordAction("ERROR: crash");
    detector.recordAction("FAIL: timeout");
    detector.recordAction("Failed assertion");
    expect(detector.getState()).toBe(LoopState.Failing);
  });

  it("does not count non-error actions as errors", () => {
    const detector = new LoopDetector(DEFAULT_CONFIG);
    detector.recordAction("edit successful");
    detector.recordAction("test passed");
    detector.recordAction("build complete");
    expect(detector.getState()).toBe(LoopState.Productive);
  });
});
