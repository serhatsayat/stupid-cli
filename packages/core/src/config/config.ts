import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { StupidConfig, TokenProfile } from "../types/index.js";

// ─── Zod Schema ──────────────────────────────────────────────

export const StupidConfigSchema = z.object({
  models: z.object({
    research: z.string(),
    implementation: z.string(),
    architecture: z.string(),
    review: z.string(),
    testing: z.string(),
  }),
  governance: z.object({
    loopDetection: z.boolean(),
    costTracking: z.boolean(),
    maxRetries: z.number().int().nonnegative(),
    stagnationThreshold: z.number().positive(),
  }),
  budget: z.object({
    softLimitUsd: z.number().nonnegative(),
    hardLimitUsd: z.number().positive(),
    warningThresholdPercent: z.number().min(0).max(100),
  }),
  git: z.object({
    commitPerTask: z.boolean(),
    branchPerSlice: z.boolean(),
    autoCommitMessage: z.boolean(),
  }),
  profile: z.enum(["budget", "balanced", "quality"]),
  projectRoot: z.string(),
  verbose: z.boolean(),
});

// ─── Default Configuration ───────────────────────────────────

export const DEFAULT_CONFIG: StupidConfig = {
  models: {
    research: "haiku",
    implementation: "sonnet",
    architecture: "opus",
    review: "sonnet",
    testing: "haiku",
  },
  governance: {
    loopDetection: true,
    costTracking: true,
    maxRetries: 3,
    stagnationThreshold: 5,
  },
  budget: {
    softLimitUsd: 1.0,
    hardLimitUsd: 5.0,
    warningThresholdPercent: 80,
  },
  git: {
    commitPerTask: true,
    branchPerSlice: true,
    autoCommitMessage: true,
  },
  profile: "balanced" as TokenProfile,
  projectRoot: process.cwd(),
  verbose: false,
};

// ─── Deep Merge ──────────────────────────────────────────────

/**
 * Recursively merges `source` into `target`.
 * - For plain objects, recurses into nested keys.
 * - For primitives and arrays, `source` replaces `target`.
 * - Returns a new object (does not mutate inputs).
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const tgt = target as Record<string, unknown>;
  const src = source as Record<string, unknown>;
  const result: Record<string, unknown> = { ...tgt };

  for (const key of Object.keys(src)) {
    const sourceVal = src[key];
    const targetVal = tgt[key];

    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      targetVal !== undefined &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }

  return result as T;
}

// ─── YAML Config File Parsing ────────────────────────────────

/**
 * Reads and parses a YAML config file. Returns `{}` if the file
 * does not exist — this is not an error condition.
 */
export function parseConfigFile(filePath: string): Partial<StupidConfig> {
  try {
    if (!existsSync(filePath)) {
      return {};
    }
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content);
    if (parsed === null || parsed === undefined || typeof parsed !== "object") {
      return {};
    }
    return parsed as Partial<StupidConfig>;
  } catch {
    // Unreadable / malformed file → treat as empty
    return {};
  }
}

// ─── Load Config ─────────────────────────────────────────────

/**
 * Loads configuration with the following precedence (highest wins):
 *   1. CLI overrides (passed as argument)
 *   2. Project config  `.stupid/config.yml`
 *   3. Global config   `~/.stupid/config.yml`
 *   4. DEFAULT_CONFIG
 *
 * The merged result is validated with Zod. A `ZodError` is thrown
 * if the final config violates the schema.
 */
export function loadConfig(
  overrides?: Partial<StupidConfig>,
): StupidConfig {
  const globalConfigPath = join(homedir(), ".stupid", "config.yml");
  const projectConfigPath = resolve(".stupid", "config.yml");

  const globalConfig = parseConfigFile(globalConfigPath);
  const projectConfig = parseConfigFile(projectConfigPath);

  // Merge: defaults ← global ← project ← CLI overrides
  let merged = deepMerge(DEFAULT_CONFIG, globalConfig);
  merged = deepMerge(merged, projectConfig);
  if (overrides) {
    merged = deepMerge(merged, overrides);
  }

  // Validate with Zod — throws ZodError on invalid config
  return StupidConfigSchema.parse(merged);
}
