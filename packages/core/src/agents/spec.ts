import { readOnlyTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Spec agent — produces specifications from research output.
 * Uses `readOnlyTools` (no file writes needed).
 */
export class SpecAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return readOnlyTools;
  }
}
