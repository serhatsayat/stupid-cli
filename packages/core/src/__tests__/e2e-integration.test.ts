import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

// Direct imports — not via barrel — to avoid mock interference from other test files
import { Orchestrator } from "../orchestrator/orchestrator.js";
import { ComplexityClassifier } from "../orchestrator/complexity-classifier.js";
import { RoutingHistory } from "../orchestrator/routing-history.js";
import { CostTracker } from "../governance/cost-tracker.js";
import { BudgetEnforcer } from "../governance/budget-enforcer.js";
import { LoopDetector } from "../governance/loop-detector.js";
import { FileSelector } from "../context/file-selector.js";
import { Doctor } from "../infrastructure/doctor.js";
import { WorktreeManager } from "../infrastructure/worktree-manager.js";
import { StateMachine } from "../workflow/state-machine.js";
import { ProjectMemory } from "../memory/project-memory.js";
import { SliceRunner } from "../workflow/slice-runner.js";
import { DEFAULT_CONFIG } from "../config/config.js";
import type { StupidConfig } from "../types/index.js";
import type { OrchestratorContext } from "../orchestrator/interfaces.js";

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Creates a temp directory with an initialized git repo, initial commit,
 * `.stupid/` state directory, and a minimal source file for agents to read.
 *
 * Follows the pattern from worktree-manager-integration.test.ts.
 */
function createTempGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "e2e-integration-"));
  execSync("git init -b main", { cwd: dir, stdio: "pipe" });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: "pipe" });
  execSync('git config user.email "test@example.com"', {
    cwd: dir,
    stdio: "pipe",
  });

  // Create .stupid/ state directory (required by ProjectMemory, RoutingHistory)
  mkdirSync(join(dir, ".stupid"), { recursive: true });

  // Create minimal source file so agents have something to read
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(
    join(dir, "src", "index.ts"),
    [
      "// Main entry point",
      "export function hello(): string {",
      '  return "hello world";',
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(join(dir, "README.md"), "# Test Repo\n\nA test project.\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "initial commit"', { cwd: dir, stdio: "pipe" });

  return dir;
}

/**
 * Wire all S01-S05 modules into a full OrchestratorContext.
 * Mirrors the composition root in packages/cli/src/context.ts.
 */
function buildTestContext(
  config: StupidConfig,
): { context: OrchestratorContext; routingHistory: RoutingHistory } {
  const stateDir = join(config.projectRoot, ".stupid");

  const costTracker = new CostTracker(config);
  const budgetEnforcer = new BudgetEnforcer(config);
  const loopDetector = new LoopDetector(config);
  const stateMachine = new StateMachine(config);
  const memory = new ProjectMemory(config);
  const sliceRunner = new SliceRunner();
  const fileSelector = new FileSelector();
  const worktreeManager = new WorktreeManager({
    projectRoot: config.projectRoot,
    worktreeMode: config.git.worktreeMode,
  });
  const complexityClassifier = new ComplexityClassifier();
  const routingHistory = new RoutingHistory(stateDir);

  const context: OrchestratorContext = {
    config,
    costTracker,
    budgetEnforcer,
    loopDetector,
    stateMachine,
    memory,
    sliceRunner,
    fileSelector,
    worktreeManager,
    complexityClassifier,
    routingHistory,
  };

  return { context, routingHistory };
}

// ─── Integration Tests ──────────────────────────────────────
//
// Gated on ANTHROPIC_API_KEY or ANTHROPIC_OAUTH_TOKEN: the entire
// suite is skipped when neither environment variable is set. This
// prevents CI failures in environments without API credentials.
//
// Security: ANTHROPIC_API_KEY and ANTHROPIC_OAUTH_TOKEN are never
// logged, echoed, or included in assertion messages. Only their
// existence is checked for the gate.

describe.skipIf(!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_OAUTH_TOKEN)(
  "End-to-end integration (real Anthropic API)",
  () => {
    const tempDirs: string[] = [];
    let activeRoutingHistory: RoutingHistory | null = null;

    afterEach(() => {
      // Close SQLite connections before removing temp directories
      if (activeRoutingHistory) {
        try {
          activeRoutingHistory.close();
        } catch {
          /* ignore close errors during cleanup */
        }
        activeRoutingHistory = null;
      }

      for (const dir of tempDirs) {
        rmSync(dir, { recursive: true, force: true });
      }
      tempDirs.length = 0;
    });

    it(
      "runs full planning pipeline and produces a valid plan with clean Doctor state",
      async () => {
        // ── Setup: temp git repo + config ─────────────────
        const tempDir = createTempGitRepo();
        tempDirs.push(tempDir);

        // Budget profile: cheapest/fastest, uses haiku, skips architect phase
        const config: StupidConfig = {
          ...DEFAULT_CONFIG,
          profile: "budget",
          projectRoot: tempDir,
        };

        // ── Wire full OrchestratorContext ──────────────────
        const { context, routingHistory } = buildTestContext(config);
        activeRoutingHistory = routingHistory;

        const orchestrator = new Orchestrator(config, context);

        // ── Run the full planning pipeline ────────────────
        // Budget profile executes: research → spec → plan (architect skipped)
        const plan = await orchestrator.run("add a hello world function");

        // ── Assert plan structure ─────────────────────────
        // Milestone exists with non-empty title
        expect(plan.milestone).toBeDefined();
        expect(plan.milestone.title).toBeTruthy();
        expect(plan.milestone.title.length).toBeGreaterThan(0);

        // At least one slice with at least one task
        expect(plan.slices.length).toBeGreaterThanOrEqual(1);
        expect(plan.slices[0]).toBeDefined();
        expect(plan.slices[0].tasks.length).toBeGreaterThanOrEqual(1);

        // Slices have meaningful structure
        for (const slice of plan.slices) {
          expect(slice.id).toBeTruthy();
          expect(slice.tasks.length).toBeGreaterThanOrEqual(1);
          for (const task of slice.tasks) {
            expect(task.id).toBeTruthy();
            expect(task.assignedRole).toBeTruthy();
          }
        }

        // Agent outputs produced non-zero token usage (proves real API was called)
        expect(plan.totalEstimate.tokens).toBeGreaterThan(0);

        // ── Doctor health check on post-run state ─────────
        // Verifies .stupid/ directory integrity after a real pipeline execution:
        // - MEMORY.db and routing.db pass SQLite PRAGMA integrity_check
        // - No stale lock files
        // - No corrupt state files
        const doctor = new Doctor(tempDir);
        const report = doctor.check();

        // No checks should have "fail" status
        const failedChecks = report.checks.filter(
          (c) => c.status === "fail",
        );
        expect(failedChecks).toEqual([]);
        expect(report.passed).toBe(true);

        // ── Cleanup database connections ──────────────────
        routingHistory.close();
        activeRoutingHistory = null;
      },
      180_000,
    );
  },
);
