import type { ISliceRunner, OrchestratorContext } from "../orchestrator/interfaces.js";
import { AgentFactory } from "../agents/agent-factory.js";
import { TaskRouter } from "../orchestrator/task-router.js";
import type { ModelSelection } from "../orchestrator/task-router.js";
import { TestRunner } from "./test-runner.js";
import { PRBuilder } from "./pr-builder.js";
import { AgentRole } from "../types/index.js";
import type {
  SliceSpec,
  TaskSpec,
  AgentResult,
  StupidConfig,
} from "../types/index.js";

// ─── SliceRunner ─────────────────────────────────────────────

/**
 * Task execution engine: runs a slice through the
 * tester → implementer → verify → reviewer → finalizer pipeline.
 *
 * Composes AgentFactory, TaskRouter, TestRunner, and PRBuilder.
 *
 * Requirement coverage:
 * - R003: Tester tasks always execute before implementer tasks
 * - R004: Reviewer rejection triggers model escalation (never same-agent retry)
 * - R009: Each completed task produces one atomic git commit (when enabled)
 *
 * Observability:
 * - Returns updated SliceSpec with status "done" | "failed"
 * - Tracks per-task cost via injected ICostTracker
 * - Escalation attempts tracked via model string in spawn options
 * - Budget hard_stop includes early abort with "failed" status
 * - Failed slice indicates which phase triggered failure via execution order
 */
