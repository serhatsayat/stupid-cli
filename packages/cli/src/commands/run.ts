import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import {
  loadConfig,
  Orchestrator,
  ActivityLogger,
  DecisionExtractor,
  ProjectMemory,
} from "@serhatsayat/stupid-core";
import type { StupidConfig, PlanSpec } from "@serhatsayat/stupid-core";
import { buildContext } from "../context.js";

/**
 * Default command: `stupid "task description"`
 *
 * Flow: loadConfig → buildContext → Orchestrator.run(task) → display plan →
 * prompt for approval → Orchestrator.auto(plan) → extract decisions →
 * log session_completed
 *
 * R015: ActivityLogger.log() at session_started and session_completed.
 */
export async function runCommand(
  task: string,
  options: { dryRun?: boolean; profile?: string; verbose?: boolean },
): Promise<void> {
  const overrides: Partial<StupidConfig> = {};
  if (options.profile) {
    overrides.profile = options.profile as StupidConfig["profile"];
  }
  if (options.verbose !== undefined) {
    overrides.verbose = options.verbose;
  }

  const config = loadConfig(overrides);
  const context = buildContext(config);
  const logger = new ActivityLogger(config);

  // R015: log session start
  logger.log({
    type: "task_started",
    data: { task, profile: config.profile },
  });

  const spinner = ora("Planning...").start();

  let plan: PlanSpec;
  try {
    const orchestrator = new Orchestrator(config, context);
    plan = await orchestrator.run(task);
    spinner.succeed("Plan generated");
  } catch (err) {
    spinner.fail("Planning failed");
    logger.log({
      type: "task_failed",
      data: { task, error: err instanceof Error ? err.message : String(err) },
    });
    console.error(
      chalk.red(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  // Display plan summary
  console.log(chalk.bold("\n📋 Plan Summary"));
  console.log(chalk.dim("─".repeat(50)));
  console.log(
    chalk.cyan(`Milestone: ${plan.milestone.title}`),
  );
  console.log(
    chalk.cyan(`Slices: ${plan.slices.length}`),
  );
  console.log(
    chalk.cyan(
      `Estimated cost: $${plan.totalEstimate.costUsd.toFixed(4)}`,
    ),
  );
  console.log(chalk.dim("─".repeat(50)));

  for (const slice of plan.slices) {
    console.log(
      chalk.yellow(`  → ${slice.id}: ${slice.title} (${slice.tasks.length} tasks)`),
    );
  }

  if (options.dryRun) {
    console.log(chalk.dim("\n--dry-run: Stopping before execution."));
    logger.log({
      type: "task_completed",
      data: { task, dryRun: true, slices: plan.slices.length },
    });
    return;
  }

  // Prompt for approval
  const proceed = await confirm({
    message: "Execute this plan?",
    default: true,
  });

  if (!proceed) {
    console.log(chalk.dim("Aborted."));
    return;
  }

  // Execute plan
  const execSpinner = ora("Executing plan...").start();
  try {
    const orchestrator = new Orchestrator(config, context);
    await orchestrator.auto(plan);
    execSpinner.succeed("Plan executed successfully");

    // Extract and save decisions
    const record = DecisionExtractor.extract(plan.slices[0], []);
    const memory = new ProjectMemory(config);
    memory.saveDecisionRecord(record);
    memory.close();

    // R015: log session completed
    logger.log({
      type: "task_completed",
      data: {
        task,
        slices: plan.slices.length,
        cost: plan.totalEstimate.costUsd,
      },
    });

    console.log(chalk.green("\n✅ All slices completed."));
  } catch (err) {
    execSpinner.fail("Execution failed");
    logger.log({
      type: "task_failed",
      data: { task, error: err instanceof Error ? err.message : String(err) },
    });
    console.error(
      chalk.red(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
  }
}
