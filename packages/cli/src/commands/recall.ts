import chalk from "chalk";
import { loadConfig, ProjectMemory } from "@stupid/core";

/**
 * Memory search command: `stupid recall "query"`
 *
 * Searches project memory (MEMORY.db) for past decisions, patterns,
 * and lessons matching the query string.
 */
export async function recallCommand(
  query: string,
  options: { limit?: number },
): Promise<void> {
  const config = loadConfig();
  const memory = new ProjectMemory(config);

  try {
    const limit = options.limit ?? 10;
    const results = await memory.search(query, limit);

    if (results.length === 0) {
      console.log(chalk.dim(`No results for "${query}".`));
      return;
    }

    console.log(
      chalk.bold(`\n🔍 ${results.length} result(s) for "${query}"`),
    );
    console.log(chalk.dim("─".repeat(50)));

    for (const record of results) {
      console.log(
        chalk.yellow(`\n  [${record.category}] ${record.id}`),
      );
      if (record.summary) {
        console.log(chalk.white(`  ${record.summary}`));
      }
      if (record.decisions && record.decisions.length > 0) {
        console.log(chalk.cyan(`  Decisions:`));
        for (const d of record.decisions) {
          console.log(chalk.cyan(`    • ${d}`));
        }
      }
      if (record.patterns && record.patterns.length > 0) {
        console.log(chalk.green(`  Patterns:`));
        for (const p of record.patterns) {
          console.log(chalk.green(`    • ${p}`));
        }
      }
      if (record.date) {
        console.log(chalk.dim(`  Date: ${record.date}`));
      }
    }
  } finally {
    memory.close();
  }
}
