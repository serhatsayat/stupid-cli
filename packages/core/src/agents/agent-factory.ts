import { AgentRole } from "../types/index.js";
import type { StupidConfig } from "../types/index.js";
import { BaseAgent } from "./base-agent.js";
import { ResearchAgent } from "./research.js";
import { SpecAgent } from "./spec.js";
import { ArchitectAgent } from "./architect.js";
import { TesterAgent } from "./tester.js";
import { ImplementerAgent } from "./implementer.js";
import { ReviewerAgent } from "./reviewer.js";
import { FinalizerAgent } from "./finalizer.js";

/**
 * Factory for creating agent instances from an AgentRole.
 *
 * Maps all 7 AgentRole values to their concrete BaseAgent subclass.
 * Each agent is configured with the project's StupidConfig.
 */
export class AgentFactory {
  /**
   * Create an agent instance for the given role.
   *
   * @param role - The agent role to create
   * @param config - Project configuration
   * @returns A concrete BaseAgent subclass instance
   * @throws Error if the role is unrecognized (defensive — should not happen with enum)
   */
  static create(role: AgentRole, config: StupidConfig): BaseAgent {
    switch (role) {
      case AgentRole.Research:
        return new ResearchAgent(config);
      case AgentRole.Spec:
        return new SpecAgent(config);
      case AgentRole.Architect:
        return new ArchitectAgent(config);
      case AgentRole.Tester:
        return new TesterAgent(config);
      case AgentRole.Implementer:
        return new ImplementerAgent(config);
      case AgentRole.Reviewer:
        return new ReviewerAgent(config);
      case AgentRole.Finalizer:
        return new FinalizerAgent(config);
      default:
        throw new Error(`Unknown agent role: "${role as string}"`);
    }
  }
}
