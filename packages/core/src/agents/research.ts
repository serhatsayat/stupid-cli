import { codingTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Research agent — reads the codebase and produces analysis.
 * Uses `codingTools` for full read access to project files.
 */
export class ResearchAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return codingTools;
  }
}