export class SliceRunner implements ISliceRunner {
  /**
   * Execute a slice through the full pipeline.
   *
   * Phase order:
   * 1. Tester — write tests first (R003)
   * 2. Implementer — write code
   * 3. Verify — run tests via TestRunner
   * 4. Reviewer — approve or reject (triggers R004 escalation on rejection)
   * 5. Finalizer — cleanup / docs
   *
   * Each successful task gets an atomic git commit (R009) when
   * `config.git.commitPerTask` is true.
   *
   * All governance deps (costTracker, budgetEnforcer, loopDetector)
   * are optional — SliceRunner works without them.
   */
  async run(slice: SliceSpec, context: OrchestratorContext): Promise<SliceSpec> {
    const { config } = context;
    const router = new TaskRouter(config);
    const testRunner = new TestRunner();
    const prBuilder = new PRBuilder({ cwd: config.projectRoot });

    // Group tasks by their assigned role
    const tasksByRole = this.groupByRole(slice.tasks);

    // Track the implementer model for escalation chain
    let implModelSelection = router.selectModel(AgentRole.Implementer);
    let escalationAttempts = 0;

    // ── Phase 1: Tester (R003 — runs before implementer) ───
    const testerTasks = tasksByRole.get(AgentRole.Tester) ?? [];
    for (const task of testerTasks) {
      if (this.shouldStopForBudget(context)) {
        return { ...slice, status: "failed" };
      }

      const result = await this.executeTask(
        task,
        router.selectModel(task.assignedRole),
        config,
        context,
      );
      this.trackCost(context, task.assignedRole, result);

      if (config.git.commitPerTask) {
        prBuilder.createCommit(slice.id, task.id, task.title);
      }
    }

    // ── Phases 2-4: Implementer → Verify → Reviewer ────────
    //    (with escalation loop on reviewer rejection — R004)
    const implTasks = tasksByRole.get(AgentRole.Implementer) ?? [];
    const reviewerTasks = tasksByRole.get(AgentRole.Reviewer) ?? [];

    if (implTasks.length > 0 || reviewerTasks.length > 0) {
      let approved = false;

      while (!approved) {
        // ── Implementer phase ──────────────────────────────
        for (const task of implTasks) {
          if (this.shouldStopForBudget(context)) {
            return { ...slice, status: "failed" };
          }

          const result = await this.executeTask(task, implModelSelection, config, context);
          this.trackCost(context, task.assignedRole, result);

          if (config.git.commitPerTask) {
            prBuilder.createCommit(slice.id, task.id, task.title);
          }
        }

        // ── Verify phase — run tests after implementation ──
        for (const task of implTasks) {
          const testCommand = task.testCommand ?? "npm test";
          const testResult = testRunner.run(testCommand, {
            cwd: config.projectRoot,
          });
          if (!testResult.passed) {
            return { ...slice, status: "failed" };
          }
        }

        // ── Reviewer phase ─────────────────────────────────
        if (reviewerTasks.length === 0) {
          approved = true;
          break;
        }

        let rejected = false;
        for (const task of reviewerTasks) {
          if (this.shouldStopForBudget(context)) {
            return { ...slice, status: "failed" };
          }

          const result = await this.executeTask(
            task,
            router.selectModel(task.assignedRole),
            config,
            context,
          );
          this.trackCost(context, task.assignedRole, result);

          // Graceful structuredData handling: fall back to result.success
          const taskApproved =
            result.structuredData !== undefined
              ? (result.structuredData as Record<string, unknown>).approved !==
                false
              : result.success;

          if (!taskApproved) {
            rejected = true;
            break;
          }

          if (config.git.commitPerTask) {
            prBuilder.createCommit(slice.id, task.id, task.title);
          }
        }

        if (!rejected) {
          approved = true;
          break;
        }

        // ── Escalation (R004) ──────────────────────────────
        // Cap retries to prevent infinite loops
        if (escalationAttempts >= config.governance.maxRetries) {
          return { ...slice, status: "failed" };
        }

        const escalation = router.getEscalationModel(
          implModelSelection.modelId,
        );
        if (!escalation) {
          // At model ceiling — no further escalation possible
          return { ...slice, status: "failed" };
        }

        implModelSelection = escalation;
        escalationAttempts++;
      }
    }

    // ── Phase 5: Finalizer ─────────────────────────────────
    const finalizerTasks = tasksByRole.get(AgentRole.Finalizer) ?? [];
    for (const task of finalizerTasks) {
      if (this.shouldStopForBudget(context)) {
        return { ...slice, status: "failed" };
      }

      const result = await this.executeTask(
        task,
        router.selectModel(task.assignedRole),
        config,
        context,
      );
      this.trackCost(context, task.assignedRole, result);

      if (config.git.commitPerTask) {
        prBuilder.createCommit(slice.id, task.id, task.title);
      }
    }

    return { ...slice, status: "done" };
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Create and execute an agent for a single task.
   * When the task has no pre-specified files, uses FileSelector
   * (if available in context) to find relevant project files.
   */
  private async executeTask(
    task: TaskSpec,
    modelSelection: ModelSelection,
    config: StupidConfig,
    context?: OrchestratorContext,
  ): Promise<AgentResult> {
    const agent = AgentFactory.create(task.assignedRole, config);

    // Use task.files if specified; otherwise select files dynamically
    let contextFiles = task.files;
    if ((!contextFiles || contextFiles.length === 0) && context?.fileSelector) {
      contextFiles =
        (await context.fileSelector.selectFiles(
          task.description,
          config.projectRoot,
        )) ?? [];
    }

    return agent.execute({
      agentRole: task.assignedRole,
      model: `${modelSelection.provider}:${modelSelection.modelId}`,
      taskSpec: task,
      contextFiles,
      memoryRecords: [],
      maxTokens: 8192,
      budgetUsd: config.budget.hardLimitUsd,
    });
  }

  /**
   * Check if budget enforcement requires an early stop.
   */
  private shouldStopForBudget(context: OrchestratorContext): boolean {
    if (!context.budgetEnforcer) return false;
    const totalCost = context.costTracker?.getTotalCost() ?? 0;
    return context.budgetEnforcer.check(totalCost) === "hard_stop";
  }

  /**
   * Track cost after agent execution (no-op if costTracker absent).
   */
  private trackCost(
    context: OrchestratorContext,
    role: AgentRole,
    result: AgentResult,
  ): void {
    context.costTracker?.track(role, result.tokensUsed, result.costUsd);
  }

  /**
   * Group tasks by their assignedRole into a lookup map.
   */
  private groupByRole(tasks: TaskSpec[]): Map<AgentRole, TaskSpec[]> {
    const map = new Map<AgentRole, TaskSpec[]>();
    for (const task of tasks) {
      const group = map.get(task.assignedRole) ?? [];
      group.push(task);
      map.set(task.assignedRole, group);
    }
    return map;
  }
}
