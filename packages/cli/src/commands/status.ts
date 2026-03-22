import chalk from "chalk";
import { loadConfig, StateMachine } from "@serhatsayat/stupid-core";

/**
 * Read-only command: `stupid status`
 *
 * Reads `.stupid/state.json` via StateMachine.getStatus() and displays
 * current session plan and progress. Prints "No active session" if
 * no state file exists.
 */
export async function statusCommand(): Promise<void> {
  const config = loadConfig();
  const stateMachine = new StateMachine(config);
  const status = stateMachine.getStatus();

  if (!status) {
    console.log(chalk.dim("No active session."));
    return;
  }

  const { plan, progress } = status;

  console.log(chalk.bold("\n📊 Session Status"));
  console.log(chalk.dim("─".repeat(50)));
  console.log(chalk.cyan(`Session:  ${progress.sessionId}`));
  console.log(chalk.cyan(`Started:  ${progress.startedAt}`));
  console.log(
    chalk.cyan(`Cost:     $${progress.totalCostUsd.toFixed(4)}`),
  );
  console.log(
    chalk.cyan(`Tokens:   ${progress.totalTokensUsed.toLocaleString()}`),
  );
  console.log(chalk.dim("─".repeat(50)));

  console.log(chalk.bold(`\n📋 ${plan.milestone.title}`));
  console.log(chalk.dim(`   ${plan.milestone.description}`));

  for (const slice of plan.slices) {
    const statusIcon =
      slice.status === "done"
        ? chalk.green("✅")
        : slice.status === "failed"
          ? chalk.red("❌")
          : slice.status === "in-progress"
            ? chalk.yellow("🔄")
            : chalk.dim("⏳");

    console.log(
      `  ${statusIcon} ${slice.id}: ${slice.title} (${slice.tasks.length} tasks) — ${slice.status}`,
    );
  }

  if (progress.completedTasks.length > 0) {
    console.log(
      chalk.green(
        `\n  Completed: ${progress.completedTasks.length} task(s)`,
      ),
    );
  }
  if (progress.failedTasks.length > 0) {
    console.log(
      chalk.red(`  Failed: ${progress.failedTasks.length} task(s)`),
    );
  }
}
