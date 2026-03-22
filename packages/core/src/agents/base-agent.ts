import {
  createAgentSession,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { getModel } from "@mariozechner/pi-ai";
import type {
  AssistantMessage,
  TextContent,
  Usage,
} from "@mariozechner/pi-ai";
import type {
  AgentEvent,
  AgentMessage,
  AgentTool,
} from "@mariozechner/pi-agent-core";
import type {
  AgentResult,
  StupidConfig,
  SubAgentSpawnOptions,
} from "../types/index.js";
import { compilePrompt } from "./prompt-loader.js";

// ─── BaseAgent ───────────────────────────────────────────────

/**
 * Abstract base class that wraps the Pi SDK session lifecycle.
 *
 * Each `execute()` call creates an isolated session via
 * `SessionManager.inMemory()` (R002), runs a prompt through
 * the agent, and collects structured results.
 *
 * Subclasses must override `getTools()` to define which Pi SDK
 * tools the agent has access to (codingTools vs readOnlyTools).
 */
export abstract class BaseAgent {
  constructor(protected config: StupidConfig) {}

  /**
   * Execute the agent with the given spawn options.
   *
   * 1. Resolves model via `getModel(provider, modelId)`
   * 2. Creates an isolated session with `SessionManager.inMemory()`
   * 3. Loads and compiles the role-specific prompt template
   * 4. Sets the system prompt and subscribes to agent events
   * 5. Sends the task prompt and collects results
   * 6. Returns an `AgentResult` with output, tokens, cost, and duration
   *
   * On failure, returns `AgentResult` with `success: false` and `error`.
   */
  async execute(options: SubAgentSpawnOptions): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 1. Resolve model
      const model = this.resolveModel(options.model);

      // 2. Create isolated session (R002: fresh context per agent)
      const { session } = await createAgentSession({
        model,
        tools: this.getTools(),
        sessionManager: SessionManager.inMemory(),
        cwd: this.config.projectRoot,
      });

      // 3. Compile prompt from template
      const compiledPrompt = compilePrompt(options.agentRole, {
        task: options.taskSpec.description,
        memory: options.memoryRecords
          .map((r) => `[${r.category}] ${r.content}`)
          .join("\n"),
        files: options.contextFiles.join("\n"),
      });

      // 4. Set system prompt
      session.agent.setSystemPrompt(compiledPrompt);

      // 5. Subscribe to events to capture messages
      let endMessages: AgentMessage[] = [];
      const unsub = session.agent.subscribe((event: AgentEvent) => {
        if (event.type === "agent_end") {
          endMessages = event.messages;
        }
      });

      // 6. Send the task prompt
      const taskInput = `Task: ${options.taskSpec.title}\n\n${options.taskSpec.description}`;
      await session.prompt(taskInput);

      // Unsubscribe after prompt completes
      unsub();

      // 7. Extract results from captured messages
      const output = this.extractTextContent(endMessages);
      const structuredData = this.parseStructuredData(output);
      const usage = this.sumUsage(endMessages);
      const durationMs = Date.now() - startTime;

      // Derive model name and stopReason from the last assistant message
      const lastAssistant = this.findLastAssistantMessage(endMessages);

      return {
        role: options.agentRole,
        model: lastAssistant?.model ?? options.model,
        success: true,
        output,
        structuredData,
        tokensUsed: usage.tokensUsed,
        costUsd: usage.costUsd,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        role: options.agentRole,
        model: options.model,
        success: false,
        output: "",
        tokensUsed: 0,
        costUsd: 0,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Returns the tool set for this agent role.
   * Subclasses must override to return `codingTools` or `readOnlyTools`.
   */
  abstract getTools(): AgentTool[];

  /**
   * Parses structured JSON data from fenced code blocks in the output.
   * Returns `undefined` if no JSON block is found or parsing fails.
   *
   * Default implementation matches the first ` ```json ... ``` ` block.
   * Subclasses may override for role-specific extraction.
   */
  protected parseStructuredData(content: string): unknown | undefined {
    const match = content.match(/```json\n([\s\S]*?)\n```/);
    if (!match?.[1]) return undefined;

    try {
      return JSON.parse(match[1]);
    } catch {
      return undefined;
    }
  }

  /**
   * Extracts and concatenates all text content from AssistantMessages
   * in the captured event messages.
   */
  protected extractTextContent(messages: AgentMessage[]): string {
    const textParts: string[] = [];

    for (const msg of messages) {
      if (!this.isAssistantMessage(msg)) continue;

      for (const block of msg.content) {
        if (block.type === "text") {
          textParts.push((block as TextContent).text);
        }
      }
    }

    return textParts.join("\n");
  }

  /**
   * Sums token usage and cost across all AssistantMessages.
   */
  protected sumUsage(
    messages: AgentMessage[],
  ): { tokensUsed: number; costUsd: number } {
    let tokensUsed = 0;
    let costUsd = 0;

    for (const msg of messages) {
      if (!this.isAssistantMessage(msg)) continue;

      const usage: Usage = msg.usage;
      tokensUsed += usage.totalTokens;
      costUsd += usage.cost.total;
    }

    return { tokensUsed, costUsd };
  }

  /**
   * Resolves a model string (e.g. "anthropic:claude-sonnet-4-6")
   * into a Pi SDK Model object.
   *
   * Accepts either "provider:modelId" or just "modelId" (defaults to "anthropic").
   */
  protected resolveModel(modelStr: string) {
    const parts = modelStr.split(":");
    const provider = parts.length > 1 ? parts[0] : "anthropic";
    const modelId = parts.length > 1 ? parts[1] : parts[0];

    try {
      return getModel(provider as any, modelId as any);
    } catch (err) {
      throw new Error(
        `Failed to resolve model "${modelStr}" (provider="${provider}", modelId="${modelId}"): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Type guard: checks if a message is an AssistantMessage.
   */
  private isAssistantMessage(msg: AgentMessage): msg is AssistantMessage {
    return (
      typeof msg === "object" &&
      msg !== null &&
      "role" in msg &&
      msg.role === "assistant"
    );
  }

  /**
   * Finds the last AssistantMessage in a list of messages.
   */
  private findLastAssistantMessage(
    messages: AgentMessage[],
  ): AssistantMessage | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (this.isAssistantMessage(messages[i])) {
        return messages[i] as AssistantMessage;
      }
    }
    return undefined;
  }
}
