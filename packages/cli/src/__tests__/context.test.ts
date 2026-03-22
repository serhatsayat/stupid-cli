import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildContext } from "../context.js";
import { DEFAULT_CONFIG } from "@stupid/core";
import type { StupidConfig, OrchestratorContext } from "@stupid/core";

describe("buildContext — composition root", () => {
  let tempDir: string;
  let context: OrchestratorContext | undefined;

  afterEach(() => {
    // ProjectMemory opens a SQLite DB — close it before removing temp dir
    if (context?.memory && typeof (context.memory as any).close === "function") {
      (context.memory as any).close();
    }
    context = undefined;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function makeConfig(): StupidConfig {
    tempDir = mkdtempSync(join(tmpdir(), "stupid-cli-test-"));
    return { ...DEFAULT_CONFIG, projectRoot: tempDir };
  }

  it("returns an OrchestratorContext with config", () => {
    const config = makeConfig();
    context = buildContext(config);
    expect(context.config).toBe(config);
  });

  // R007: CostTracker wired
  it("wires CostTracker with track, getTotalCost, getReport methods", () => {
    context = buildContext(makeConfig());
    expect(context.costTracker).toBeDefined();
    expect(typeof context.costTracker!.track).toBe("function");
    expect(typeof context.costTracker!.getTotalCost).toBe("function");
    expect(typeof context.costTracker!.getReport).toBe("function");
  });

  // R007: BudgetEnforcer wired
  it("wires BudgetEnforcer with check, getRemainingBudget methods", () => {
    context = buildContext(makeConfig());
    expect(context.budgetEnforcer).toBeDefined();
    expect(typeof context.budgetEnforcer!.check).toBe("function");
    expect(typeof context.budgetEnforcer!.getRemainingBudget).toBe("function");
  });

  // R012: LoopDetector wired
  it("wires LoopDetector with recordAction, getState, reset methods", () => {
    context = buildContext(makeConfig());
    expect(context.loopDetector).toBeDefined();
    expect(typeof context.loopDetector!.recordAction).toBe("function");
    expect(typeof context.loopDetector!.getState).toBe("function");
    expect(typeof context.loopDetector!.reset).toBe("function");
  });

  // R008: StateMachine wired
  it("wires StateMachine with savePlan, loadState, updateSlice methods", () => {
    context = buildContext(makeConfig());
    expect(context.stateMachine).toBeDefined();
    expect(typeof context.stateMachine!.savePlan).toBe("function");
    expect(typeof context.stateMachine!.loadState).toBe("function");
    expect(typeof context.stateMachine!.updateSlice).toBe("function");
  });

  // ProjectMemory (S05)
  it("wires ProjectMemory with search, getRelevantRecords methods", () => {
    context = buildContext(makeConfig());
    expect(context.memory).toBeDefined();
    expect(typeof context.memory!.search).toBe("function");
    expect(typeof context.memory!.getRelevantRecords).toBe("function");
  });

  // R003: SliceRunner wired
  it("wires SliceRunner with run method", () => {
    context = buildContext(makeConfig());
    expect(context.sliceRunner).toBeDefined();
    expect(typeof context.sliceRunner!.run).toBe("function");
  });

  it("all 6 context modules are non-undefined simultaneously", () => {
    context = buildContext(makeConfig());
    const modules = [
      context.costTracker,
      context.budgetEnforcer,
      context.loopDetector,
      context.stateMachine,
      context.memory,
      context.sliceRunner,
    ];
    for (const mod of modules) {
      expect(mod).toBeDefined();
    }
  });
});
