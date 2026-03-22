import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentEvent, AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, Usage } from "@mariozechner/pi-ai";
import { AgentRole } from "../types/index.js";
import type { SubAgentSpawnOptions } from "../types/index.js";
import { DEFAULT_CONFIG } from "../config/config.js";

// ─── Helpers ─────────────────────────────────────────────────

/** Build a minimal SubAgentSpawnOptions for testing */
function makeSpawnOptions(
  overrides?: Partial<SubAgentSpawnOptions>,
): SubAgentSpawnOptions {
  return {
    agentRole: AgentRole.Research,
    model: "claude-sonnet-4-6",
    taskSpec: {
      id: "T01",
      title: "Test Task",
      description: "A test task description",
      assignedRole: AgentRole.Research,
      dependencies: [],
      files: ["src/index.ts"],
    },
    contextFiles: ["src/index.ts"],
    memoryRecords: [],
    maxTokens: 4096,
    budgetUsd: 1.0,
    ...overrides,
  };
}

/** Build a fake AssistantMessage with text content and usage */
function makeAssistantMessage(
  text: string,
  usageOverrides?: Partial<Usage>,
): AssistantMessage {
  const usage: Usage = {
    input: 100,
    output: 50,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 150,
    cost: {
      input: 0.001,
      output: 0.0005,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0.0015,
    },
    ...usageOverrides,
  };
  return {
    role: "assistant" as const,
    content: [{ type: "text" as const, text }],
    api: "anthropic-messages",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    usage,
    stopReason: "stop",
    timestamp: Date.now(),
  };
}

// ─── Mock Storage ────────────────────────────────────────────

// Shared state so mock factories and tests can coordinate
let capturedSubscriber: ((event: AgentEvent) => void) | null = null;

const mockSetSystemPrompt = vi.fn();
const mockPromptFn = vi.fn(async () => {
  // Default: emit agent_end with a basic message
  if (capturedSubscriber) {
    capturedSubscriber({
      type: "agent_end",
      messages: [
        makeAssistantMessage("Default test output"),
      ] as AgentMessage[],
    });
  }
});
const mockSessionManagerInMemory = vi.fn(() => ({ _type: "in-memory" }));
const mockSubscribe = vi.fn((listener: (event: AgentEvent) => void) => {
  capturedSubscriber = listener;
  return () => {
    capturedSubscriber = null;
  };
});

const MOCK_CODING_TOOLS = [
  { name: "read", label: "Read" },
  { name: "bash", label: "Bash" },
  { name: "edit", label: "Edit" },
  { name: "write", label: "Write" },
];

// ─── Module Mocks ────────────────────────────────────────────

