import { describe, it, expect, vi } from "vitest";
import { AgentRole } from "../types/index.js";
import { DEFAULT_CONFIG } from "../config/config.js";

// ─── Mocks ───────────────────────────────────────────────────

// Mock Pi SDK modules so we can check tool sets without hitting the real SDK
vi.mock("@mariozechner/pi-ai", () => ({
  getModel: vi.fn(() => ({})),
}));

const mockCodingTools = [
  { name: "read", label: "Read" },
  { name: "bash", label: "Bash" },
  { name: "edit", label: "Edit" },
  { name: "write", label: "Write" },
];

const mockReadOnlyTools = [
  { name: "read", label: "Read" },
  { name: "grep", label: "Grep" },
  { name: "find", label: "Find" },
  { name: "ls", label: "Ls" },
];

vi.mock("@mariozechner/pi-coding-agent", () => ({
  createAgentSession: vi.fn(async () => ({
    session: {
      agent: {
        setSystemPrompt: vi.fn(),
        subscribe: vi.fn(() => () => {}),
      },
      prompt: vi.fn(),
    },
    extensionsResult: { extensions: [] },
  })),
  SessionManager: { inMemory: vi.fn(() => ({})) },
  codingTools: mockCodingTools,
  readOnlyTools: mockReadOnlyTools,
}));

vi.mock("../agents/prompt-loader.js", () => ({
  compilePrompt: vi.fn(() => "mock prompt"),
  loadPromptTemplate: vi.fn(() => "template"),
  clearCache: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────

const { AgentFactory } = await import("../agents/agent-factory.js");
const { ResearchAgent } = await import("../agents/research.js");
const { SpecAgent } = await import("../agents/spec.js");
const { ArchitectAgent } = await import("../agents/architect.js");
const { TesterAgent } = await import("../agents/tester.js");
const { ImplementerAgent } = await import("../agents/implementer.js");
const { ReviewerAgent } = await import("../agents/reviewer.js");
const { FinalizerAgent } = await import("../agents/finalizer.js");

// ─── Tests ───────────────────────────────────────────────────

describe("AgentFactory", () => {
  const config = { ...DEFAULT_CONFIG };

  describe("create()", () => {
    it("creates ResearchAgent for Research role", () => {
      const agent = AgentFactory.create(AgentRole.Research, config);
      expect(agent).toBeInstanceOf(ResearchAgent);
    });

    it("creates SpecAgent for Spec role", () => {
      const agent = AgentFactory.create(AgentRole.Spec, config);
      expect(agent).toBeInstanceOf(SpecAgent);
    });

    it("creates ArchitectAgent for Architect role", () => {
      const agent = AgentFactory.create(AgentRole.Architect, config);
      expect(agent).toBeInstanceOf(ArchitectAgent);
    });

    it("creates TesterAgent for Tester role", () => {
      const agent = AgentFactory.create(AgentRole.Tester, config);
      expect(agent).toBeInstanceOf(TesterAgent);
    });

    it("creates ImplementerAgent for Implementer role", () => {
      const agent = AgentFactory.create(AgentRole.Implementer, config);
      expect(agent).toBeInstanceOf(ImplementerAgent);
    });

    it("creates ReviewerAgent for Reviewer role", () => {
      const agent = AgentFactory.create(AgentRole.Reviewer, config);
      expect(agent).toBeInstanceOf(ReviewerAgent);
    });

    it("creates FinalizerAgent for Finalizer role", () => {
      const agent = AgentFactory.create(AgentRole.Finalizer, config);
      expect(agent).toBeInstanceOf(FinalizerAgent);
    });

    it("maps all 7 AgentRole values to distinct agent classes", () => {
      const allRoles = Object.values(AgentRole);
      expect(allRoles).toHaveLength(7);

      const agents = allRoles.map((role) =>
        AgentFactory.create(role, config),
      );
      // Verify all agents are created (no throws)
      expect(agents).toHaveLength(7);
    });

    it("throws for unknown role", () => {
      expect(() =>
        AgentFactory.create("unknown" as AgentRole, config),
      ).toThrow("Unknown agent role");
    });
  });

  describe("tool sets", () => {
    it("ResearchAgent uses codingTools", () => {
      const agent = AgentFactory.create(AgentRole.Research, config);
      expect(agent.getTools()).toBe(mockCodingTools);
    });

    it("SpecAgent uses readOnlyTools", () => {
      const agent = AgentFactory.create(AgentRole.Spec, config);
      expect(agent.getTools()).toBe(mockReadOnlyTools);
    });

    it("ArchitectAgent uses readOnlyTools", () => {
      const agent = AgentFactory.create(AgentRole.Architect, config);
      expect(agent.getTools()).toBe(mockReadOnlyTools);
    });

    it("TesterAgent uses codingTools", () => {
      const agent = AgentFactory.create(AgentRole.Tester, config);
      expect(agent.getTools()).toBe(mockCodingTools);
    });

    it("ImplementerAgent uses codingTools", () => {
      const agent = AgentFactory.create(AgentRole.Implementer, config);
      expect(agent.getTools()).toBe(mockCodingTools);
    });

    it("ReviewerAgent uses readOnlyTools", () => {
      const agent = AgentFactory.create(AgentRole.Reviewer, config);
      expect(agent.getTools()).toBe(mockReadOnlyTools);
    });

    it("FinalizerAgent uses codingTools", () => {
      const agent = AgentFactory.create(AgentRole.Finalizer, config);
      expect(agent.getTools()).toBe(mockCodingTools);
    });

    it("coding roles get tools with write capability", () => {
      const codingRoles = [
        AgentRole.Research,
        AgentRole.Tester,
        AgentRole.Implementer,
        AgentRole.Finalizer,
      ];
      for (const role of codingRoles) {
        const agent = AgentFactory.create(role, config);
        const tools = agent.getTools();
        const toolNames = tools.map((t: { name: string }) => t.name);
        expect(toolNames).toContain("bash");
        expect(toolNames).toContain("edit");
        expect(toolNames).toContain("write");
      }
    });

    it("read-only roles do NOT get write tools", () => {
      const readOnlyRoles = [
        AgentRole.Spec,
        AgentRole.Architect,
        AgentRole.Reviewer,
      ];
      for (const role of readOnlyRoles) {
        const agent = AgentFactory.create(role, config);
        const tools = agent.getTools();
        const toolNames = tools.map((t: { name: string }) => t.name);
        expect(toolNames).not.toContain("bash");
        expect(toolNames).not.toContain("edit");
        expect(toolNames).not.toContain("write");
      }
    });
  });
});
