import chalk from "chalk";
import { loadConfig, Doctor } from "@stupid/core";

/**
 * CLI command: `stupid doctor`
 *
 * Runs health checks on the `.stupid/` state directory and prints
 * a colored report. Exit code 0 if all checks pass, 1 if any fail.
 * Works even when config is invalid — falls back to process.cwd().
 */
export async function doctorCommand(): Promise<void> {
  let projectRoot: string;
  try {
    const config = loadConfig();
    projectRoot = config.projectRoot;
  } catch {
    projectRoot = process.cwd();
  }

  const doctor = new Doctor(projectRoot);
  const report = doctor.check();

  console.log(chalk.bold("\n🩺 Doctor Report"));
  console.log(chalk.dim("─".repeat(50)));

  for (const check of report.checks) {
    const icon =
      check.status === "pass"
        ? chalk.green("✅")
        : check.status === "warn"
          ? chalk.yellow("⚠️")
          : chalk.red("❌");

    console.log(`  ${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      console.log(chalk.dim(`     ${check.details}`));
    }
  }

  console.log(chalk.dim("─".repeat(50)));

  const passCount = report.checks.filter((c) => c.status === "pass").length;
  const warnCount = report.checks.filter((c) => c.status === "warn").length;
  const failCount = report.checks.filter((c) => c.status === "fail").length;

  console.log(
    `  ${chalk.green(`${passCount} passed`)}` +
      (warnCount > 0 ? `, ${chalk.yellow(`${warnCount} warnings`)}` : "") +
      (failCount > 0 ? `, ${chalk.red(`${failCount} failed`)}` : ""),
  );

  if (!report.passed) {
    process.exit(1);
  }
}
