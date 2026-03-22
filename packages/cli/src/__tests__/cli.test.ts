import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "../../dist/cli.js");

/**
 * CLI argument parsing tests.
 *
 * These test the built binary via execSync since cli.ts calls program.parse()
 * at module scope — importing it would trigger parsing immediately.
 * The smoke test must run after `npm run build --workspace=packages/cli`.
 */
describe("CLI argument parsing", () => {
  const COMMANDS = ["auto", "status", "recall", "init", "cost", "doctor"] as const;

  it("--help lists all 7 commands", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    // Default command is "run" behavior (task argument on root program)
    for (const cmd of COMMANDS) {
      expect(output).toContain(cmd);
    }
    // The root program handles the default `stupid "task"` via an argument
    expect(output).toContain("task");
  });

  it("--version outputs 0.1.0", () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: "utf-8" });
    expect(output.trim()).toBe("0.1.0");
  });

  it("auto --help shows resume description", () => {
    const output = execSync(`node ${cliPath} auto --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("resume");
  });

  it("status --help shows session status description", () => {
    const output = execSync(`node ${cliPath} status --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("status");
  });

  it("recall --help shows memory search description", () => {
    const output = execSync(`node ${cliPath} recall --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("memory");
  });

  it("init --help shows initialization description", () => {
    const output = execSync(`node ${cliPath} init --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("init");
  });

  it("cost --help shows cost report description", () => {
    const output = execSync(`node ${cliPath} cost --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("cost");
  });

  it("doctor --help shows health check description", () => {
    const output = execSync(`node ${cliPath} doctor --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("health");
  });

  it("root program accepts --dry-run option", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    expect(output).toContain("--dry-run");
  });

  it("root program accepts --profile option", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    expect(output).toContain("--profile");
  });

  it("recall accepts --limit option", () => {
    const output = execSync(`node ${cliPath} recall --help`, { encoding: "utf-8" });
    expect(output).toContain("--limit");
  });

  it("cost accepts --date option", () => {
    const output = execSync(`node ${cliPath} cost --help`, { encoding: "utf-8" });
    expect(output).toContain("--date");
  });
});

/**
 * Interactive mode CLI flags — added in S02.
 *
 * Verifies --continue/-c flag and sessions subcommand are visible
 * in help output after cli.ts was modified for interactive TUI mode.
 */
describe("Interactive mode CLI flags (S02)", () => {
  it("--help contains --continue flag", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    expect(output).toContain("--continue");
  });

  it("--help contains -c short flag", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    expect(output).toContain("-c");
  });

  it("--help lists sessions subcommand", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    expect(output).toContain("sessions");
  });

  it("sessions --help shows session-related description", () => {
    const output = execSync(`node ${cliPath} sessions --help`, { encoding: "utf-8" });
    expect(output.toLowerCase()).toContain("session");
  });

  it("sessions subcommand is listed among all commands", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    // All original commands plus sessions
    for (const cmd of ["auto", "status", "recall", "init", "cost", "doctor", "sessions"]) {
      expect(output).toContain(cmd);
    }
  });

  it("non-TTY invocation shows help text (TTY guard)", () => {
    const output = execSync(`echo '' | node ${cliPath}`, { encoding: "utf-8" });
    expect(output).toContain("stupid");
  });
});
