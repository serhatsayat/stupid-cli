import chalk from "chalk";
import { loadConfig, ActivityLogger } from "@serhatsayat/stupid-core";

/**
 * Cost report command: `stupid cost`
 *
 * Reads activity logs for cost_recorded events and displays a
 * formatted report. Optionally filters by date.
 *
 * R007: Surfaces cost tracking data to the user.
 */
export async function costCommand(options: {
  date?: string;
}): Promise<void> {
  const config = loadConfig();
  const logger = new ActivityLogger(config);

  const entries = logger.readLogs({
    date: options.date,
    type: "cost_recorded",
  });

  if (entries.length === 0) {
    // Also check for task_completed events which carry cost data
    const completedEntries = logger.readLogs({
      date: options.date,
      type: "task_completed",
    });

    if (completedEntries.length === 0) {
      console.log(chalk.dim("No cost data recorded."));
      return;
    }

    // Display cost from completed task events
    console.log(chalk.bold("\n💰 Cost Report"));
    console.log(chalk.dim("─".repeat(50)));

    let totalCost = 0;
    for (const entry of completedEntries) {
      const cost =
        typeof entry.data.cost === "number" ? entry.data.cost : 0;
      totalCost += cost;
      console.log(
        chalk.white(
          `  ${entry.timestamp.slice(0, 19)}  $${cost.toFixed(4)}  ${entry.data.task ?? entry.data.action ?? "—"}`,
        ),
      );
    }

    console.log(chalk.dim("─".repeat(50)));
    console.log(
      chalk.cyan(`  Total: $${totalCost.toFixed(4)}`),
    );
    return;
  }

  console.log(chalk.bold("\n💰 Cost Report"));
  console.log(chalk.dim("─".repeat(50)));

  let totalCost = 0;
  for (const entry of entries) {
    const cost =
      typeof entry.data.costUsd === "number" ? entry.data.costUsd : 0;
    totalCost += cost;
    const tokens =
      typeof entry.data.tokensUsed === "number"
        ? entry.data.tokensUsed.toLocaleString()
        : "—";
    const model =
      typeof entry.data.model === "string" ? entry.data.model : "—";
    console.log(
      chalk.white(
        `  ${entry.timestamp.slice(0, 19)}  $${cost.toFixed(4)}  ${tokens} tokens  ${model}`,
      ),
    );
  }

  console.log(chalk.dim("─".repeat(50)));
  console.log(chalk.cyan(`  Total: $${totalCost.toFixed(4)}`));
}
