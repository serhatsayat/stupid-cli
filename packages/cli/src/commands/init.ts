import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "@serhatsayat/stupid-core";

/**
 * Setup command: `stupid init`
 *
 * Creates the `.stupid/` directory and writes a default `config.yml`
 * from the framework's DEFAULT_CONFIG. Safe to re-run — skips if
 * config already exists.
 */
export async function initCommand(): Promise<void> {
  const stupidDir = resolve(".stupid");
  const configPath = resolve(stupidDir, "config.yml");

  // Create directory
  if (!existsSync(stupidDir)) {
    mkdirSync(stupidDir, { recursive: true });
    console.log(chalk.green("✅ Created .stupid/ directory"));
  } else {
    console.log(chalk.dim("  .stupid/ directory already exists"));
  }

  // Write default config
  if (!existsSync(configPath)) {
    // Omit runtime-resolved fields from the persisted config
    const { projectRoot: _pr, verbose: _v, ...persistableConfig } = DEFAULT_CONFIG;
    const yamlContent = stringify(persistableConfig, { indent: 2 });
    writeFileSync(configPath, yamlContent, "utf-8");
    console.log(chalk.green("✅ Created .stupid/config.yml with defaults"));
  } else {
    console.log(chalk.dim("  .stupid/config.yml already exists"));
  }

  console.log(
    chalk.cyan(
      '\n🚀 Ready! Run `stupid "your task"` to get started.',
    ),
  );
}
