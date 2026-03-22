import chalk from "chalk";
import ora from "ora";
import {
  loadConfig,
  Orchestrator,
  CrashRecovery,
  StateMachine,
  ActivityLogger,
} from "@serhatsayat/stupid-core";
import { buildContext } from "../context.js";

/**
 * Resume command: `stupid auto`
 *
 * Flow: loadConfig → CrashRecovery.detectCrash → StateMachine.getStatus →
 * acquireLock → buildContext → Orchestrator.auto(plan) → releaseLock
 *
 * R008: CrashRecovery lock flow — detectCrash → acquireLock → run → releaseLock in finally.
 * R015: ActivityLogger.log() at lifecycle points.
 */
export async function autoCommand(options: {
  verbose?: boolean;
}): Promise<void> {
  const config = loadConfig(
    options.verbose !== undefined ? { verbose: options.verbose } : undefined,
  );
  const logger = new ActivityLogger(config);
  const crashRecovery = new CrashRecovery(config);
  const stateMachine = new StateMachine(config);

  // R008: detect crash from previous session
  const crashResult = crashRecovery.detectCrash();
  if (crashResult?.crashed) {
    console.log(
      chalk.yellow(
        `⚠ Previous session crashed (PID ${crashResult.stalePid}, started ${crashResult.lockAge})`,
      ),
    );
    console.log(chalk.yellow("  Cleaning stale lock and resuming..."));
    crashRecovery.releaseLock();
  }

  // Load existing plan from state
  const status = stateMachine.getStatus();
  if (!status) {
    console.error(
      chalk.red('No active session to resume. Run `stupid "task"` first.'),
    );
    process.exitCode = 1;
    return;
  }

  // R008: acquire lock
  const locked = crashRecovery.acquireLock();
  if (!locked) {
    console.error(
      chalk.red("Another session is running. Use `stupid status` to check."),
    );
    process.exitCode = 1;
    return;
  }

  // R015: log session resumed
  logger.log({
    type: "task_started",
    data: {
      action: "auto_resume",
      sessionId: status.progress.sessionId,
      slices: status.plan.slices.length,
    },
  });

  const spinner = ora("Resuming execution...").start();

  try {
    const context = buildContext(config);
    const orchestrator = new Orchestrator(config, context);
    await orchestrator.auto(status.plan);
    spinner.succeed("Execution completed");

    // R015: log session completed
    logger.log({
      type: "task_completed",
      data: {
        action: "auto_resume",
        sessionId: status.progress.sessionId,
      },
    });

    console.log(chalk.green("\n✅ All slices completed."));
  } catch (err) {
    spinner.fail("Execution failed");

    // R015: log failure
    logger.log({
      type: "task_failed",
      data: {
        action: "auto_resume",
        error: err instanceof Error ? err.message : String(err),
      },
    });

    console.error(
      chalk.red(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    process.exitCode = 1;
  } finally {
    // R008: always release lock
    crashRecovery.releaseLock();
  }
}
