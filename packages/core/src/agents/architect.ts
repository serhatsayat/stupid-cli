import { readOnlyTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Architect agent — designs technical architecture from specs.
 * Uses `readOnlyTools` (no file writes needed).
 */
export class ArchitectAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return readOnlyTools;
  }
}
