import { AgentRole } from "../types/index.js";
import type { StupidConfig, ComplexityTier, TaskSpec } from "../types/index.js";
import type { IComplexityClassifier, IRoutingHistory } from "./interfaces.js";
import { TOKEN_PROFILES } from "../infrastructure/token-profiles.js";

// ─── Model ID Mapping ────────────────────────────────────────

/**
 * Maps short model names (used in config) to Pi SDK model IDs.
 */
export const MODEL_ID_MAP: Record<string, string> = {
  haiku: "claude-haiku-3-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-5",
};

/**
 * Reverse map: Pi SDK model ID → short name.
 */
const REVERSE_MODEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MODEL_ID_MAP).map(([short, full]) => [full, short]),
);

// ─── Model Tier Ordering ─────────────────────────────────────

/**
 * Ordered from lowest to highest capability.
 */
const MODEL_TIERS: readonly string[] = ["haiku", "sonnet", "opus"] as const;

/**
 * Returns the tier index for a short model name.
 * Higher index = more capable model.
 */
function tierIndex(shortName: string): number {
  const idx = MODEL_TIERS.indexOf(shortName);
  if (idx === -1) {
    throw new Error(`Unknown model tier: "${shortName}"`);
  }
  return idx;
}

// ─── Role → Config Key Mapping ───────────────────────────────

type ModelConfigKey = keyof StupidConfig["models"];

/**
 * Maps an AgentRole to the corresponding key in `config.models`.
 * Some roles share config keys:
 * - Spec shares with Research
 * - Finalizer shares with Implementation
 */
function roleToConfigKey(role: AgentRole): ModelConfigKey {
  switch (role) {
    case AgentRole.Research:
      return "research";
    case AgentRole.Spec:
      return "research"; // shares research model
    case AgentRole.Architect:
      return "architecture";
    case AgentRole.Tester:
      return "testing";
    case AgentRole.Implementer:
      return "implementation";
    case AgentRole.Reviewer:
      return "review";
    case AgentRole.Finalizer:
      return "implementation"; // shares implementation model
  }
}

// ─── TaskRouter ──────────────────────────────────────────────

export interface ModelSelection {
  provider: string;
  modelId: string;
}

export interface TaskRouterDeps {
  classifier?: IComplexityClassifier;
  history?: IRoutingHistory;
}

export interface SelectModelOptions {
  taskDescription?: string;
  taskSpec?: TaskSpec;
  complexityTier?: ComplexityTier;
}

/**
 * Routes agent roles to models, enforcing token profile ceilings
 * and providing an escalation chain for retry-on-failure.
 *
 * Observability:
 * - `selectModel()` logs when a model is downgraded due to ceiling
 * - `getEscalationModel()` returns null when ceiling prevents escalation
 */
export class TaskRouter {
  private readonly config: StupidConfig;
  private readonly ceiling: string;
  private readonly ceilingIdx: number;
  private readonly classifier?: IComplexityClassifier;
  private readonly history?: IRoutingHistory;

  constructor(config: StupidConfig, deps?: TaskRouterDeps) {
    this.config = config;
    this.ceiling = TOKEN_PROFILES[config.profile].modelCeiling;
    this.ceilingIdx = tierIndex(this.ceiling);
    this.classifier = deps?.classifier;
    this.history = deps?.history;
  }

  /**
   * Selects the model for a given agent role, applying the token
   * profile ceiling. If the configured model exceeds the ceiling,
   * it is downgraded to the ceiling model.
   *
   * When `options` is provided, applies complexity-based routing:
   * 1. Determines complexity tier (explicit, classified, or default "standard")
   * 2. Checks routing history for empirically best model
   * 3. Falls back to complexity-based adjustment (light→downgrade, heavy→upgrade)
   *
   * @param role - The agent role to select a model for
   * @param options - Optional complexity routing overrides
   * @returns Provider and Pi SDK model ID
   */
  selectModel(role: AgentRole, options?: SelectModelOptions): ModelSelection {
    const configKey = roleToConfigKey(role);
    const configuredModel = this.config.models[configKey];

    // No options: original behavior (backward compatible)
    if (!options) {
      const effectiveModel = this.applyModelCeiling(configuredModel);
      return {
        provider: "anthropic",
        modelId: MODEL_ID_MAP[effectiveModel] ?? effectiveModel,
      };
    }

    // Determine complexity tier
    const tier: ComplexityTier =
      options.complexityTier ??
      this.classifier?.classify(
        options.taskDescription ?? options.taskSpec?.description ?? "",
      ) ??
      "standard";

    // Check routing history for empirically best model
    const historyModel = this.history?.getBestModel(role, tier) ?? null;
    if (historyModel !== null) {
      const capped = this.applyModelCeiling(historyModel);
      return {
        provider: "anthropic",
        modelId: MODEL_ID_MAP[capped] ?? capped,
      };
    }

    // Apply complexity adjustment
    const adjusted = this.adjustModelForComplexity(configuredModel, tier);
    const effectiveModel = this.applyModelCeiling(adjusted);

    return {
      provider: "anthropic",
      modelId: MODEL_ID_MAP[effectiveModel] ?? effectiveModel,
    };
  }

  /**
   * Returns the next model in the escalation chain, respecting
   * the profile ceiling. Returns null if already at the top of
   * the chain or if the ceiling prevents further escalation.
   *
   * Escalation chain: haiku → sonnet → opus
   *
   * @param currentModel - Short model name (e.g. "haiku", "sonnet")
   * @returns Next model selection, or null if at ceiling/top
   */
  getEscalationModel(currentModel: string): ModelSelection | null {
    // Normalize: accept either short name or full Pi SDK ID
    const shortName = REVERSE_MODEL_MAP[currentModel] ?? currentModel;
    const currentIdx = tierIndex(shortName);

    // Already at top of chain?
    if (currentIdx >= MODEL_TIERS.length - 1) {
      return null;
    }

    const nextIdx = currentIdx + 1;

    // Ceiling prevents escalation?
    if (nextIdx > this.ceilingIdx) {
      return null;
    }

    const nextModel = MODEL_TIERS[nextIdx];
    return {
      provider: "anthropic",
      modelId: MODEL_ID_MAP[nextModel],
    };
  }

  /**
   * Adjusts a base model up or down based on complexity tier.
   * - Light tasks downgrade one tier (sonnet→haiku). Won't go below haiku.
   * - Heavy tasks upgrade one tier (sonnet→opus). Ceiling applied separately.
   * - Standard tasks keep the base model.
   */
  private adjustModelForComplexity(baseModel: string, tier: ComplexityTier): string {
    const baseIdx = tierIndex(baseModel);
    if (tier === "light" && baseIdx > 0) {
      return MODEL_TIERS[baseIdx - 1];
    }
    if (tier === "heavy" && baseIdx < MODEL_TIERS.length - 1) {
      return MODEL_TIERS[baseIdx + 1];
    }
    return baseModel;
  }

  /**
   * Applies the token profile ceiling to a model name.
   * If the model's tier exceeds the ceiling, returns the ceiling model.
   */
  private applyModelCeiling(model: string): string {
    const modelIdx = tierIndex(model);
    if (modelIdx > this.ceilingIdx) {
      return this.ceiling;
    }
    return model;
  }
}
