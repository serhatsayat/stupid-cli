import type { IBudgetEnforcer } from "../orchestrator/interfaces.js";
import type { StupidConfig } from "../types/index.js";

/**
 * Enforces budget limits with soft-warning and hard-stop thresholds.
 * Does not track cost itself — callers pass the current spend to check().
 */
export class BudgetEnforcer implements IBudgetEnforcer {
  private readonly softLimitUsd: number;
  private readonly hardLimitUsd: number;

  constructor(config: StupidConfig) {
    this.softLimitUsd = config.budget.softLimitUsd;
    this.hardLimitUsd = config.budget.hardLimitUsd;
  }

  check(currentCost: number): "ok" | "soft_warning" | "hard_stop" {
    if (currentCost >= this.hardLimitUsd) {
      return "hard_stop";
    }
    if (currentCost >= this.softLimitUsd) {
      return "soft_warning";
    }
    return "ok";
  }

  getRemainingBudget(): number {
    return this.hardLimitUsd;
  }
}
