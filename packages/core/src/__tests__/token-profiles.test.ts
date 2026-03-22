import { describe, it, expect } from "vitest";
import { TOKEN_PROFILES } from "../index.js";
import type { ProfileConfig } from "../index.js";

describe("TOKEN_PROFILES", () => {
  it("has exactly 3 profiles: budget, balanced, quality", () => {
    const keys = Object.keys(TOKEN_PROFILES);
    expect(keys).toHaveLength(3);
    expect(keys).toContain("budget");
    expect(keys).toContain("balanced");
    expect(keys).toContain("quality");
  });

  describe("budget profile", () => {
    it("has modelCeiling of 'haiku'", () => {
      expect(TOKEN_PROFILES.budget.modelCeiling).toBe("haiku");
    });

    it("has inlineLevel of 'minimal'", () => {
      expect(TOKEN_PROFILES.budget.inlineLevel).toBe("minimal");
    });

    it("skips at least one phase", () => {
      expect(TOKEN_PROFILES.budget.skipPhases.length).toBeGreaterThan(0);
    });

    it("has positive maxConcurrentAgents", () => {
      expect(TOKEN_PROFILES.budget.maxConcurrentAgents).toBeGreaterThan(0);
    });
  });

  describe("balanced profile", () => {
    it("has modelCeiling of 'sonnet'", () => {
      expect(TOKEN_PROFILES.balanced.modelCeiling).toBe("sonnet");
    });

    it("has inlineLevel of 'standard'", () => {
      expect(TOKEN_PROFILES.balanced.inlineLevel).toBe("standard");
    });

    it("skips no phases", () => {
      expect(TOKEN_PROFILES.balanced.skipPhases).toEqual([]);
    });

    it("has positive maxConcurrentAgents", () => {
      expect(TOKEN_PROFILES.balanced.maxConcurrentAgents).toBeGreaterThan(0);
    });
  });

  describe("quality profile", () => {
    it("has modelCeiling of 'opus'", () => {
      expect(TOKEN_PROFILES.quality.modelCeiling).toBe("opus");
    });

    it("has inlineLevel of 'full'", () => {
      expect(TOKEN_PROFILES.quality.inlineLevel).toBe("full");
    });

    it("skips no phases", () => {
      expect(TOKEN_PROFILES.quality.skipPhases).toEqual([]);
    });

    it("has positive maxConcurrentAgents", () => {
      expect(TOKEN_PROFILES.quality.maxConcurrentAgents).toBeGreaterThan(0);
    });
  });

  it("all profiles have positive maxConcurrentAgents", () => {
    for (const [name, profile] of Object.entries(TOKEN_PROFILES)) {
      expect(
        (profile as ProfileConfig).maxConcurrentAgents,
        `${name} should have positive maxConcurrentAgents`,
      ).toBeGreaterThan(0);
    }
  });

  it("all profiles have a compressionLevel string", () => {
    for (const [name, profile] of Object.entries(TOKEN_PROFILES)) {
      expect(
        typeof (profile as ProfileConfig).compressionLevel,
        `${name} should have compressionLevel`,
      ).toBe("string");
    }
  });
});
