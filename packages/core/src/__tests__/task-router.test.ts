import { describe, it, expect } from "vitest";
import { AgentRole } from "../types/index.js";
import { DEFAULT_CONFIG } from "../config/config.js";
import {
  TaskRouter,
  MODEL_ID_MAP,
} from "../orchestrator/task-router.js";
import type { StupidConfig } from "../types/index.js";

// Helper: create config with specific profile
function configWithProfile(profile: "budget" | "balanced" | "quality"): StupidConfig {
  return { ...DEFAULT_CONFIG, profile };
}

describe("TaskRouter", () => {
  describe("MODEL_ID_MAP", () => {
    it("maps haiku to claude-haiku-3-5", () => {
      expect(MODEL_ID_MAP.haiku).toBe("claude-haiku-3-5");
    });

    it("maps sonnet to claude-sonnet-4-6", () => {
      expect(MODEL_ID_MAP.sonnet).toBe("claude-sonnet-4-6");
    });

    it("maps opus to claude-opus-4-5", () => {
      expect(MODEL_ID_MAP.opus).toBe("claude-opus-4-5");
    });
  });

  describe("selectModel — balanced profile (DEFAULT_CONFIG)", () => {
    const router = new TaskRouter(DEFAULT_CONFIG);

    it("selects haiku for Research role", () => {
      const result = router.selectModel(AgentRole.Research);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });

    it("selects haiku for Spec role (shares research model)", () => {
      const result = router.selectModel(AgentRole.Spec);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });

    it("selects sonnet for Architect role (opus capped to sonnet by balanced ceiling)", () => {
      const result = router.selectModel(AgentRole.Architect);
      // DEFAULT_CONFIG.models.architecture = "opus", but balanced ceiling = "sonnet"
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });

    it("selects haiku for Tester role", () => {
      const result = router.selectModel(AgentRole.Tester);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });

    it("selects sonnet for Implementer role", () => {
      const result = router.selectModel(AgentRole.Implementer);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });

    it("selects sonnet for Reviewer role", () => {
      const result = router.selectModel(AgentRole.Reviewer);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });

    it("selects sonnet for Finalizer role (shares implementation model)", () => {
      const result = router.selectModel(AgentRole.Finalizer);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });
  });

  describe("selectModel — budget profile (ceiling: haiku)", () => {
    const router = new TaskRouter(configWithProfile("budget"));

    it("caps architect (opus) down to haiku", () => {
      const result = router.selectModel(AgentRole.Architect);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });

    it("caps implementer (sonnet) down to haiku", () => {
      const result = router.selectModel(AgentRole.Implementer);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });

    it("keeps research at haiku (already within ceiling)", () => {
      const result = router.selectModel(AgentRole.Research);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });
  });

  describe("selectModel — quality profile (ceiling: opus)", () => {
    const router = new TaskRouter(configWithProfile("quality"));

    it("allows opus for Architect role", () => {
      const result = router.selectModel(AgentRole.Architect);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-opus-4-5",
      });
    });

    it("allows sonnet for Implementer role (not elevated, just uncapped)", () => {
      const result = router.selectModel(AgentRole.Implementer);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });

    it("allows haiku for Research role (not elevated, just uncapped)", () => {
      const result = router.selectModel(AgentRole.Research);
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-haiku-3-5",
      });
    });
  });

  describe("getEscalationModel — balanced profile (ceiling: sonnet)", () => {
    const router = new TaskRouter(DEFAULT_CONFIG);

    it("escalates haiku → sonnet", () => {
      const result = router.getEscalationModel("haiku");
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });

    it("returns null for sonnet (at ceiling)", () => {
      const result = router.getEscalationModel("sonnet");
      expect(result).toBeNull();
    });

    it("returns null for opus (above ceiling, top of chain)", () => {
      const result = router.getEscalationModel("opus");
      expect(result).toBeNull();
    });
  });

  describe("getEscalationModel — quality profile (ceiling: opus)", () => {
    const router = new TaskRouter(configWithProfile("quality"));

    it("escalates haiku → sonnet", () => {
      const result = router.getEscalationModel("haiku");
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-sonnet-4-6",
      });
    });

    it("escalates sonnet → opus", () => {
      const result = router.getEscalationModel("sonnet");
      expect(result).toEqual({
        provider: "anthropic",
        modelId: "claude-opus-4-5",
      });
    });

    it("returns null for opus (top of chain)", () => {
      const result = router.getEscalationModel("opus");
      expect(result).toBeNull();
    });
  });

  describe("getEscalationModel — budget profile (ceiling: haiku)", () => {
    const router = new TaskRouter(configWithProfile("budget"));

    it("returns null for haiku (at ceiling, cannot escalate)", () => {
      const result = router.getEscalationModel("haiku");
      expect(result).toBeNull();
    });
  });
});

// ─── Complexity-Aware Routing Tests ──────────────────────────

import type {
  IComplexityClassifier,
  IRoutingHistory,
} from "../orchestrator/interfaces.js";
import type { ComplexityTier } from "../types/index.js";
import type { SelectModelOptions } from "../orchestrator/task-router.js";

function makeMockClassifier(tier: ComplexityTier): IComplexityClassifier {
  return { classify: () => tier };
}

function makeMockHistory(
  bestModel: string | null,
): IRoutingHistory {
  return {
    getBestModel: () => bestModel,
    record: () => {},
    getStats: () => ({ total: 0, byPhase: {} }),
    close: () => {},
  };
}

