import {
  CostTracker,
  BudgetEnforcer,
  LoopDetector,
  StateMachine,
  ProjectMemory,
  SliceRunner,
  FileSelector,
  WorktreeManager,
  ComplexityClassifier,
  RoutingHistory,
} from "@stupid/core";
import type { StupidConfig, OrchestratorContext } from "@stupid/core";
import { join } from "node:path";

/**
 * Composition root: instantiates all governance modules and returns
 * the fully-wired OrchestratorContext dependency bag.
 *
 * Every @stupid/core module from S03–S06 is assembled here.
 *
 * Wired requirements:
 * - R007: CostTracker + BudgetEnforcer for cost tracking / budget enforcement
 * - R012: LoopDetector for loop/stagnation detection
 * - R003: SliceRunner enforces tester→implementer order internally
 * - R008: StateMachine persists session state for crash-proof resume
 * - R033: ComplexityClassifier + RoutingHistory wired for adaptive model routing
 *
 * Note: ProjectMemory constructor creates `.stupid/MEMORY.db` — this is
 * acceptable since CLI commands that use context always need `.stupid/`.
 */
export function buildContext(config: StupidConfig): OrchestratorContext {
  const costTracker = new CostTracker(config);
  const budgetEnforcer = new BudgetEnforcer(config);
  const loopDetector = new LoopDetector(config);
  const stateMachine = new StateMachine(config);
  const memory = new ProjectMemory(config);
  const sliceRunner = new SliceRunner();
  const fileSelector = new FileSelector();
  const worktreeManager = new WorktreeManager({
    projectRoot: config.projectRoot,
    worktreeMode: config.git.worktreeMode,
  });
  const stateDir = join(config.projectRoot, ".stupid");
  const complexityClassifier = new ComplexityClassifier();
  const routingHistory = new RoutingHistory(stateDir);

  return {
    config,
    costTracker,
    budgetEnforcer,
    loopDetector,
    stateMachine,
    memory,
    sliceRunner,
    fileSelector,
    worktreeManager,
    complexityClassifier,
    routingHistory,
  };
}
