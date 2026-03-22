import { execSync, type ExecSyncOptionsWithBufferEncoding } from "node:child_process";

// ─── Types ───────────────────────────────────────────────────

export interface TestResult {
  passed: boolean;
  total: number;
  passing: number;
  failing: number;
  output: string;
  durationMs: number;
}

export interface TestRunnerOptions {
  /** Timeout in milliseconds (default: 60_000) */
  timeout?: number;
  /** Working directory for the test command */
  cwd?: string;
}

// ─── Output Parsers ──────────────────────────────────────────

/**
 * Parse Vitest summary line:
 *   "Tests  3 passed | 1 failed (4)"
 *   "Tests  5 passed (5)"
 */
function parseVitestOutput(output: string): { passing: number; failing: number; total: number } | null {
  // Match: Tests  N passed | M failed (T)  OR  Tests  N passed (T)
  const match = output.match(
    /Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?\s*\((\d+)\)/,
  );
  if (!match) return null;
  const passing = parseInt(match[1], 10);
  const failing = match[2] ? parseInt(match[2], 10) : 0;
  const total = parseInt(match[3], 10);
  return { passing, failing, total };
}

/**
 * Parse Jest summary line:
 *   "Tests: 3 passed, 1 failed, 4 total"
 *   "Tests: 5 passed, 5 total"
 */
function parseJestOutput(output: string): { passing: number; failing: number; total: number } | null {
  const match = output.match(
    /Tests:\s+(?:(\d+)\s+passed,?\s*)?(?:(\d+)\s+failed,?\s*)?(\d+)\s+total/,
  );
  if (!match) return null;
  const passing = match[1] ? parseInt(match[1], 10) : 0;
  const failing = match[2] ? parseInt(match[2], 10) : 0;
  const total = parseInt(match[3], 10);
  return { passing, failing, total };
}

/**
 * Try all known parsers in order. Returns first match or zeros.
 */
function parseTestOutput(output: string): { passing: number; failing: number; total: number } {
  return (
    parseVitestOutput(output) ??
    parseJestOutput(output) ??
    { passing: 0, failing: 0, total: 0 }
  );
}

// ─── TestRunner ──────────────────────────────────────────────

export class TestRunner {
  /**
   * Execute a test command and parse its output for pass/fail counts.
   *
   * Handles both Vitest and Jest output formats. On non-zero exit
   * (test failures), still parses output and returns `passed: false`.
   */
  run(command: string, options?: TestRunnerOptions): TestResult {
    const timeout = options?.timeout ?? 60_000;
    const cwd = options?.cwd;
    const startMs = Date.now();

    let output = "";
    let exitedClean = true;

    const execOptions: ExecSyncOptionsWithBufferEncoding = {
      timeout,
      encoding: "buffer",
      stdio: ["pipe", "pipe", "pipe"],
      ...(cwd ? { cwd } : {}),
    };

    try {
      const stdout = execSync(command, execOptions);
      output = stdout.toString("utf-8");
    } catch (err: unknown) {
      exitedClean = false;
      // execSync throws on non-zero exit — capture combined output
      if (err && typeof err === "object") {
        const e = err as { stdout?: Buffer; stderr?: Buffer };
        const parts: string[] = [];
        if (e.stdout) parts.push(e.stdout.toString("utf-8"));
        if (e.stderr) parts.push(e.stderr.toString("utf-8"));
        output = parts.join("\n");
      }
    }

    const durationMs = Date.now() - startMs;
    const { passing, failing, total } = parseTestOutput(output);
    const passed = exitedClean && failing === 0;

    return { passed, total, passing, failing, output, durationMs };
  }
}
