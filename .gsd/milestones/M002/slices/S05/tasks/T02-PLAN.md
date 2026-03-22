---
estimated_steps: 4
estimated_files: 3
skills_used:
  - test
---

# T02: Wire doctor CLI command and add CLI test

**Slice:** S05 — Doctor System (Basic)
**Milestone:** M002

## Description

Create the `stupid doctor` CLI command that invokes `Doctor.check()` and prints a colored health report. Register it in the Commander.js program and add CLI test coverage. This makes the Doctor visible to users.

## Steps

1. **Create `packages/cli/src/commands/doctor.ts`** — Follow the `statusCommand` pattern in `packages/cli/src/commands/status.ts`:
   ```typescript
   import chalk from "chalk";
   import { loadConfig, Doctor } from "@stupid/core";

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

     const passCount = report.checks.filter(c => c.status === "pass").length;
     const warnCount = report.checks.filter(c => c.status === "warn").length;
     const failCount = report.checks.filter(c => c.status === "fail").length;

     console.log(
       `  ${chalk.green(`${passCount} passed`)}` +
       (warnCount > 0 ? `, ${chalk.yellow(`${warnCount} warnings`)}` : "") +
       (failCount > 0 ? `, ${chalk.red(`${failCount} failed`)}` : "")
     );

     if (!report.passed) {
       process.exit(1);
     }
   }
   ```
   Key detail: wrap `loadConfig()` in try/catch and fall back to `process.cwd()`. Doctor must work even when config is broken.

2. **Register in `packages/cli/src/cli.ts`** — Add import and command:
   - Add import: `import { doctorCommand } from "./commands/doctor.js";`
   - Add command block before `program.parse(process.argv)`:
     ```typescript
     program
       .command("doctor")
       .description("Check .stupid/ directory health")
       .action(async () => {
         await doctorCommand();
       });
     ```

3. **Add `doctor --help` test to `packages/cli/src/__tests__/cli.test.ts`** — Add a new test case:
   ```typescript
   it("doctor --help shows health check description", () => {
     const output = execSync(`node ${cliPath} doctor --help`, { encoding: "utf-8" });
     expect(output.toLowerCase()).toContain("health");
   });
   ```

4. **Update the existing `--help lists all N commands` test** — The current test checks for 5 commands (`auto`, `status`, `recall`, `init`, `cost`). Update it to also check for `doctor`. Change the comment from "6 commands" to "7 commands" (the 6th existing one is the root task argument, now we add doctor as the 7th visible command).

## Must-Haves

- [ ] `doctorCommand()` in `packages/cli/src/commands/doctor.ts` prints colored report
- [ ] `loadConfig()` wrapped in try/catch with `process.cwd()` fallback
- [ ] Exit code 1 when any check has status "fail"
- [ ] `stupid doctor` registered in `packages/cli/src/cli.ts`
- [ ] `doctor --help` test added to CLI test suite
- [ ] All existing CLI tests still pass (including the `--help lists all commands` test — update it)
- [ ] `npm run build` clean

## Verification

- `npm run build` — clean across all packages
- `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` — all tests pass including new doctor test
- `node packages/cli/dist/cli.js doctor --help` — outputs help with "health" in description
- `npx vitest run` — all tests pass (484+ existing + new doctor tests)

## Inputs

- `packages/core/src/infrastructure/doctor.ts` — Doctor class created in T01
- `packages/core/src/index.ts` — Doctor export added in T01
- `packages/cli/src/commands/status.ts` — pattern reference for CLI command structure
- `packages/cli/src/cli.ts` — existing CLI registration to extend
- `packages/cli/src/__tests__/cli.test.ts` — existing CLI tests to extend

## Expected Output

- `packages/cli/src/commands/doctor.ts` — new CLI command file
- `packages/cli/src/cli.ts` — modified with doctor command registration
- `packages/cli/src/__tests__/cli.test.ts` — modified with doctor --help test
