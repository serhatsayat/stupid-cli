export const VERSION = "0.1.0";

// ─── Types ───────────────────────────────────────────────────
export {
  AgentRole,
  LoopState,
  ProviderErrorType,
} from "./types/index.js";

export type {
  AgentResult,
  TaskSpec,
  SliceSpec,
  PlanSpec,
  SubAgentSpawnOptions,
  StupidConfig,
  TokenProfile,
  CostEntry,
  GovernanceReport,
  ActivityEventType,
  ProjectMemoryRecord,
  DecisionRecord,
  SessionState,
  ProviderError,
  RetryConfig,
  ComplexityTier,
  RoutingRecord,
} from "./types/index.js";

// ─── Config ──────────────────────────────────────────────────
export {
  loadConfig,
  DEFAULT_CONFIG,
  StupidConfigSchema,
  deepMerge,
} from "./config/config.js";

// ─── Token Profiles ──────────────────────────────────────────
export { TOKEN_PROFILES } from "./infrastructure/token-profiles.js";
export type { ProfileConfig } from "./infrastructure/token-profiles.js";

// ─── Agents ──────────────────────────────────────────────────
export { BaseAgent } from "./agents/base-agent.js";
export { AgentFactory } from "./agents/agent-factory.js";
export {
  loadPromptTemplate,
  compilePrompt,
  clearCache as clearPromptCache,
} from "./agents/prompt-loader.js";
export { ResearchAgent } from "./agents/research.js";
export { SpecAgent } from "./agents/spec.js";
export { ArchitectAgent } from "./agents/architect.js";
export { TesterAgent } from "./agents/tester.js";
export { ImplementerAgent } from "./agents/implementer.js";
export { ReviewerAgent } from "./agents/reviewer.js";
export { FinalizerAgent } from "./agents/finalizer.js";

// ─── Context ─────────────────────────────────────────────────
export { FileSelector } from "./context/file-selector.js";

// ─── Orchestrator ────────────────────────────────────────────
export type {
  ICostTracker,
  IBudgetEnforcer,
  ILoopDetector,
  ISliceRunner,
  IProjectMemory,
  IStateMachine,
  IFileSelector,
  IComplexityClassifier,
  IRoutingHistory,
  OrchestratorContext,
} from "./orchestrator/interfaces.js";
export { Orchestrator } from "./orchestrator/orchestrator.js";
export { TaskPlanner } from "./orchestrator/task-planner.js";
export { TaskRouter, MODEL_ID_MAP } from "./orchestrator/task-router.js";
export type { ModelSelection, TaskRouterDeps, SelectModelOptions } from "./orchestrator/task-router.js";
export { ComplexityClassifier } from "./orchestrator/complexity-classifier.js";
export { RoutingHistory } from "./orchestrator/routing-history.js";
export { ResultAggregator } from "./orchestrator/result-aggregator.js";
export type { AggregatedResult } from "./orchestrator/result-aggregator.js";

// ─── Governance ──────────────────────────────────────────────
export { CostTracker } from "./governance/cost-tracker.js";
export { BudgetEnforcer } from "./governance/budget-enforcer.js";
export { LoopDetector } from "./governance/loop-detector.js";
export { QualityGate } from "./governance/quality-gate.js";
export type { QualityIssue, QualityCheckResult } from "./governance/quality-gate.js";

// ─── Workflow ────────────────────────────────────────────────
export { SliceRunner } from "./workflow/slice-runner.js";
export { TestRunner } from "./workflow/test-runner.js";
export type { TestResult } from "./workflow/test-runner.js";
export { PRBuilder } from "./workflow/pr-builder.js";
export { StateMachine } from "./workflow/state-machine.js";

// ─── Infrastructure ──────────────────────────────────────────
export { ActivityLogger } from "./infrastructure/activity-logger.js";
export { CrashRecovery } from "./infrastructure/crash-recovery.js";
export {
  RetryableSession,
  classifyError,
  DEFAULT_RETRY_CONFIG,
} from "./infrastructure/provider-retry.js";
export type { RetryResult } from "./infrastructure/provider-retry.js";

// ─── Memory ─────────────────────────────────────────────────
export { ProjectMemory } from "./memory/project-memory.js";
export { SessionMemory } from "./memory/session-memory.js";
export { DecisionExtractor } from "./memory/decision-extractor.js";
export { MemoryInjector } from "./memory/memory-injector.js";
