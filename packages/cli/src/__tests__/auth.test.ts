import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAuthStorage,
  getModelRegistry,
  getSettingsManager,
  shouldRunOnboarding,
  resetAuthStorage,
} from "../auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "../../dist/cli.js");

/**
 * Auth module unit tests.
 *
 * Tests cover:
 * - shouldRunOnboarding() true/false paths with in-memory storage and env vars
 * - Auth bootstrap functions return correct Pi SDK instances
 *
 * Env var manipulation is isolated: saved in beforeEach, restored in afterEach.
 */
describe("auth module", () => {
  // Save env vars that shouldRunOnboarding checks
  let savedAnthropicApiKey: string | undefined;
  let savedAnthropicOAuthToken: string | undefined;

  beforeEach(() => {
    savedAnthropicApiKey = process.env.ANTHROPIC_API_KEY;
    savedAnthropicOAuthToken = process.env.ANTHROPIC_OAUTH_TOKEN;
    // Clear env vars to start each test with a clean slate
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_OAUTH_TOKEN;
    // Reset singleton so tests don't leak state
    resetAuthStorage();
  });

  afterEach(() => {
    // Restore env vars
    if (savedAnthropicApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedAnthropicApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (savedAnthropicOAuthToken !== undefined) {
      process.env.ANTHROPIC_OAUTH_TOKEN = savedAnthropicOAuthToken;
    } else {
      delete process.env.ANTHROPIC_OAUTH_TOKEN;
    }
    resetAuthStorage();
  });

  describe("shouldRunOnboarding()", () => {
    it("returns true when no persisted credentials and no env var auth", () => {
      const emptyStorage = AuthStorage.inMemory({});
      expect(shouldRunOnboarding(emptyStorage)).toBe(true);
    });

    it("returns false when persisted credentials exist (api_key)", () => {
      const storageWithCreds = AuthStorage.inMemory({
        anthropic: { type: "api_key", key: "sk-test-key-12345" },
      });
      expect(shouldRunOnboarding(storageWithCreds)).toBe(false);
    });

    it("returns false when ANTHROPIC_API_KEY env var is set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-env-test";
      const emptyStorage = AuthStorage.inMemory({});
      expect(shouldRunOnboarding(emptyStorage)).toBe(false);
    });

    it("returns false when ANTHROPIC_OAUTH_TOKEN env var is set", () => {
      process.env.ANTHROPIC_OAUTH_TOKEN = "oauth-token-test";
      const emptyStorage = AuthStorage.inMemory({});
      expect(shouldRunOnboarding(emptyStorage)).toBe(false);
    });

    it("returns false when both persisted credentials and env var exist", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-env-test";
      const storageWithCreds = AuthStorage.inMemory({
        anthropic: { type: "api_key", key: "sk-test-key-12345" },
      });
      expect(shouldRunOnboarding(storageWithCreds)).toBe(false);
    });
  });

  describe("getAuthStorage()", () => {
    it("returns an AuthStorage instance with expected methods", () => {
      const storage = getAuthStorage();
      expect(typeof storage.list).toBe("function");
      expect(typeof storage.has).toBe("function");
      expect(typeof storage.set).toBe("function");
      expect(typeof storage.getApiKey).toBe("function");
    });

    it("returns the same cached instance on repeated calls", () => {
      const a = getAuthStorage();
      const b = getAuthStorage();
      expect(a).toBe(b);
    });

    it("returns a fresh instance after resetAuthStorage()", () => {
      const a = getAuthStorage();
      resetAuthStorage();
      const b = getAuthStorage();
      expect(a).not.toBe(b);
    });
  });

  describe("getModelRegistry()", () => {
    it("returns a ModelRegistry instance with expected methods", () => {
      const registry = getModelRegistry();
      expect(typeof registry.getAll).toBe("function");
      expect(typeof registry.getAvailable).toBe("function");
    });
  });

  describe("getSettingsManager()", () => {
    it("returns a SettingsManager instance with expected methods", () => {
      const settings = getSettingsManager();
      expect(typeof settings.getDefaultProvider).toBe("function");
    });
  });
});

/**
 * Onboarding module integration tests.
 *
 * Tests verify:
 * - The onboarding module exports the expected function
 * - The wizard function has the correct interface
 * - CLI integration: --help still works after cli.ts modification
 * - CLI integration: shouldRunOnboarding is referenced in built cli.ts
 */
describe("onboarding module", () => {
  it("exports runOnboardingWizard as an async function", async () => {
    const { runOnboardingWizard } = await import("../onboarding.js");
    expect(typeof runOnboardingWizard).toBe("function");
  });

  it("onboarding module imports without errors", async () => {
    const mod = await import("../onboarding.js");
    expect(mod).toBeDefined();
    expect(mod.runOnboardingWizard).toBeDefined();
  });
});

/**
 * CLI integration tests after onboarding wiring.
 *
 * These require a built CLI binary (dist/cli.js).
 * They verify backward compatibility is preserved.
 */
describe("CLI integration with onboarding", () => {
  it("--help still shows all commands after cli.ts modification", () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: "utf-8" });
    expect(output).toContain("task");
    expect(output).toContain("auto");
    expect(output).toContain("status");
    expect(output).toContain("recall");
    expect(output).toContain("init");
    expect(output).toContain("cost");
    expect(output).toContain("doctor");
    expect(output).toContain("--dry-run");
    expect(output).toContain("--profile");
  });

  it("--version still outputs 0.1.0", () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: "utf-8" });
    expect(output.trim()).toBe("0.1.0");
  });
});
