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
