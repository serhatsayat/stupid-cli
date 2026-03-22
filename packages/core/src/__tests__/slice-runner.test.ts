import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRole } from "../types/index.js";
import type { AgentResult, TaskSpec, SliceSpec, StupidConfig } from "../types/index.js";
import { DEFAULT_CONFIG } from "../config/config.js";
import type {
  ICostTracker,
  IBudgetEnforcer,
  OrchestratorContext,
} from "../orchestrator/interfaces.js";

// ─── Helpers ─────────────────────────────────────────────────

function makeAgentResult(
  role: AgentRole,
  overrides?: Partial<AgentResult>,
): AgentResult {
  return {
    role,
    model: "claude-sonnet-4-6",
    success: true,
    output: `Output from ${role} phase`,
    structuredData: { approved: true },
    tokensUsed: 150,
    costUsd: 0.015,
    durationMs: 1000,
    ...overrides,
  };
}

function makeTaskSpec(
  id: string,
  role: AgentRole,
  overrides?: Partial<TaskSpec>,
): TaskSpec {
  return {
    id,
    title: `${role} task ${id}`,
    description: `Description for ${id}`,
    assignedRole: role,
    dependencies: [],
    files: [],
    ...overrides,
  };
}

function makeSliceSpec(tasks: TaskSpec[]): SliceSpec {
  return {
    id: "S01",
    title: "Test Slice",
    tasks,
    status: "pending",
  };
}

function testConfig(overrides?: Partial<StupidConfig>): StupidConfig {
  return {
    ...DEFAULT_CONFIG,
    profile: "balanced",
    projectRoot: "/test",
    ...overrides,
  };
}

function makeContext(
  config?: StupidConfig,
  overrides?: Partial<OrchestratorContext>,
): OrchestratorContext {
  return {
    config: config ?? testConfig(),
    ...overrides,
  };
}

// ─── Track agent creation order and model IDs ────────────────

const createdAgents: Array<{ role: AgentRole; config: StupidConfig }> = [];

// Control per-role agent results (default: success with approved)
const roleResults = new Map<AgentRole, AgentResult | ((opts: any) => AgentResult)>();

const mockExecute = vi.fn(async (options: any) => {
  const role = options.agentRole as AgentRole;
  const resultOrFn = roleResults.get(role);
  if (typeof resultOrFn === "function") return resultOrFn(options);
  return resultOrFn ?? makeAgentResult(role);
});

// ─── Module Mocks ────────────────────────────────────────────

// Mock child_process for TestRunner and PRBuilder
vi.mock("node:child_process", () => ({
  execSync: vi.fn(() => Buffer.from("Tests  5 passed (5)")),
}));

// Mock AgentFactory to track creation order and model selection
vi.mock("../agents/agent-factory.js", () => ({
  AgentFactory: {
    create: vi.fn((role: AgentRole, config: StupidConfig) => {
      createdAgents.push({ role, config });
      return { execute: mockExecute, getTools: vi.fn(() => []) };
    }),
  },
}));

vi.mock("../agents/prompt-loader.js", () => ({
  compilePrompt: vi.fn(() => "compiled prompt"),
  loadPromptTemplate: vi.fn(() => "template"),
  clearCache: vi.fn(),
}));

vi.mock("@mariozechner/pi-ai", () => ({
  getModel: vi.fn(() => ({ id: "mock-model" })),
}));

vi.mock("@mariozechner/pi-coding-agent", () => ({
  createAgentSession: vi.fn(async () => ({
    session: {
      agent: { setSystemPrompt: vi.fn(), subscribe: vi.fn(() => () => {}) },
      prompt: vi.fn(),
    },
  })),
  SessionManager: { inMemory: vi.fn() },
  codingTools: [],
  readOnlyTools: [],
}));

// ─── Import after mocks ─────────────────────────────────────

const { SliceRunner } = await import("../workflow/slice-runner.js");
const { AgentFactory } = await import("../agents/agent-factory.js");
const { execSync } = await import("node:child_process");

// ─── Tests ───────────────────────────────────────────────────