vi.mock("@mariozechner/pi-ai", () => ({
  getModel: vi.fn(() => ({
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    api: "anthropic-messages",
    provider: "anthropic",
    reasoning: true,
    input: ["text", "image"],
    cost: { input: 0.003, output: 0.015, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 8192,
    baseUrl: "https://api.anthropic.com",
  })),
}));

vi.mock("@mariozechner/pi-coding-agent", () => ({
  createAgentSession: vi.fn(async () => ({
    session: {
      agent: {
        setSystemPrompt: mockSetSystemPrompt,
        subscribe: mockSubscribe,
      },
      prompt: mockPromptFn,
      getSessionStats: vi.fn(() => ({
        tokens: { total: 150 },
        cost: 0.0015,
      })),
    },
    extensionsResult: { extensions: [] },
  })),
  SessionManager: {
    inMemory: mockSessionManagerInMemory,
  },
  codingTools: MOCK_CODING_TOOLS,
  readOnlyTools: [
    { name: "read", label: "Read" },
    { name: "grep", label: "Grep" },
    { name: "find", label: "Find" },
    { name: "ls", label: "Ls" },
  ],
}));

vi.mock("../agents/prompt-loader.js", () => ({
  compilePrompt: vi.fn(
    (role: string, vars: { task: string }) =>
      `System prompt for ${role}: ${vars.task}`,
  ),
  loadPromptTemplate: vi.fn(() => "template {{TASK}} {{MEMORY}} {{FILES}}"),
  clearCache: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────

const { BaseAgent } = await import("../agents/base-agent.js");
const { createAgentSession } = await import("@mariozechner/pi-coding-agent");
const { getModel } = await import("@mariozechner/pi-ai");
const { compilePrompt } = await import("../agents/prompt-loader.js");

// Concrete test subclass — returns the mocked codingTools directly
class TestAgent extends BaseAgent {
  getTools() {
    return MOCK_CODING_TOOLS as any;
  }
}

// ─── Tests ───────────────────────────────────────────────────

describe("BaseAgent", () => {
  const config = { ...DEFAULT_CONFIG, projectRoot: "/test/project" };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedSubscriber = null;
    // Re-assign the default implementation after clearAllMocks
    mockPromptFn.mockImplementation(async () => {
      if (capturedSubscriber) {
        capturedSubscriber({
          type: "agent_end",
          messages: [
            makeAssistantMessage("Default test output"),
          ] as AgentMessage[],
        });
      }
    });
  });

  describe("execute()", () => {
    it("creates session with SessionManager.inMemory() for fresh context (R002)", async () => {
      const agent = new TestAgent(config);
      await agent.execute(makeSpawnOptions());

      expect(createAgentSession).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(createAgentSession).mock.calls[0][0];
      expect(callArgs).toBeDefined();
      expect(mockSessionManagerInMemory).toHaveBeenCalled();
      expect(callArgs!.sessionManager).toEqual({ _type: "in-memory" });
      expect(callArgs!.cwd).toBe("/test/project");
    });

    it("passes tools from getTools() to createAgentSession", async () => {
      const agent = new TestAgent(config);
      await agent.execute(makeSpawnOptions());

      const callArgs = vi.mocked(createAgentSession).mock.calls[0][0];
      expect(callArgs!.tools).toBe(MOCK_CODING_TOOLS);
    });

    it("resolves model via getModel()", async () => {
      const agent = new TestAgent(config);
      await agent.execute(makeSpawnOptions());

      expect(getModel).toHaveBeenCalledWith("anthropic", "claude-sonnet-4-6");
    });

    it("resolves provider:modelId format", async () => {
      const agent = new TestAgent(config);
      await agent.execute(
        makeSpawnOptions({ model: "anthropic:claude-opus-4-5" }),
      );

      expect(getModel).toHaveBeenCalledWith("anthropic", "claude-opus-4-5");
    });

    it("sets system prompt with compiled prompt", async () => {
      const agent = new TestAgent(config);
      await agent.execute(makeSpawnOptions());

      expect(compilePrompt).toHaveBeenCalledWith(
        AgentRole.Research,
        expect.objectContaining({ task: "A test task description" }),
      );
      expect(mockSetSystemPrompt).toHaveBeenCalledWith(
        expect.stringContaining("System prompt for research"),
      );
    });

    it("calls session.prompt() with task input", async () => {
      const agent = new TestAgent(config);
      await agent.execute(makeSpawnOptions());

      expect(mockPromptFn).toHaveBeenCalledWith(
        expect.stringContaining("Test Task"),
      );
      expect(mockPromptFn).toHaveBeenCalledWith(
        expect.stringContaining("A test task description"),
      );
    });

    it("extracts text content from agent_end event messages", async () => {
      const agent = new TestAgent(config);

      mockPromptFn.mockImplementationOnce(async () => {
        if (capturedSubscriber) {
          capturedSubscriber({
            type: "agent_end",
            messages: [
              makeAssistantMessage("Analysis complete: found 3 issues"),
            ] as AgentMessage[],
          });
        }
      });

      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(true);
      expect(result.output).toBe("Analysis complete: found 3 issues");
    });

    it("extracts structured JSON from fenced code blocks", async () => {
      const agent = new TestAgent(config);
      const jsonContent = '{"key":"value","count":42}';

      mockPromptFn.mockImplementationOnce(async () => {
        if (capturedSubscriber) {
          capturedSubscriber({
            type: "agent_end",
            messages: [
              makeAssistantMessage(
                `Here is the result:\n\`\`\`json\n${jsonContent}\n\`\`\`\nDone.`,
              ),
            ] as AgentMessage[],
          });
        }
      });

      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(true);
      expect(result.structuredData).toEqual({ key: "value", count: 42 });
    });

    it("returns undefined structuredData when no JSON block found", async () => {
      const agent = new TestAgent(config);

      mockPromptFn.mockImplementationOnce(async () => {
        if (capturedSubscriber) {
          capturedSubscriber({
            type: "agent_end",
            messages: [
              makeAssistantMessage("Just plain text, no JSON here"),
            ] as AgentMessage[],
          });
        }
      });

      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(true);
      expect(result.structuredData).toBeUndefined();
    });

    it("tracks token usage from AssistantMessage.usage", async () => {
      const agent = new TestAgent(config);

      mockPromptFn.mockImplementationOnce(async () => {
        if (capturedSubscriber) {
          capturedSubscriber({
            type: "agent_end",
            messages: [
              makeAssistantMessage("Result", {
                totalTokens: 500,
                cost: {
                  input: 0.01,
                  output: 0.02,
                  cacheRead: 0,
                  cacheWrite: 0,
                  total: 0.03,
                },
              }),
            ] as AgentMessage[],
          });
        }
      });

      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBe(500);
      expect(result.costUsd).toBe(0.03);
    });

    it("sums usage across multiple assistant messages", async () => {
      const agent = new TestAgent(config);

      mockPromptFn.mockImplementationOnce(async () => {
        if (capturedSubscriber) {
          capturedSubscriber({
            type: "agent_end",
            messages: [
              makeAssistantMessage("Part 1", {
                totalTokens: 200,
                cost: {
                  input: 0.01,
                  output: 0.005,
                  cacheRead: 0,
                  cacheWrite: 0,
                  total: 0.015,
                },
              }),
              {
                role: "user" as const,
                content: "continue",
                timestamp: Date.now(),
              },
              makeAssistantMessage("Part 2", {
                totalTokens: 300,
                cost: {
                  input: 0.02,
                  output: 0.01,
                  cacheRead: 0,
                  cacheWrite: 0,
                  total: 0.03,
                },
              }),
            ] as AgentMessage[],
          });
        }
      });

      const result = await agent.execute(makeSpawnOptions());

      expect(result.tokensUsed).toBe(500);
      expect(result.costUsd).toBeCloseTo(0.045, 5);
    });

    it("records durationMs", async () => {
      const agent = new TestAgent(config);
      const result = await agent.execute(makeSpawnOptions());

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe("number");
    });

    it("returns role and model in AgentResult", async () => {
      const agent = new TestAgent(config);
      const result = await agent.execute(makeSpawnOptions());

      expect(result.role).toBe(AgentRole.Research);
      expect(result.model).toBe("claude-sonnet-4-6");
    });

    it("returns AgentResult with success=false on createAgentSession error", async () => {
      vi.mocked(createAgentSession).mockRejectedValueOnce(
        new Error("Session creation failed"),
      );

      const agent = new TestAgent(config);
      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session creation failed");
      expect(result.output).toBe("");
      expect(result.tokensUsed).toBe(0);
      expect(result.costUsd).toBe(0);
    });

    it("returns AgentResult with success=false on getModel error", async () => {
      vi.mocked(getModel).mockImplementationOnce(() => {
        throw new Error("Unknown model");
      });

      const agent = new TestAgent(config);
      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to resolve model");
      expect(result.error).toContain("Unknown model");
    });

    it("returns AgentResult with success=false on prompt error", async () => {
      mockPromptFn.mockRejectedValueOnce(
        new Error("Prompt execution failed"),
      );

      const agent = new TestAgent(config);
      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(false);
      expect(result.error).toContain("Prompt execution failed");
    });

    it("formats memory records into memory string", async () => {
      const agent = new TestAgent(config);
      await agent.execute(
        makeSpawnOptions({
          memoryRecords: [
            {
              id: "m1",
              category: "decision",
              content: "Use ESM modules",
              source: "architect",
              timestamp: "2026-01-01",
              relevance: 0.9,
              tags: [],
            },
          ],
        }),
      );

      expect(compilePrompt).toHaveBeenCalledWith(
        AgentRole.Research,
        expect.objectContaining({
          memory: "[decision] Use ESM modules",
        }),
      );
    });

    it("passes context files as files string", async () => {
      const agent = new TestAgent(config);
      await agent.execute(
        makeSpawnOptions({
          contextFiles: ["src/a.ts", "src/b.ts"],
        }),
      );

      expect(compilePrompt).toHaveBeenCalledWith(
        AgentRole.Research,
        expect.objectContaining({
          files: "src/a.ts\nsrc/b.ts",
        }),
      );
    });
  });

  describe("parseStructuredData()", () => {
    it("handles malformed JSON gracefully", async () => {
      const agent = new TestAgent(config);

      mockPromptFn.mockImplementationOnce(async () => {
        if (capturedSubscriber) {
          capturedSubscriber({
            type: "agent_end",
            messages: [
              makeAssistantMessage("```json\n{invalid json}\n```"),
            ] as AgentMessage[],
          });
        }
      });

      const result = await agent.execute(makeSpawnOptions());

      expect(result.success).toBe(true);
      expect(result.structuredData).toBeUndefined();
    });
  });
});
