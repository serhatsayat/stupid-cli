import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AgentRole } from "../types/index.js";
import type { AgentResult, StupidConfig } from "../types/index.js";
import { DEFAULT_CONFIG } from "../config/config.js";
import type { ICostTracker, IBudgetEnforcer } from "../orchestrator/interfaces.js";

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
    structuredData: { title: "Test Plan", description: "Test description" },
    tokensUsed: 150,
    costUsd: 0.015,
    durationMs: 1000,
    ...overrides,
  };
}

function budgetConfig(): StupidConfig {
  return { ...DEFAULT_CONFIG, profile: "budget", projectRoot: "/test" };
}

function balancedConfig(): StupidConfig {
  return { ...DEFAULT_CONFIG, profile: "balanced", projectRoot: "/test" };
}

// ─── Mock Agents ─────────────────────────────────────────────

// Track which roles were created and in what order
const createdRoles: AgentRole[] = [];

// Control per-role results (default: success)
const roleResults = new Map<AgentRole, AgentResult>();

const mockExecute = vi.fn(async (options: any) => {
  const role = options.agentRole as AgentRole;
  return roleResults.get(role) ?? makeAgentResult(role);
});

// ─── Module Mocks ────────────────────────────────────────────

vi.mock("../agents/agent-factory.js", () => ({
  AgentFactory: {
    create: vi.fn((role: AgentRole, _config: StupidConfig) => {
      createdRoles.push(role);
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

const { Orchestrator } = await import("../orchestrator/orchestrator.js");
const { AgentFactory } = await import("../agents/agent-factory.js");

// ─── Tests ───────────────────────────────────────────────────

describe("Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdRoles.length = 0;
    roleResults.clear();
    // Reset mockExecute to default behavior
    mockExecute.mockImplementation(async (options: any) => {
      const role = options.agentRole as AgentRole;
      return roleResults.get(role) ?? makeAgentResult(role);
    });
  });

  describe("run()", () => {
    it("dispatches research → spec → architect in order (balanced profile)", async () => {
      const orchestrator = new Orchestrator(balancedConfig());
      await orchestrator.run("Build a login page");

      expect(createdRoles).toEqual([
        AgentRole.Research,
        AgentRole.Spec,
        AgentRole.Architect,
      ]);
    });

    it("dispatches research → spec only for budget profile (architect skipped)", async () => {
      const orchestrator = new Orchestrator(budgetConfig());
      await orchestrator.run("Build a login page");

      expect(createdRoles).toEqual([
        AgentRole.Research,
        AgentRole.Spec,
      ]);
      // Architect should NOT be created
      expect(createdRoles).not.toContain(AgentRole.Architect);
    });

    it("returns a valid PlanSpec", async () => {
      const orchestrator = new Orchestrator(balancedConfig());
      const plan = await orchestrator.run("Build a login page");

      expect(plan).toBeDefined();
      expect(plan.milestone).toBeDefined();
      expect(plan.milestone.id).toBe("M001");
      expect(plan.slices).toBeDefined();
      expect(Array.isArray(plan.slices)).toBe(true);
      expect(plan.totalEstimate).toBeDefined();
    });

    it("attempts escalation when research phase fails", async () => {
      // First call (research) fails, second call (research retry) succeeds
      let researchCallCount = 0;
      mockExecute.mockImplementation(async (options: any) => {
        const role = options.agentRole as AgentRole;
        if (role === AgentRole.Research) {
          researchCallCount++;
          if (researchCallCount === 1) {
            return makeAgentResult(role, {
              success: false,
              error: "Rate limited",
            });
          }
          // Second attempt succeeds (escalation)
          return makeAgentResult(role);
        }
        return makeAgentResult(role);
      });

      const orchestrator = new Orchestrator(balancedConfig());
      const plan = await orchestrator.run("Build a login page");

      // Should have created research twice (original + escalation), then spec + architect
      expect(plan).toBeDefined();
      // mockExecute called: research(fail) + research(success) + spec + architect = 4
      expect(mockExecute).toHaveBeenCalledTimes(4);
    });

    it("throws when phase fails and escalation is exhausted", async () => {
      // Research always fails
      mockExecute.mockImplementation(async (options: any) => {
        const role = options.agentRole as AgentRole;
        if (role === AgentRole.Research) {
          return makeAgentResult(role, {
            success: false,
            error: "Fatal error",
          });
        }
        return makeAgentResult(role);
      });

      // Use quality profile so ceiling is opus — research uses haiku, escalation goes to sonnet then fails again
      const config = { ...DEFAULT_CONFIG, profile: "quality" as const, projectRoot: "/test" };
      const orchestrator = new Orchestrator(config);

      await expect(orchestrator.run("Build a login page")).rejects.toThrow(
        /failed after escalation/,
      );
    });

    it("tracks cost when costTracker is injected", async () => {
      const mockCostTracker: ICostTracker = {
        track: vi.fn(),
        getTotalCost: vi.fn(() => 0),
        getReport: vi.fn(() => []),
      };

      const orchestrator = new Orchestrator(balancedConfig(), {
        costTracker: mockCostTracker,
      });
      await orchestrator.run("Build a login page");

      // Should track cost for research, spec, and architect phases
      expect(mockCostTracker.track).toHaveBeenCalledTimes(3);
      expect(mockCostTracker.track).toHaveBeenCalledWith(
        AgentRole.Research,
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockCostTracker.track).toHaveBeenCalledWith(
        AgentRole.Spec,
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockCostTracker.track).toHaveBeenCalledWith(
        AgentRole.Architect,
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("checks budget via budgetEnforcer and stops on hard_stop", async () => {
      const mockBudgetEnforcer: IBudgetEnforcer = {
        check: vi.fn(() => "hard_stop" as const),
        getRemainingBudget: vi.fn(() => 0),
      };
      const mockCostTracker: ICostTracker = {
        track: vi.fn(),
        getTotalCost: vi.fn(() => 5.0),
        getReport: vi.fn(() => []),
      };

      const orchestrator = new Orchestrator(balancedConfig(), {
        budgetEnforcer: mockBudgetEnforcer,
        costTracker: mockCostTracker,
      });

      await expect(orchestrator.run("Build a login page")).rejects.toThrow(
        /Budget hard stop/,
      );
    });

    it("proceeds when budgetEnforcer returns ok", async () => {
      const mockBudgetEnforcer: IBudgetEnforcer = {
        check: vi.fn(() => "ok" as const),
        getRemainingBudget: vi.fn(() => 4.0),
      };

      const orchestrator = new Orchestrator(balancedConfig(), {
        budgetEnforcer: mockBudgetEnforcer,
      });
      const plan = await orchestrator.run("Build a login page");

      expect(plan).toBeDefined();
      // Budget checked before each phase: research + spec + architect = 3
      expect(mockBudgetEnforcer.check).toHaveBeenCalledTimes(3);
    });

    it("saves plan via stateMachine when injected", async () => {
      const mockStateMachine = {
        savePlan: vi.fn(),
        loadState: vi.fn(() => null),
        updateSlice: vi.fn(),
      };

      const orchestrator = new Orchestrator(balancedConfig(), {
        stateMachine: mockStateMachine,
      });
      const plan = await orchestrator.run("Build a login page");

      expect(mockStateMachine.savePlan).toHaveBeenCalledWith(plan);
    });
  });

  describe("auto()", () => {
    it("throws when no sliceRunner is injected", async () => {
      const orchestrator = new Orchestrator(balancedConfig());
      const plan = await orchestrator.run("Build something");

      await expect(orchestrator.auto(plan)).rejects.toThrow(
        "SliceRunner not available — requires S04",
      );
    });

    it("iterates slices via injected sliceRunner", async () => {
      const mockSliceRunner = {
        run: vi.fn(async (slice: any) => slice),
      };

      const orchestrator = new Orchestrator(balancedConfig(), {
        sliceRunner: mockSliceRunner,
      });
      const plan = await orchestrator.run("Build something");

      await orchestrator.auto(plan);

      expect(mockSliceRunner.run).toHaveBeenCalledTimes(plan.slices.length);
    });
  });

  describe("R001: Orchestrator never imports project file tools", () => {
    it("source file does NOT import codingTools, readOnlyTools, bashTool, editTool, writeTool, or readTool", () => {
      const sourceFile = resolve(
        import.meta.dirname,
        "..",
        "orchestrator",
        "orchestrator.ts",
      );
      const source = readFileSync(sourceFile, "utf-8");

      // Strip comments (single-line and multi-line) to avoid false positives
      // from JSDoc that documents the R001 constraint itself
      const codeOnly = source
        .replace(/\/\*[\s\S]*?\*\//g, "")  // block comments
        .replace(/\/\/.*/g, "");             // line comments

      // These tool imports/usages must NEVER appear in the Orchestrator code
      const forbiddenPatterns = [
        /\bcodingTools\b/,
        /\breadOnlyTools\b/,
        /\bbashTool\b/,
        /\beditTool\b/,
        /\bwriteTool\b/,
        /\breadTool\b/,
      ];

      for (const pattern of forbiddenPatterns) {
        expect(codeOnly).not.toMatch(pattern);
      }
    });
  });
});