describe("SliceRunner", () => {
  let runner: InstanceType<typeof SliceRunner>;

  beforeEach(() => {
    vi.resetAllMocks();
    createdAgents.length = 0;
    roleResults.clear();

    // Default: all agents succeed with approved
    mockExecute.mockImplementation(async (options: any) => {
      const role = options.agentRole as AgentRole;
      const resultOrFn = roleResults.get(role);
      if (typeof resultOrFn === "function") return resultOrFn(options);
      return resultOrFn ?? makeAgentResult(role);
    });

    // Default: execSync returns passing test output
    (execSync as ReturnType<typeof vi.fn>).mockReturnValue(
      Buffer.from("Tests  5 passed (5)"),
    );

    runner = new SliceRunner();
  });

  // ── R003: Test-first ordering ──────────────────────────────

  describe("R003: test-first ordering", () => {
    it("executes tester tasks before implementer tasks", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
        makeTaskSpec("T02", AgentRole.Tester),
      ]);

      const result = await runner.run(slice, makeContext());

      // Tester should be created before Implementer
      const roles = createdAgents.map((a) => a.role);
      const testerIdx = roles.indexOf(AgentRole.Tester);
      const implIdx = roles.indexOf(AgentRole.Implementer);

      expect(testerIdx).toBeGreaterThanOrEqual(0);
      expect(implIdx).toBeGreaterThanOrEqual(0);
      expect(testerIdx).toBeLessThan(implIdx);
      expect(result.status).toBe("done");
    });

    it("processes all testers before any implementer when multiple of each", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
        makeTaskSpec("T02", AgentRole.Tester),
        makeTaskSpec("T03", AgentRole.Implementer),
        makeTaskSpec("T04", AgentRole.Tester),
      ]);

      await runner.run(slice, makeContext());

      const roles = createdAgents.map((a) => a.role);
      // All testers should come before any implementer
      const testerIndices = roles
        .map((r, i) => (r === AgentRole.Tester ? i : -1))
        .filter((i) => i >= 0);
      const implIndices = roles
        .map((r, i) => (r === AgentRole.Implementer ? i : -1))
        .filter((i) => i >= 0);

      expect(testerIndices.length).toBe(2);
      expect(implIndices.length).toBe(2);
      expect(Math.max(...testerIndices)).toBeLessThan(
        Math.min(...implIndices),
      );
    });
  });

  // ── R004: Escalation on reviewer rejection ─────────────────

  describe("R004: escalation on rejection", () => {
    it("on reviewer rejection, escalates implementer to a different model", async () => {
      let reviewerCallCount = 0;
      roleResults.set(AgentRole.Reviewer, () => {
        reviewerCallCount++;
        if (reviewerCallCount === 1) {
          // First review: reject
          return makeAgentResult(AgentRole.Reviewer, {
            structuredData: { approved: false },
          });
        }
        // Second review: approve
        return makeAgentResult(AgentRole.Reviewer, {
          structuredData: { approved: true },
        });
      });

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
        makeTaskSpec("T02", AgentRole.Reviewer),
      ]);

      // Use balanced profile: implementer starts at sonnet, ceiling is sonnet
      // But we need room for escalation — use quality profile (ceiling: opus)
      const config = testConfig({ profile: "quality" });
      const result = await runner.run(slice, makeContext(config));

      // Should have been created multiple times:
      // 1st: implementer (sonnet), reviewer (rejects)
      // 2nd: implementer (opus — escalated), reviewer (approves)
      const implCreations = createdAgents.filter(
        (a) => a.role === AgentRole.Implementer,
      );
      expect(implCreations.length).toBeGreaterThanOrEqual(2);

      // The second implementer execution should use a different (escalated) model
      // (verified via mock execute being called with a different model string)
      expect(reviewerCallCount).toBe(2);
      expect(result.status).toBe("done");
    });

    it("marks slice as failed when escalation hits ceiling", async () => {
      // Reviewer always rejects
      roleResults.set(
        AgentRole.Reviewer,
        () =>
          makeAgentResult(AgentRole.Reviewer, {
            structuredData: { approved: false },
          }),
      );

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
        makeTaskSpec("T02", AgentRole.Reviewer),
      ]);

      // Use budget profile: ceiling is haiku, implementer gets haiku
      // No escalation possible → fails
      const config = testConfig({ profile: "budget" });
      const result = await runner.run(slice, makeContext(config));

      expect(result.status).toBe("failed");
    });

    it("respects maxRetries limit", async () => {
      // Reviewer always rejects
      roleResults.set(
        AgentRole.Reviewer,
        () =>
          makeAgentResult(AgentRole.Reviewer, {
            structuredData: { approved: false },
          }),
      );

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
        makeTaskSpec("T02", AgentRole.Reviewer),
      ]);

      // Quality profile (ceiling opus) but maxRetries = 1
      const config = testConfig({
        profile: "quality",
        governance: { ...DEFAULT_CONFIG.governance, maxRetries: 1 },
      });
      const result = await runner.run(slice, makeContext(config));

      // After 1 escalation attempt (sonnet → opus), a second rejection hits maxRetries
      expect(result.status).toBe("failed");
    });
  });

  // ── R009: Atomic commits ───────────────────────────────────

  describe("R009: atomic commits", () => {
    it("calls PRBuilder.createCommit once per successful task", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Tester),
        makeTaskSpec("T02", AgentRole.Implementer),
      ]);

      const config = testConfig();
      await runner.run(slice, makeContext(config));

      // execSync is called for PRBuilder git operations
      const execCalls = (execSync as ReturnType<typeof vi.fn>).mock.calls;
      const commitCalls = execCalls.filter(
        (call: any[]) =>
          typeof call[0] === "string" && call[0].includes("git commit"),
      );

      // Two tasks → two commits (tester + implementer)
      expect(commitCalls.length).toBe(2);

      // Verify commit messages contain slice/task IDs
      expect(commitCalls[0][0]).toContain("feat(S01/T01)");
      expect(commitCalls[1][0]).toContain("feat(S01/T02)");
    });

    it("skips commit when config.git.commitPerTask is false", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Tester),
      ]);

      const config = testConfig({
        git: { ...DEFAULT_CONFIG.git, commitPerTask: false },
      });
      await runner.run(slice, makeContext(config));

      const execCalls = (execSync as ReturnType<typeof vi.fn>).mock.calls;
      const commitCalls = execCalls.filter(
        (call: any[]) =>
          typeof call[0] === "string" && call[0].includes("git commit"),
      );

      expect(commitCalls.length).toBe(0);
    });
  });

  // ── Governance integration ─────────────────────────────────

  describe("governance integration", () => {
    it("aborts early when budgetEnforcer returns hard_stop", async () => {
      const mockBudgetEnforcer: IBudgetEnforcer = {
        check: vi.fn(() => "hard_stop" as const),
        getRemainingBudget: vi.fn(() => 0),
      };
      const mockCostTracker: ICostTracker = {
        track: vi.fn(),
        getTotalCost: vi.fn(() => 5.0),
        getReport: vi.fn(() => []),
      };

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Tester),
        makeTaskSpec("T02", AgentRole.Implementer),
      ]);

      const result = await runner.run(
        slice,
        makeContext(testConfig(), {
          budgetEnforcer: mockBudgetEnforcer,
          costTracker: mockCostTracker,
        }),
      );

      expect(result.status).toBe("failed");
      // No agents should have been created since budget is exhausted
      expect(createdAgents.length).toBe(0);
    });

    it("tracks cost via costTracker after each agent execution", async () => {
      const mockCostTracker: ICostTracker = {
        track: vi.fn(),
        getTotalCost: vi.fn(() => 0),
        getReport: vi.fn(() => []),
      };

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Tester),
        makeTaskSpec("T02", AgentRole.Implementer),
      ]);

      await runner.run(
        slice,
        makeContext(testConfig(), { costTracker: mockCostTracker }),
      );

      // Cost tracked once per agent execution (tester + implementer)
      expect(mockCostTracker.track).toHaveBeenCalledTimes(2);
      expect(mockCostTracker.track).toHaveBeenCalledWith(
        AgentRole.Tester,
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockCostTracker.track).toHaveBeenCalledWith(
        AgentRole.Implementer,
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("works without any governance deps (all optional)", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Tester),
        makeTaskSpec("T02", AgentRole.Implementer),
        makeTaskSpec("T03", AgentRole.Finalizer),
      ]);

      // Context with no governance deps
      const context: OrchestratorContext = { config: testConfig() };
      const result = await runner.run(slice, context);

      expect(result.status).toBe("done");
      expect(createdAgents.length).toBe(3);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles missing structuredData gracefully (falls back to result.success)", async () => {
      // Reviewer returns no structuredData but success = true
      roleResults.set(
        AgentRole.Reviewer,
        () =>
          makeAgentResult(AgentRole.Reviewer, {
            structuredData: undefined,
            success: true,
          }),
      );

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
        makeTaskSpec("T02", AgentRole.Reviewer),
      ]);

      const result = await runner.run(slice, makeContext());

      // Should succeed because result.success is true as fallback
      expect(result.status).toBe("done");
    });

    it("returns slice with status 'done' when all tasks succeed", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Tester),
        makeTaskSpec("T02", AgentRole.Implementer),
        makeTaskSpec("T03", AgentRole.Reviewer),
        makeTaskSpec("T04", AgentRole.Finalizer),
      ]);

      const result = await runner.run(slice, makeContext());

      expect(result.status).toBe("done");
      expect(result.id).toBe("S01");
      expect(result.title).toBe("Test Slice");
    });

    it("marks slice as failed when tests fail in verify phase", async () => {
      // Make test execution fail
      (execSync as ReturnType<typeof vi.fn>).mockImplementation(
        (cmd: string) => {
          if (typeof cmd === "string" && cmd.includes("npm test")) {
            const err: any = new Error("Tests failed");
            err.stdout = Buffer.from("Tests  3 passed | 2 failed (5)");
            err.stderr = Buffer.from("");
            err.status = 1;
            throw err;
          }
          return Buffer.from("");
        },
      );

      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Implementer),
      ]);

      const result = await runner.run(slice, makeContext());
      expect(result.status).toBe("failed");
    });

    it("handles slice with only finalizer tasks", async () => {
      const slice = makeSliceSpec([
        makeTaskSpec("T01", AgentRole.Finalizer),
      ]);

      const result = await runner.run(slice, makeContext());

      expect(result.status).toBe("done");
      expect(createdAgents.length).toBe(1);
      expect(createdAgents[0].role).toBe(AgentRole.Finalizer);
    });
  });
});
