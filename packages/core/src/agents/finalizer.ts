import { codingTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Finalizer agent — creates commits and performs post-task cleanup.
 * Uses `codingTools` for full file access (commit operations).
 */
export class FinalizerAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return codingTools;
  }
}
