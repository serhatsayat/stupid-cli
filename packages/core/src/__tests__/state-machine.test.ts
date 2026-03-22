import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { StateMachine } from "../workflow/state-machine.js";
import { DEFAULT_CONFIG } from "../index.js";
import type { IStateMachine, PlanSpec, StupidConfig } from "../index.js";

function makeConfig(projectRoot: string): StupidConfig {
  return { ...DEFAULT_CONFIG, projectRoot };
}

function makePlan(): PlanSpec {
  return {
    milestone: { id: "M001", title: "Test Milestone", description: "desc" },
    slices: [
      {
        id: "S01",
        title: "Slice One",
        tasks: [],
        status: "pending",
      },
      {
        id: "S02",
        title: "Slice Two",
        tasks: [],
        status: "pending",
      },
    ],
    totalEstimate: { tokens: 1000, costUsd: 0.5, durationMs: 60000 },
  };
}

describe("StateMachine", () => {
  let tmpDir: string;
  let sm: StateMachine;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sm-test-"));
    sm = new StateMachine(makeConfig(tmpDir));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("implements IStateMachine interface", () => {
    const machine: IStateMachine = sm;
    expect(machine).toBeDefined();
    expect(typeof machine.savePlan).toBe("function");
    expect(typeof machine.loadState).toBe("function");
    expect(typeof machine.updateSlice).toBe("function");
  });

  it("loadState returns null when no state file exists", () => {
    expect(sm.loadState()).toBeNull();
  });

  it("getStatus returns null when no state file exists", () => {
    expect(sm.getStatus()).toBeNull();
  });

  it("savePlan creates .stupid directory and state.json", () => {
    sm.savePlan(makePlan());
    const stateDir = join(tmpDir, ".stupid");
    expect(existsSync(stateDir)).toBe(true);
    expect(existsSync(join(stateDir, "state.json"))).toBe(true);
  });

  it("savePlan → loadState roundtrip returns valid SessionState", () => {
    sm.savePlan(makePlan());
    const state = sm.loadState();
    expect(state).not.toBeNull();
    expect(state!.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(state!.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("SessionState has empty completedTasks and failedTasks initially", () => {
    sm.savePlan(makePlan());
    const state = sm.loadState()!;
    expect(state.completedTasks).toEqual([]);
    expect(state.failedTasks).toEqual([]);
    expect(state.totalCostUsd).toBe(0);
    expect(state.totalTokensUsed).toBe(0);
  });

  it("updateSlice changes slice status in state.json", () => {
    sm.savePlan(makePlan());
    sm.updateSlice("S01", "in-progress");

    const raw = readFileSync(join(tmpDir, ".stupid", "state.json"), "utf-8");
    const data = JSON.parse(raw) as { plan: PlanSpec };
    const slice = data.plan.slices.find((s) => s.id === "S01");
    expect(slice!.status).toBe("in-progress");
  });

  it("updateSlice sets currentSliceId in progress", () => {
    sm.savePlan(makePlan());
    sm.updateSlice("S02", "done");

    const state = sm.loadState()!;
    expect(state.currentSliceId).toBe("S02");
  });

  it("getStatus returns plan and progress after savePlan", () => {
    const plan = makePlan();
    sm.savePlan(plan);
    const status = sm.getStatus();
    expect(status).not.toBeNull();
    expect(status!.plan.milestone.id).toBe("M001");
    expect(status!.progress.sessionId).toBeDefined();
  });

  it("handles missing directory gracefully on loadState", () => {
    // Point to a non-existent directory
    const missingDir = join(tmpDir, "does-not-exist");
    const missingMachine = new StateMachine(makeConfig(missingDir));
    expect(missingMachine.loadState()).toBeNull();
  });

  it("updateSlice is a no-op when no state file exists", () => {
    // Should not throw
    expect(() => sm.updateSlice("S01", "done")).not.toThrow();
  });
});