describe("selectModel — complexity-aware routing", () => {
  // ── Tier-based adjustments (no deps, explicit tier) ────────

  it("downgrades light task from sonnet to haiku (balanced)", () => {
    const router = new TaskRouter(DEFAULT_CONFIG);
    const result = router.selectModel(AgentRole.Implementer, {
      complexityTier: "light",
    });
    // implementation=sonnet, light→downgrade→haiku
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-haiku-3-5",
    });
  });

  it("upgrades heavy task from haiku to sonnet (quality)", () => {
    const router = new TaskRouter(configWithProfile("quality"));
    const result = router.selectModel(AgentRole.Research, {
      complexityTier: "heavy",
    });
    // research=haiku, heavy→upgrade→sonnet, quality ceiling allows it
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  it("heavy upgrade blocked by ceiling (balanced: sonnet ceiling)", () => {
    const router = new TaskRouter(DEFAULT_CONFIG);
    const result = router.selectModel(AgentRole.Implementer, {
      complexityTier: "heavy",
    });
    // implementation=sonnet, heavy→upgrade→opus, but ceiling=sonnet → sonnet
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  it("standard tier produces no change", () => {
    const router = new TaskRouter(DEFAULT_CONFIG);
    const withOptions = router.selectModel(AgentRole.Implementer, {
      complexityTier: "standard",
    });
    const without = router.selectModel(AgentRole.Implementer);
    expect(withOptions).toEqual(without);
  });

  it("light can't go below haiku (already at lowest tier)", () => {
    const router = new TaskRouter(configWithProfile("quality"));
    const result = router.selectModel(AgentRole.Research, {
      complexityTier: "light",
    });
    // research=haiku (index 0), light→downgrade but already at bottom → haiku
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-haiku-3-5",
    });
  });

  // ── Classifier integration ─────────────────────────────────

  it("uses classifier when taskDescription provided and no explicit tier", () => {
    const classifier = makeMockClassifier("light");
    const router = new TaskRouter(DEFAULT_CONFIG, { classifier });
    const result = router.selectModel(AgentRole.Implementer, {
      taskDescription: "rename a variable",
    });
    // classifier returns "light", implementation=sonnet → haiku
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-haiku-3-5",
    });
  });

  it("explicit complexityTier overrides classifier", () => {
    const classifier = makeMockClassifier("light");
    const router = new TaskRouter(DEFAULT_CONFIG, { classifier });
    const result = router.selectModel(AgentRole.Implementer, {
      taskDescription: "anything",
      complexityTier: "heavy",
    });
    // explicit heavy overrides classifier's "light"
    // implementation=sonnet → upgrade→opus → capped to sonnet (balanced ceiling)
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  // ── No options = original behavior ─────────────────────────

  it("no options arg with deps injected = identical to vanilla router", () => {
    const classifier = makeMockClassifier("light");
    const history = makeMockHistory("opus");
    const enhanced = new TaskRouter(DEFAULT_CONFIG, { classifier, history });
    const vanilla = new TaskRouter(DEFAULT_CONFIG);

    // selectModel with no second arg must ignore deps
    expect(enhanced.selectModel(AgentRole.Implementer)).toEqual(
      vanilla.selectModel(AgentRole.Implementer),
    );
    expect(enhanced.selectModel(AgentRole.Research)).toEqual(
      vanilla.selectModel(AgentRole.Research),
    );
    expect(enhanced.selectModel(AgentRole.Architect)).toEqual(
      vanilla.selectModel(AgentRole.Architect),
    );
  });

  // ── History-based routing ──────────────────────────────────

  it("history override: uses history suggestion even if different from config", () => {
    const history = makeMockHistory("haiku");
    const router = new TaskRouter(configWithProfile("quality"), { history });
    const result = router.selectModel(AgentRole.Implementer, {
      complexityTier: "standard",
    });
    // history says "haiku" → use it (quality ceiling allows haiku)
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-haiku-3-5",
    });
  });

  it("history suggestion capped by ceiling", () => {
    const history = makeMockHistory("opus");
    const router = new TaskRouter(DEFAULT_CONFIG, { history });
    const result = router.selectModel(AgentRole.Implementer, {
      complexityTier: "standard",
    });
    // history says "opus" but balanced ceiling=sonnet → sonnet
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  it("history null falls back to classifier-based adjustment", () => {
    const classifier = makeMockClassifier("heavy");
    const history = makeMockHistory(null);
    const router = new TaskRouter(configWithProfile("quality"), {
      classifier,
      history,
    });
    const result = router.selectModel(AgentRole.Research, {
      taskDescription: "complex multi-module refactor",
    });
    // history returns null → classifier says "heavy" → haiku upgrades to sonnet
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  it("no classifier and no explicit tier defaults to standard", () => {
    const history = makeMockHistory(null);
    const router = new TaskRouter(DEFAULT_CONFIG, { history });
    const result = router.selectModel(AgentRole.Implementer, {
      taskDescription: "do something",
    });
    // no classifier → tier defaults to "standard" → no adjustment → sonnet
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  it("heavy upgrade from haiku to sonnet, capped at sonnet (balanced)", () => {
    const router = new TaskRouter(DEFAULT_CONFIG);
    const result = router.selectModel(AgentRole.Research, {
      complexityTier: "heavy",
    });
    // research=haiku → heavy upgrades to sonnet, balanced ceiling=sonnet → sonnet
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
  });

  it("heavy upgrade from sonnet to opus (quality profile allows it)", () => {
    const router = new TaskRouter(configWithProfile("quality"));
    const result = router.selectModel(AgentRole.Implementer, {
      complexityTier: "heavy",
    });
    // implementation=sonnet → heavy upgrades to opus, quality ceiling=opus → opus
    expect(result).toEqual({
      provider: "anthropic",
      modelId: "claude-opus-4-5",
    });
  });
});
