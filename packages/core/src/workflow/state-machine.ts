import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { IStateMachine } from "../orchestrator/interfaces.js";
import type { PlanSpec, SessionState, StupidConfig } from "../types/index.js";

/**
 * Persists session state to `.stupid/state.json` for crash-proof resumability.
 * All operations are synchronous (matching the IStateMachine contract).
 */
export class StateMachine implements IStateMachine {
  private readonly stateDir: string;
  private readonly stateFile: string;

  constructor(private readonly config: StupidConfig) {
    this.stateDir = join(config.projectRoot, ".stupid");
    this.stateFile = join(this.stateDir, "state.json");
  }

  savePlan(plan: PlanSpec): void {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }

    const state = {
      plan,
      progress: {
        sessionId: randomUUID(),
        startedAt: new Date().toISOString(),
        completedTasks: [] as string[],
        failedTasks: [] as string[],
        totalCostUsd: 0,
        totalTokensUsed: 0,
      } satisfies SessionState,
    };

    writeFileSync(this.stateFile, JSON.stringify(state, null, 2), "utf-8");
  }

  loadState(): SessionState | null {
    if (!existsSync(this.stateFile)) {
      return null;
    }

    try {
      const raw = readFileSync(this.stateFile, "utf-8");
      const parsed = JSON.parse(raw) as { progress: SessionState };
      return parsed.progress;
    } catch {
      return null;
    }
  }

  updateSlice(sliceId: string, status: string): void {
    if (!existsSync(this.stateFile)) {
      return;
    }

    const raw = readFileSync(this.stateFile, "utf-8");
    const state = JSON.parse(raw) as {
      plan: PlanSpec;
      progress: SessionState;
    };

    const slice = state.plan.slices.find((s) => s.id === sliceId);
    if (slice) {
      slice.status = status as typeof slice.status;
    }

    state.progress.currentSliceId = sliceId;
    writeFileSync(this.stateFile, JSON.stringify(state, null, 2), "utf-8");
  }

  getStatus(): { plan: PlanSpec; progress: SessionState } | null {
    if (!existsSync(this.stateFile)) {
      return null;
    }

    try {
      const raw = readFileSync(this.stateFile, "utf-8");
      return JSON.parse(raw) as { plan: PlanSpec; progress: SessionState };
    } catch {
      return null;
    }
  }
}
