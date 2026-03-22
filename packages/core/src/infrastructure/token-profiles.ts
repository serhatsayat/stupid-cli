import type { TokenProfile } from "../types/index.js";

export interface ProfileConfig {
  /** Maximum model tier: "haiku" | "sonnet" | "opus" */
  modelCeiling: string;
  /** Inline context level: "minimal" | "standard" | "full" */
  inlineLevel: string;
  /** Compression aggressiveness: "none" | "moderate" | "aggressive" */
  compressionLevel: string;
  /** Agent phases to skip for cost savings (e.g., ["architect"]) */
  skipPhases: string[];
  /** Maximum concurrent sub-agents */
  maxConcurrentAgents: number;
}

export const TOKEN_PROFILES: Record<TokenProfile, ProfileConfig> = {
  budget: {
    modelCeiling: "haiku",
    inlineLevel: "minimal",
    compressionLevel: "aggressive",
    skipPhases: ["architect"],
    maxConcurrentAgents: 1,
  },
  balanced: {
    modelCeiling: "sonnet",
    inlineLevel: "standard",
    compressionLevel: "moderate",
    skipPhases: [],
    maxConcurrentAgents: 3,
  },
  quality: {
    modelCeiling: "opus",
    inlineLevel: "full",
    compressionLevel: "none",
    skipPhases: [],
    maxConcurrentAgents: 5,
  },
};
