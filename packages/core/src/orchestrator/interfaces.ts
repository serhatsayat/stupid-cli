import type {
  CostEntry,
  LoopState,
  SliceSpec,
  SessionState,
  ProjectMemoryRecord,
  TaskSpec,
  StupidConfig,
  PlanSpec,
  ComplexityTier,
  RoutingRecord,
} from "../types/index.js";

// ─── Forward-Dependency Interfaces ───────────────────────────
//
// These interfaces define contracts for modules in S02–S06.
// The Orchestrator accepts them via dependency injection so it
// can be tested and used before the concrete implementations exist.

/**
 * Tracks per-phase token usage and cost.
 * Concrete implementation: S05 (Governance).
 */
export interface ICostTracker {
  track(phase: string, tokensUsed: number, costUsd: number): void;
  getTotalCost(): number;
  getReport(): CostEntry[];
}

/**
 * Enforces budget limits with soft-warning and hard-stop thresholds.
 * Concrete implementation: S05 (Governance).
 */
export interface IBudgetEnforcer {
  check(currentCost: number): "ok" | "soft_warning" | "hard_stop";
  getRemainingBudget(): number;
}

/**
 * Detects repetitive/stagnant agent behavior across iterations.
 * Concrete implementation: S05 (Governance).
 */
export interface ILoopDetector {
  recordAction(action: string, file?: string): void;
  getState(): LoopState;
  reset(): void;
}

/**
 * Runs individual slices of a plan (task execution engine).
 * Concrete implementation: S04 (Slice Execution).
 */
export interface ISliceRunner {
  run(slice: SliceSpec, context: OrchestratorContext): Promise<SliceSpec>;
}

/**
 * Retrieves project-level memory (decisions, patterns, lessons)
 * to enrich agent context.
 * Concrete implementation: S06 (Memory).
 */
export interface IProjectMemory {
  search(query: string, limit?: number): Promise<ProjectMemoryRecord[]>;
  getRelevantRecords(taskSpec: TaskSpec): Promise<ProjectMemoryRecord[]>;
}

/**
 * Persists and restores session state for resumability.
 * Concrete implementation: S04 (State Machine).
 */
export interface IStateMachine {
  savePlan(plan: PlanSpec): void;
  loadState(): SessionState | null;
  updateSlice(sliceId: string, status: string): void;
}

/**
 * Selects project files relevant to a given task description.
 * Used by Orchestrator and SliceRunner to populate agent context.
 * Concrete implementation: S02 (FileSelector).
 */
export interface IFileSelector {
  selectFiles(
    taskOrDescription: string | TaskSpec,
    projectRoot: string,
    maxFiles?: number,
  ): Promise<string[]>;
}

/**
 * Classifies task complexity into light/standard/heavy tiers
 * using signal-based heuristic scoring.
 * Concrete implementation: S03 (ComplexityClassifier).
 */
export interface IComplexityClassifier {
  classify(task: string | TaskSpec): ComplexityTier;
}

/**
 * Records routing outcomes in SQLite for adaptive model selection.
 * All methods are synchronous (better-sqlite3 is sync, and
 * selectModel() in TaskRouter must remain sync for backward compat).
 * Concrete implementation: S03 (RoutingHistory).
 */
export interface IRoutingHistory {
  record(entry: Omit<RoutingRecord, "id">): void;
  getBestModel(phase: string, tier: ComplexityTier): string | null;
  getStats(): { total: number; byPhase: Record<string, number> };
  close(): void;
}

/**
 * Orchestrator dependency bag — all optional so the Orchestrator
 * can run standalone (tests, budget-profile runs) or fully wired.
 */
export interface OrchestratorContext {
  config: StupidConfig;
  costTracker?: ICostTracker;
  budgetEnforcer?: IBudgetEnforcer;
  loopDetector?: ILoopDetector;
  memory?: IProjectMemory;
  stateMachine?: IStateMachine;
  sliceRunner?: ISliceRunner;
  fileSelector?: IFileSelector;
  complexityClassifier?: IComplexityClassifier;
  routingHistory?: IRoutingHistory;
}
