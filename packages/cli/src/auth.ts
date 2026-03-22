/**
 * Auth composition root for the stupid CLI.
 *
 * Bootstraps Pi SDK's AuthStorage, ModelRegistry, and SettingsManager
 * with stupid-specific paths (~/.stupid/ instead of ~/.gsd/).
 *
 * Exports `shouldRunOnboarding()` — the gate that determines whether
 * the CLI should enter the first-run interactive wizard.
 *
 * Observability:
 * - `shouldRunOnboarding` is pure logic: returns boolean based on
 *   persisted credentials + env var presence. No side-effects.
 * - AuthStorage writes to `~/.stupid/auth.json` — inspect that file
 *   to verify credential persistence after onboarding.
 * - Env var fallback checks `ANTHROPIC_API_KEY` / `ANTHROPIC_OAUTH_TOKEN`
 *   via Pi SDK's `getEnvApiKey('anthropic')`.
 *
 * @module
 */

import { AuthStorage, ModelRegistry, SettingsManager } from "@mariozechner/pi-coding-agent";
import { getEnvApiKey } from "@mariozechner/pi-ai";
import { homedir } from "node:os";
import { join } from "node:path";

/** Lazy-cached AuthStorage singleton. */
let _authStorage: AuthStorage | null = null;

/**
 * Path to the stupid CLI auth file.
 * Intentionally NOT using Pi SDK's `getAgentDir()` which returns `~/.gsd/agent`.
 */
const AUTH_PATH = join(homedir(), ".stupid", "auth.json");

/**
 * Returns (and lazily creates) the AuthStorage pointed at `~/.stupid/auth.json`.
 *
 * The instance is cached — call `resetAuthStorage()` to clear it (used in tests).
 */
export function getAuthStorage(): AuthStorage {
  if (!_authStorage) {
    _authStorage = AuthStorage.create(AUTH_PATH);
  }
  return _authStorage;
}

/**
 * Returns a new ModelRegistry wired to the stupid CLI's AuthStorage.
 */
export function getModelRegistry(): ModelRegistry {
  return new ModelRegistry(getAuthStorage());
}

/**
 * Returns a new SettingsManager pointed at `~/.stupid/agent` (not `~/.gsd/agent`).
 */
export function getSettingsManager(): SettingsManager {
  return SettingsManager.create(process.cwd(), join(homedir(), ".stupid", "agent"));
}

/**
 * Determines whether the CLI should launch the first-run onboarding wizard.
 *
 * Returns `true` when BOTH conditions hold:
 * 1. No persisted credentials in AuthStorage (list is empty)
 * 2. No env-var auth for Anthropic (ANTHROPIC_API_KEY / ANTHROPIC_OAUTH_TOKEN)
 *
 * Returns `false` if either source provides auth — the user is already configured.
 *
 * Accepts an optional `authStorage` parameter for testability (avoids touching the
 * filesystem in unit tests). Defaults to the real singleton when called in production.
 */
export function shouldRunOnboarding(authStorage?: AuthStorage): boolean {
  const storage = authStorage ?? getAuthStorage();
  const hasPersistedCredentials = storage.list().length > 0;
  const hasEnvAuth = getEnvApiKey("anthropic") !== undefined;
  return !hasPersistedCredentials && !hasEnvAuth;
}

/**
 * Clears the cached AuthStorage singleton.
 * Used in tests to avoid cross-test leakage.
 */
export function resetAuthStorage(): void {
  _authStorage = null;
}
