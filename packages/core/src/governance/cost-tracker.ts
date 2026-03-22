import type { ICostTracker } from "../orchestrator/interfaces.js";
import type { CostEntry, StupidConfig } from "../types/index.js";

/**
 * Tracks per-phase token usage and cost.
 * Stores CostEntry records in memory and provides aggregation.
 */
export class CostTracker implements ICostTracker {
  private entries: CostEntry[] = [];

  constructor(private readonly config: StupidConfig) {}

  track(phase: string, tokensUsed: number, costUsd: number): void {
    const entry: CostEntry = {
      agentRole: phase as CostEntry["agentRole"],
      model: "unknown",
      tokensUsed,
      costUsd,
      taskId: "",
      sliceId: "",
      timestamp: new Date().toISOString(),
    };
    this.entries.push(entry);
  }

  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.costUsd, 0);
  }

  getReport(): CostEntry[] {
    return [...this.entries];
  }
}
