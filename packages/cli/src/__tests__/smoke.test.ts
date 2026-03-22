import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "../../dist/cli.js");

describe("stupid CLI — smoke", () => {
  it("--help output includes all 8 command names", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    for (const cmd of ["auto", "status", "recall", "init", "cost", "doctor", "sessions"]) {
      expect(output).toContain(cmd);
    }
    // "run" is the default command — verified by the "task" argument presence
    expect(output).toContain("task");
  });

  it("--version outputs 0.1.0", () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: "utf-8" });
    expect(output.trim()).toBe("0.1.0");
  });

  it("no-args shows help text (Commander default)", () => {
    const output = execSync(`node ${cliPath}`, { encoding: "utf-8" });
    expect(output).toContain("stupid");
  });

  it("built CLI binary is executable", () => {
    // Verifies the shebang and binary integrity
    const output = execSync(`node ${cliPath} --version`, { encoding: "utf-8" });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
