import { Command } from "commander";
import { runCommand } from "./commands/run.js";
import { autoCommand } from "./commands/auto.js";
import { statusCommand } from "./commands/status.js";
import { recallCommand } from "./commands/recall.js";
import { initCommand } from "./commands/init.js";
import { costCommand } from "./commands/cost.js";
import { doctorCommand } from "./commands/doctor.js";

const program = new Command();

program
  .name("stupid")
  .version("0.1.0")
  .description("Autonomous multi-agent coding orchestrator");

// Default command: `stupid "task description"`
program
  .argument("[task]", "Task description")
  .option("--dry-run", "Generate plan without executing", false)
  .option("--profile <profile>", "Token profile (budget|balanced|quality)")
  .option("--verbose", "Enable verbose output")
  .action(async (task: string | undefined, opts) => {
    if (!task) {
      program.help();
      return;
    }
    await runCommand(task, opts);
  });

// `stupid auto` — resume a previous session
program
  .command("auto")
  .description("Resume a previous session")
  .option("--verbose", "Enable verbose output")
  .action(async (opts) => {
    await autoCommand(opts);
  });

// `stupid status` — show current session status
program
  .command("status")
  .description("Show current session status")
  .action(async () => {
    await statusCommand();
  });

// `stupid recall <query>` — search project memory
program
  .command("recall")
  .description("Search project memory")
  .argument("<query>", "Search query")
  .option("--limit <limit>", "Max results", "10")
  .action(async (query: string, opts) => {
    await recallCommand(query, { limit: parseInt(opts.limit, 10) });
  });

// `stupid init` — initialize a project
program
  .command("init")
  .description("Initialize .stupid/ directory")
  .action(async () => {
    await initCommand();
  });

// `stupid cost` — show cost report
program
  .command("cost")
  .description("Show cost report")
  .option("--date <date>", "Filter by date (YYYY-MM-DD)")
  .action(async (opts) => {
    await costCommand(opts);
  });

// `stupid doctor` — check .stupid/ directory health
program
  .command("doctor")
  .description("Check .stupid/ directory health")
  .action(async () => {
    await doctorCommand();
  });

program.parse(process.argv);
