import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  loadConfig,
  DEFAULT_CONFIG,
  deepMerge,
  StupidConfigSchema,
} from "../index.js";

describe("DEFAULT_CONFIG", () => {
  it("has all top-level StupidConfig keys", () => {
    const expectedKeys = [
      "models",
      "governance",
      "budget",
      "git",
      "profile",
      "projectRoot",
      "verbose",
    ];
    for (const key of expectedKeys) {
      expect(DEFAULT_CONFIG).toHaveProperty(key);
    }
  });

  it("has all model roles populated as strings", () => {
    expect(typeof DEFAULT_CONFIG.models.research).toBe("string");
    expect(typeof DEFAULT_CONFIG.models.implementation).toBe("string");
    expect(typeof DEFAULT_CONFIG.models.architecture).toBe("string");
    expect(typeof DEFAULT_CONFIG.models.review).toBe("string");
    expect(typeof DEFAULT_CONFIG.models.testing).toBe("string");
  });

  it("has governance settings populated", () => {
    expect(typeof DEFAULT_CONFIG.governance.loopDetection).toBe("boolean");
    expect(typeof DEFAULT_CONFIG.governance.costTracking).toBe("boolean");
    expect(DEFAULT_CONFIG.governance.maxRetries).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CONFIG.governance.stagnationThreshold).toBeGreaterThan(0);
  });

  it("has budget settings with positive hardLimitUsd", () => {
    expect(DEFAULT_CONFIG.budget.hardLimitUsd).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.budget.softLimitUsd).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CONFIG.budget.warningThresholdPercent).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CONFIG.budget.warningThresholdPercent).toBeLessThanOrEqual(100);
  });

  it("has git settings as booleans", () => {
    expect(typeof DEFAULT_CONFIG.git.commitPerTask).toBe("boolean");
    expect(typeof DEFAULT_CONFIG.git.branchPerSlice).toBe("boolean");
    expect(typeof DEFAULT_CONFIG.git.autoCommitMessage).toBe("boolean");
  });

  it("has a valid profile value", () => {
    expect(["budget", "balanced", "quality"]).toContain(DEFAULT_CONFIG.profile);
  });

  it("passes Zod validation", () => {
    const result = StupidConfigSchema.parse(DEFAULT_CONFIG);
    expect(result).toEqual(DEFAULT_CONFIG);
  });
});

describe("deepMerge", () => {
  it("replaces specified fields, preserves unspecified nested defaults", () => {
    const target = {
      models: { research: "haiku", implementation: "sonnet" },
      budget: { softLimitUsd: 1.0, hardLimitUsd: 5.0 },
    };
    // deepMerge is called with partial nested objects at runtime (from YAML)
    const source = { models: { research: "opus" } } as typeof target;
    const result = deepMerge(target, source);
    expect(result.models.research).toBe("opus");
    expect(result.models.implementation).toBe("sonnet");
    expect(result.budget.softLimitUsd).toBe(1.0);
    expect(result.budget.hardLimitUsd).toBe(5.0);
  });

  it("handles arrays by replacing, not concatenating", () => {
    const target = { tags: ["a", "b", "c"], name: "test" };
    const source = { tags: ["x"] };
    const result = deepMerge(target, source);
    expect(result.tags).toEqual(["x"]);
  });

  it("does not mutate the original objects", () => {
    const target = { a: { b: 1 } };
    const source = { a: { b: 2 } };
    deepMerge(target, source);
    expect(target.a.b).toBe(1);
  });

  it("ignores undefined source values", () => {
    const target = { a: 1, b: 2 };
    const source = { a: undefined };
    const result = deepMerge(target, source);
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });

  it("replaces target value with null source", () => {
    const target = { a: { nested: true }, b: 2 };
    const source = { a: null } as unknown as Partial<typeof target>;
    const result = deepMerge(target, source);
    expect(result.a).toBeNull();
  });
});

describe("StupidConfigSchema (Zod validation)", () => {
  it("rejects config with wrong profile type", () => {
    const invalid = { ...DEFAULT_CONFIG, profile: 123 };
    expect(() => StupidConfigSchema.parse(invalid)).toThrow(ZodError);
  });

  it("rejects config with invalid budget (negative hardLimit)", () => {
    const invalid = {
      ...DEFAULT_CONFIG,
      budget: { ...DEFAULT_CONFIG.budget, hardLimitUsd: -1 },
    };
    expect(() => StupidConfigSchema.parse(invalid)).toThrow(ZodError);
  });

  it("provides structured field-level issues on validation failure", () => {
    const invalid = { ...DEFAULT_CONFIG, profile: 999 };
    try {
      StupidConfigSchema.parse(invalid);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const zodErr = err as ZodError;
      expect(zodErr.issues.length).toBeGreaterThan(0);
      expect(zodErr.issues[0].path).toContain("profile");
    }
  });

  it("rejects config with missing required nested field", () => {
    const invalid = {
      ...DEFAULT_CONFIG,
      models: { research: "haiku" }, // missing other required model fields
    };
    expect(() => StupidConfigSchema.parse(invalid)).toThrow(ZodError);
  });
});

describe("loadConfig", () => {
  it("returns DEFAULT_CONFIG when no config files exist", () => {
    // No .stupid/config.yml files exist in this env,
    // so loadConfig() falls back to defaults
    const config = loadConfig();
    expect(config.profile).toBe(DEFAULT_CONFIG.profile);
    expect(config.models).toEqual(DEFAULT_CONFIG.models);
    expect(config.governance).toEqual(DEFAULT_CONFIG.governance);
    expect(config.budget).toEqual(DEFAULT_CONFIG.budget);
    expect(config.git).toEqual(DEFAULT_CONFIG.git);
    expect(config.verbose).toBe(DEFAULT_CONFIG.verbose);
  });

  it("overrides default profile via CLI overrides", () => {
    const config = loadConfig({ profile: "quality" });
    expect(config.profile).toBe("quality");
    // Other defaults should be preserved
    expect(config.models).toEqual(DEFAULT_CONFIG.models);
    expect(config.governance).toEqual(DEFAULT_CONFIG.governance);
    expect(config.budget).toEqual(DEFAULT_CONFIG.budget);
    expect(config.git).toEqual(DEFAULT_CONFIG.git);
  });

  it("deep-merges partial model overrides", () => {
    const config = loadConfig({ models: { research: "opus" } } as any);
    expect(config.models.research).toBe("opus");
    expect(config.models.implementation).toBe(DEFAULT_CONFIG.models.implementation);
  });

  it("returns a Zod-validated result", () => {
    const config = loadConfig();
    // The result should pass Zod validation again (it's already validated)
    expect(() => StupidConfigSchema.parse(config)).not.toThrow();
  });
});
