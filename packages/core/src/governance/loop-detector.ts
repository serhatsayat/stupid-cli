import type { ILoopDetector } from "../orchestrator/interfaces.js";
import type { StupidConfig } from "../types/index.js";
import { LoopState } from "../types/index.js";

/**
 * Detects repetitive / stagnant agent behavior.
 * Classifies loop state into 5 categories: Productive, Stagnating,
 * Stuck, Failing, Recovering.
 */
export class LoopDetector implements ILoopDetector {
  private readonly stagnationThreshold: number;
  private readonly maxRetries: number;

  private fileEditCounts: Map<string, number> = new Map();
  private recentActions: string[] = [];
  private errorCount = 0;
  private previousState: LoopState = LoopState.Productive;

  private static readonly MAX_RECENT_ACTIONS = 20;

  constructor(config: StupidConfig) {
    this.stagnationThreshold = config.governance.stagnationThreshold ?? 5;
    this.maxRetries = config.governance.maxRetries ?? 3;
  }

  recordAction(action: string, file?: string): void {
    // Keep recent actions bounded
    this.recentActions.push(action);
    if (this.recentActions.length > LoopDetector.MAX_RECENT_ACTIONS) {
      this.recentActions.shift();
    }

    // Track file edit counts
    if (file) {
      const current = this.fileEditCounts.get(file) ?? 0;
      this.fileEditCounts.set(file, current + 1);
    }

    // Track error count
    const lower = action.toLowerCase();
    if (lower.includes("error") || lower.includes("fail")) {
      this.errorCount++;
    }
  }

  getState(): LoopState {
    const state = this.classify();
    this.previousState = state;
    return state;
  }

  reset(): void {
    this.fileEditCounts.clear();
    this.recentActions = [];
    this.errorCount = 0;
    this.previousState = LoopState.Productive;
  }

  private classify(): LoopState {
    // Failing: error count exceeds max retries
    if (this.errorCount >= this.maxRetries) {
      // Check recovering: was previously Failing and latest action is productive
      if (
        this.previousState === LoopState.Failing &&
        this.recentActions.length > 0 &&
        this.isProductive(this.recentActions[this.recentActions.length - 1])
      ) {
        return LoopState.Recovering;
      }
      return LoopState.Failing;
    }

    // Stuck: any file edited >= stagnationThreshold times
    for (const count of this.fileEditCounts.values()) {
      if (count >= this.stagnationThreshold) {
        // Check recovering: was previously Stuck and latest action is productive
        if (
          this.previousState === LoopState.Stuck &&
          this.recentActions.length > 0 &&
          this.isProductive(this.recentActions[this.recentActions.length - 1])
        ) {
          return LoopState.Recovering;
        }
        return LoopState.Stuck;
      }
    }

    // Stagnating: 3+ consecutive identical actions
    if (this.hasConsecutiveIdenticalActions(3)) {
      return LoopState.Stagnating;
    }

    // Recovering: was previously Stuck or Failing but now productive
    if (
      (this.previousState === LoopState.Stuck ||
        this.previousState === LoopState.Failing) &&
      this.recentActions.length > 0 &&
      this.isProductive(this.recentActions[this.recentActions.length - 1])
    ) {
      return LoopState.Recovering;
    }

    return LoopState.Productive;
  }

  private isProductive(action: string): boolean {
    const lower = action.toLowerCase();
    return !lower.includes("error") && !lower.includes("fail");
  }

  private hasConsecutiveIdenticalActions(count: number): boolean {
    if (this.recentActions.length < count) {
      return false;
    }
    const tail = this.recentActions.slice(-count);
    return tail.every((a) => a === tail[0]);
  }
}
