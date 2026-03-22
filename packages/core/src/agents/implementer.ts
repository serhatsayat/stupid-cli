import { codingTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Implementer agent — writes source code.
 * Uses `codingTools` for full file read/write access.
 */
export class ImplementerAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return codingTools;
  }
}
