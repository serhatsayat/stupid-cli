import { readOnlyTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Reviewer agent — reviews code for quality and correctness.
 * Uses `readOnlyTools` (no file writes needed).
 */
export class ReviewerAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return readOnlyTools;
  }
}
