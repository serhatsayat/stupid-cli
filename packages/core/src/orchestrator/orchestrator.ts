import { AgentRole } from "../types/index.js";
import type {
  AgentResult,
  PlanSpec,
  StupidConfig,
  SubAgentSpawnOptions,
} from "../types/index.js";
import type { OrchestratorContext } from "./interfaces.js";
import { AgentFactory } from "../agents/agent-factory.js";
import { TaskRouter } from "./task-router.js";
import { TaskPlanner } from "./task-planner.js";
import { ResultAggregator } from "./result-aggregator.js";
import { TOKEN_PROFILES } from "../infrastructure/token-profiles.js";

// ─── Orchestrator ────────────────────────────────────────────

/**
 * Top-level dispatcher: runs the research→spec→architect→plan pipeline.
 *
 * R001 enforcement: Orchestrator NEVER imports or uses codingTools,
 * readOnlyTools, bashTool, editTool, writeTool, or readTool. It
 * only creates agents via AgentFactory and calls their execute().
 *
 * Observability:
 * - Logs phase transitions (research→spec→architect→plan)
 * - Tracks cost via injected ICostTracker
 * - Checks budget via injected IBudgetEnforcer
 * - Captures escalation attempts on failure
 * - Exposes which phase failed and why via returned error
 */
export class Orchestrator {
  private readonly config: StupidConfig;
  private readonly deps: Partial<OrchestratorContext>;
  private readonly router: TaskRouter;

  constructor(config: StupidConfig, deps?: Partial<OrchestratorContext>) {
    this.config = config;
    this.deps = deps ?? {};
    this.router = new TaskRouter(config);
  }

  /**
   * Execute the full planning pipeline: research → spec → architect → plan.
   *
   * Phase flow:
   * 1. Research: gather context about the task
   * 2. Spec: define requirements from research output
   * 3. Architect: decompose into slices/tasks (skipped if profile says so)
   * 4. Plan: transform agent outputs into PlanSpec via TaskPlanner
   *
   * On phase failure, attempts escalation to a higher-tier model.
   * If escalation is unavailable (at ceiling), propagates the error.
   *
   * @param task - Free-text description of the work to be done
   * @returns A PlanSpec ready for execution
   * @throws Error if a phase fails and escalation is exhausted
   */
  async run(task: string): Promise<PlanSpec> {
    // ── Phase 1: Research ──────────────────────────────────
    const researchResult = await this.executePhase(
      AgentRole.Research,
      task,
      "Research the codebase and gather context for the task.",
    );

    // ── Phase 2: Spec ──────────────────────────────────────
    const specContext = `Research findings:\n${researchResult.output}`;
    const specResult = await this.executePhase(
      AgentRole.Spec,
      task,
      specContext,
    );

    // ── Phase 3: Architect (conditional) ───────────────────
    const profile = TOKEN_PROFILES[this.config.profile];
    let architectResult: AgentResult | undefined;

    if (!profile.skipPhases.includes("architect")) {
      const archContext = `Spec:\n${specResult.output}`;
      architectResult = await this.executePhase(
        AgentRole.Architect,
        task,
        archContext,
      );
    }

    // ── Phase 4: Plan ──────────────────────────────────────
    const plan = TaskPlanner.createPlan(
      researchResult,
      specResult,
      architectResult,
    );

    // Persist plan if state machine is available
    if (this.deps.stateMachine) {
      this.deps.stateMachine.savePlan(plan);
    }

    return plan;
  }

  /**
   * Auto-execute a plan by iterating its slices.
   *
   * Requires a SliceRunner to be injected via deps. If no runner
   * is available, throws — this capability arrives in S04.
   *
   * @param plan - The PlanSpec to execute
   * @throws Error if no SliceRunner is injected
   */
  async auto(plan: PlanSpec): Promise<void> {
    const sliceRunner = this.deps.sliceRunner;
    if (!sliceRunner) {
      throw new Error("SliceRunner not available — requires S04");
    }

    const context: OrchestratorContext = {
      config: this.config,
      ...this.deps,
    };

    for (const slice of plan.slices) {
      await sliceRunner.run(slice, context);
    }
  }

  /**
   * Execute a single agent phase with cost tracking, budget enforcement,
   * and escalation on failure.
   */
  private async executePhase(
    role: AgentRole,
    task: string,
    contextDescription: string,
  ): Promise<AgentResult> {
    // Check budget before starting phase
    if (this.deps.budgetEnforcer) {
      const totalCost = this.deps.costTracker?.getTotalCost() ?? 0;
      const budgetStatus = this.deps.budgetEnforcer.check(totalCost);
      if (budgetStatus === "hard_stop") {
        throw new Error(
          `Budget hard stop reached before ${role} phase (total cost: $${totalCost.toFixed(4)})`,
        );
      }
    }

    const modelSelection = this.router.selectModel(role);
    const modelStr = `${modelSelection.provider}:${modelSelection.modelId}`;

    const result = await this.runAgent(role, modelStr, task, contextDescription);

    // Track cost if tracker available
    if (this.deps.costTracker) {
      this.deps.costTracker.track(role, result.tokensUsed, result.costUsd);
    }

    // If successful, return
    if (result.success) {
      return result;
    }

    // ── Escalation on failure ──────────────────────────────
    // Extract the short model name from the Pi SDK model ID
    const currentModelId = modelSelection.modelId;
    const escalation = this.router.getEscalationModel(currentModelId);

    if (!escalation) {
      throw new Error(
        `Phase "${role}" failed with model ${modelStr} and no escalation available: ${result.error}`,
      );
    }

    const escalatedModelStr = `${escalation.provider}:${escalation.modelId}`;

    const retryResult = await this.runAgent(
      role,
      escalatedModelStr,
      task,
      contextDescription,
    );

    // Track escalation cost
    if (this.deps.costTracker) {
      this.deps.costTracker.track(
        `${role}:escalation`,
        retryResult.tokensUsed,
        retryResult.costUsd,
      );
    }

    if (!retryResult.success) {
      throw new Error(
        `Phase "${role}" failed after escalation to ${escalatedModelStr}: ${retryResult.error}`,
      );
    }

    return retryResult;
  }

  /**
   * Create and execute an agent for the given role.
   * This is the only method that interacts with AgentFactory — keeping
   * agent creation centralized and testable.
   */
  private async runAgent(
    role: AgentRole,
    modelStr: string,
    task: string,
    contextDescription: string,
  ): Promise<AgentResult> {
    const agent = AgentFactory.create(role, this.config);

    // Select relevant project files via FileSelector (falls back to [] when not injected)
    const selectedFiles =
      (await this.deps.fileSelector?.selectFiles(
        contextDescription,
        this.config.projectRoot,
      )) ?? [];

    const spawnOptions: SubAgentSpawnOptions = {
      agentRole: role,
      model: modelStr,
      taskSpec: {
        id: `phase-${role}`,
        title: `${role} phase`,
        description: contextDescription,
        assignedRole: role,
        dependencies: [],
        files: selectedFiles,
      },
      contextFiles: selectedFiles,
      memoryRecords: [],
      maxTokens: 8192,
      budgetUsd: this.config.budget.hardLimitUsd,
    };

    return agent.execute(spawnOptions);
  }
}
