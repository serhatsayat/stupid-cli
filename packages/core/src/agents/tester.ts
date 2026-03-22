import { codingTools } from "@mariozechner/pi-coding-agent";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { BaseAgent } from "./base-agent.js";

/**
 * Tester agent — writes and runs tests.
 * Uses `codingTools` for file write access (test files).
 */
export class TesterAgent extends BaseAgent {
  getTools(): AgentTool[] {
    return codingTools;
  }
}
