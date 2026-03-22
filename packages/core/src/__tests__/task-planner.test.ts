import { describe, it, expect } from "vitest";
import { AgentRole } from "../types/index.js";
import type { AgentResult } from "../types/index.js";
import { TaskPlanner } from "../orchestrator/task-planner.js";

// ─── Helpers ─────────────────────────────────────────────────

function makeResult(
  role: AgentRole,
  overrides?: Partial<AgentResult>,
): AgentResult {
  return {
    role,
    model: "claude-sonnet-4-6",
    success: true,
    output: `Output from ${role}`,
    tokensUsed: 100,
    costUsd: 0.01,
    durationMs: 500,
    ...overrides,
  };
}

function makeResearchResult(overrides?: Partial<AgentResult>): AgentResult {
  return makeResult(AgentRole.Research, {
    output: "Research findings: 3 files found, ESM project",
    tokensUsed: 200,
    costUsd: 0.02,
    durationMs: 1000,
    ...overrides,
  });
}

function makeSpecResult(overrides?: Partial<AgentResult>): AgentResult {
  return makeResult(AgentRole.Spec, {
    output: '```json\n{"title":"Auth Module","description":"Implement authentication"}\n```',
    structuredData: { title: "Auth Module", description: "Implement authentication" },
    tokensUsed: 300,
    costUsd: 0.03,
    durationMs: 2000,
    ...overrides,
  });
}

function makeArchitectResult(overrides?: Partial<AgentResult>): AgentResult {
  return makeResult(AgentRole.Architect, {
    output: "Architecture output",
    structuredData: {
      slices: [
        {
          title: "Core Auth",
          tasks: [
            { title: "Implement login endpoint", description: "Build POST /login", files: ["src/auth.ts"] },
            { title: "Write auth tests", description: "Test login and logout flows", files: ["src/auth.test.ts"] },
            { title: "Review auth security", description: "Audit auth implementation", files: ["src/auth.ts"] },
          ],
        },
        {
          title: "Session Management",
          tasks: [
            { title: "Add session store", description: "Implement session persistence", files: ["src/session.ts"] },
            { title: "Finalize and deploy", description: "Final cleanup and publish", files: [] },
          ],
        },
      ],
    },
    tokensUsed: 500,
    costUsd: 0.05,
    durationMs: 3000,
    ...overrides,
  });
}

// ─── Tests ───────────────────────────────────────────────────

describe("TaskPlanner", () => {
  describe("createPlan() with full architect output", () => {
    it("produces a valid PlanSpec with milestone, slices, and estimates", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
        makeArchitectResult(),
      );

      expect(plan.milestone).toBeDefined();
      expect(plan.milestone.id).toBe("M001");
      expect(plan.milestone.title).toBe("Auth Module");
      expect(plan.milestone.description).toBe("Implement authentication");
      expect(plan.slices).toHaveLength(2);
      expect(plan.totalEstimate).toBeDefined();
    });

    it("assigns correct roles to tasks via keyword heuristics", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
        makeArchitectResult(),
      );

      // First slice: "Core Auth"
      const coreAuth = plan.slices[0];
      expect(coreAuth.tasks).toHaveLength(3);
      // "Implement login endpoint" → Implementer
      expect(coreAuth.tasks[0].assignedRole).toBe(AgentRole.Implementer);
      // "Write auth tests" → Tester (keyword: "test")
      expect(coreAuth.tasks[1].assignedRole).toBe(AgentRole.Tester);
      // "Review auth security" → Reviewer (keyword: "review")
      expect(coreAuth.tasks[2].assignedRole).toBe(AgentRole.Reviewer);

      // Second slice: "Session Management"
      const session = plan.slices[1];
      expect(session.tasks).toHaveLength(2);
      // "Add session store" → Implementer
      expect(session.tasks[0].assignedRole).toBe(AgentRole.Implementer);
      // "Finalize and deploy" → Finalizer (keyword: "final")
      expect(session.tasks[1].assignedRole).toBe(AgentRole.Finalizer);
    });

    it("creates slices with correct IDs and titles", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
        makeArchitectResult(),
      );

      expect(plan.slices[0].id).toBe("S01");
      expect(plan.slices[0].title).toBe("Core Auth");
      expect(plan.slices[0].status).toBe("pending");

      expect(plan.slices[1].id).toBe("S02");
      expect(plan.slices[1].title).toBe("Session Management");
      expect(plan.slices[1].status).toBe("pending");
    });

    it("assigns files from architect data to tasks", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
        makeArchitectResult(),
      );

      expect(plan.slices[0].tasks[0].files).toEqual(["src/auth.ts"]);
      expect(plan.slices[0].tasks[1].files).toEqual(["src/auth.test.ts"]);
    });

    it("sums totalEstimate from all phase results", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
        makeArchitectResult(),
      );

      // research: 200 + spec: 300 + architect: 500
      expect(plan.totalEstimate.tokens).toBe(1000);
      // research: 0.02 + spec: 0.03 + architect: 0.05
      expect(plan.totalEstimate.costUsd).toBeCloseTo(0.1, 5);
      // research: 1000 + spec: 2000 + architect: 3000
      expect(plan.totalEstimate.durationMs).toBe(6000);
    });
  });

  describe("createPlan() without architect result (budget profile)", () => {
    it("produces a simplified single-slice plan", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
      );

      expect(plan.slices).toHaveLength(1);
      expect(plan.slices[0].id).toBe("S01");
      expect(plan.slices[0].tasks).toHaveLength(1);
    });

    it("uses spec title for milestone", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
      );

      expect(plan.milestone.title).toBe("Auth Module");
    });

    it("sums estimates from research and spec only", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
      );

      // research: 200 + spec: 300
      expect(plan.totalEstimate.tokens).toBe(500);
      expect(plan.totalEstimate.costUsd).toBeCloseTo(0.05, 5);
      expect(plan.totalEstimate.durationMs).toBe(3000);
    });

    it("assigns Implementer role to the single task", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
      );

      expect(plan.slices[0].tasks[0].assignedRole).toBe(AgentRole.Implementer);
    });
  });

  describe("createPlan() with unstructured architect output", () => {
    it("creates a fallback single-slice plan from raw output", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult(),
        makeResult(AgentRole.Architect, {
          output: "Plain text architecture description without structured data",
          structuredData: undefined,
        }),
      );

      expect(plan.slices).toHaveLength(1);
      expect(plan.slices[0].id).toBe("S01");
      expect(plan.slices[0].title).toBe("Implementation");
      expect(plan.slices[0].tasks).toHaveLength(1);
    });
  });

  describe("createPlan() with fenced JSON in output (no structuredData)", () => {
    it("extracts plan data from fenced JSON in spec output", () => {
      const plan = TaskPlanner.createPlan(
        makeResearchResult(),
        makeSpecResult({
          structuredData: undefined,
          output: '```json\n{"title":"Parsed Title","description":"Parsed Desc"}\n```',
        }),
      );

      expect(plan.milestone.title).toBe("Parsed Title");
      expect(plan.milestone.description).toBe("Parsed Desc");
    });
  });
});
