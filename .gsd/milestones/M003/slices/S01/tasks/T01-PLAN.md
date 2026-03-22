---
estimated_steps: 4
estimated_files: 4
skills_used:
  - test
---

# T01: Create auth module with AuthStorage bootstrap and shouldRunOnboarding logic

**Slice:** S01 — Auth storage and onboarding wizard
**Milestone:** M003

## Description

Create the `auth.ts` module that serves as the composition root for all authentication in the `stupid` CLI. This module bootstraps Pi SDK's `AuthStorage` (pointed at `~/.stupid/auth.json`), `ModelRegistry`, and `SettingsManager`, and exports a `shouldRunOnboarding()` function that determines whether the user needs to go through first-run setup. Also installs `@clack/prompts` as a dependency and externalizes it in the tsup bundler config.

## Steps

1. **Install @clack/prompts dependency**: In `packages/cli/package.json`, add `"@clack/prompts": "^0.9.0"` to dependencies. In `packages/cli/tsup.config.ts`, add `"@clack/prompts"` to the `external` array. Run `npm install` from repo root to install.

2. **Create `packages/cli/src/auth.ts`**: Export these functions:
   - `getAuthStorage(): AuthStorage` — lazily creates and caches `AuthStorage.create(join(homedir(), '.stupid', 'auth.json'))`. Uses `node:os` `homedir()` and `node:path` `join()`.
   - `getModelRegistry(): ModelRegistry` — creates `new ModelRegistry(getAuthStorage())`.
   - `getSettingsManager(): SettingsManager` — creates `SettingsManager.create(process.cwd(), join(homedir(), '.stupid', 'agent'))`.
   - `shouldRunOnboarding(): boolean` — returns `true` when BOTH conditions hold: (a) `getAuthStorage().list().length === 0` (no persisted credentials), AND (b) `getEnvApiKey('anthropic') === undefined` (no env var auth). Returns `false` if either has auth.
   - `resetAuthStorage(): void` — clears the cached instance (needed for testing).

   **Important constraints:**
   - Import `AuthStorage`, `ModelRegistry`, `SettingsManager` from `@mariozechner/pi-coding-agent`.
   - Import `getEnvApiKey` from `@mariozechner/pi-ai`.
   - All imports must use `.js` extensions for local files (ESM requirement).
   - NEVER use `getAgentDir()` from Pi SDK — it returns `~/.gsd/agent`, not `~/.stupid`.
   - Auth path MUST be `join(homedir(), '.stupid', 'auth.json')`.

3. **Create `packages/cli/src/__tests__/auth.test.ts`**: Unit tests for the auth module:
   - Test `shouldRunOnboarding()` returns `true` when using `AuthStorage.inMemory({})` and no `ANTHROPIC_API_KEY` / `ANTHROPIC_OAUTH_TOKEN` env vars.
   - Test `shouldRunOnboarding()` returns `false` when `AuthStorage.inMemory({ anthropic: { type: 'api_key', key: 'sk-test' } })` is used.
   - Test `shouldRunOnboarding()` returns `false` when `ANTHROPIC_API_KEY` env var is set (even with empty auth storage).
   - Test `getAuthStorage()` returns an instance with expected methods (list, has, set, getApiKey).
   - Test `getModelRegistry()` returns an instance with expected methods (getAll, getAvailable).
   - Test `getSettingsManager()` returns an instance with expected methods (getDefaultProvider).

   **Testing approach for shouldRunOnboarding:**
   The function uses real `AuthStorage` internally. To test it cleanly, either:
   - (a) Refactor `shouldRunOnboarding` to accept `authStorage` as a parameter (preferred — makes it pure/testable), with a default that calls `getAuthStorage()`.
   - (b) Or export a `shouldRunOnboardingWith(authStorage: AuthStorage)` variant for testing.
   For env var tests: save/restore `process.env.ANTHROPIC_API_KEY` and `process.env.ANTHROPIC_OAUTH_TOKEN` in beforeEach/afterEach.

4. **Verify**: Run `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` — all tests pass.

## Must-Haves

- [ ] `@clack/prompts` added to `packages/cli/package.json` dependencies
- [ ] `@clack/prompts` added to `packages/cli/tsup.config.ts` externals
- [ ] `packages/cli/src/auth.ts` exports `getAuthStorage`, `getModelRegistry`, `getSettingsManager`, `shouldRunOnboarding`
- [ ] `AuthStorage` uses `~/.stupid/auth.json` path (NOT the Pi SDK default)
- [ ] `shouldRunOnboarding()` checks both persisted credentials AND env var auth
- [ ] Unit tests cover true/false paths for `shouldRunOnboarding()`

## Verification

- `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` — all tests pass
- `grep -q "@clack/prompts" packages/cli/package.json` — dependency present
- `grep -q "@clack/prompts" packages/cli/tsup.config.ts` — externalized

## Inputs

- `packages/cli/package.json` — existing dependency manifest to extend
- `packages/cli/tsup.config.ts` — existing bundler config to extend
- `packages/cli/src/context.ts` — reference for composition root pattern used in this codebase

## Expected Output

- `packages/cli/package.json` — updated with @clack/prompts dependency
- `packages/cli/tsup.config.ts` — updated with @clack/prompts in externals
- `packages/cli/src/auth.ts` — new auth composition root module
- `packages/cli/src/__tests__/auth.test.ts` — new unit test file for auth module
