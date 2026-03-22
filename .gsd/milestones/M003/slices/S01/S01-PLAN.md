# S01: Auth storage and onboarding wizard

**Goal:** Bootstrap Pi SDK auth infrastructure into `stupid` CLI and provide a first-run onboarding wizard so users can authenticate via OAuth or API key paste.
**Demo:** Running `stupid` with no args and no auth configured triggers an interactive onboarding wizard. After completing onboarding, `stupid "task"` still works with env-var auth (backward compat).

## Must-Haves

- `AuthStorage.create('~/.stupid/auth.json')` + `ModelRegistry` + `SettingsManager` bootstrapped in a new `auth.ts` module
- `shouldRunOnboarding()` returns `true` when no auth.json and no env-var auth; `false` otherwise
- Onboarding wizard using `@clack/prompts`: provider selection → OAuth browser login or API key paste → credential persistence
- CLI entry point (`cli.ts`) calls `shouldRunOnboarding()` when no task arg is given
- Backward compat: `stupid "task"` with `ANTHROPIC_API_KEY` env var continues to work unchanged
- `@clack/prompts` added as dependency and externalized in tsup config

## Proof Level

- This slice proves: integration
- Real runtime required: yes (OAuth flow needs TTY, but unit tests cover logic paths)
- Human/UAT required: yes (OAuth browser redirect is manual-only)

## Verification

- `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` — unit tests for `shouldRunOnboarding()` and auth bootstrap pass
- `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` — existing CLI tests still pass (backward compat)
- `cd packages/cli && npm run build` — builds cleanly with new auth module and @clack/prompts externalized
- `node packages/cli/dist/cli.js --help` — still shows all commands including `task` argument
- `cd packages/cli && npx vitest run src/__tests__/auth.test.ts -- --reporter=verbose 2>&1 | grep -c "✓"` — ≥4 shouldRunOnboarding assertions covering failure paths (no auth, env-only, persisted-only, both)

## Observability / Diagnostics

- Runtime signals: onboarding wizard prints intro/outro via @clack/prompts; OAuth flow logs progress via `onProgress` callback
- Inspection surfaces: `~/.stupid/auth.json` file presence and content (credentials persisted after onboarding)
- Failure visibility: wizard catches errors and displays them via `@clack/prompts` cancel/outro; `shouldRunOnboarding()` is pure logic with no hidden failure modes
- Redaction constraints: API keys and OAuth tokens must never be logged — only provider names

## Integration Closure

- Upstream surfaces consumed: `AuthStorage`, `ModelRegistry`, `SettingsManager` from `@mariozechner/pi-coding-agent`; `getEnvApiKey`, `OAuthLoginCallbacks` from `@mariozechner/pi-ai`; `@clack/prompts` for wizard UI
- New wiring introduced in this slice: `auth.ts` module as composition root for auth; `cli.ts` default action calls `shouldRunOnboarding()` → `runOnboardingWizard()`
- What remains before the milestone is truly usable end-to-end: S02 (interactive TUI mode when auth is available), S03 (integration tests + e2e gate fix)

## Tasks

- [x] **T01: Create auth module with AuthStorage bootstrap and shouldRunOnboarding logic** `est:45m`
  - Why: Foundation for all auth features — creates the composition root that S02 and the onboarding wizard depend on. Also establishes the test file and installs the @clack/prompts dependency.
  - Files: `packages/cli/package.json`, `packages/cli/tsup.config.ts`, `packages/cli/src/auth.ts`, `packages/cli/src/__tests__/auth.test.ts`
  - Do: (1) Add `@clack/prompts` to dependencies in package.json and to externals in tsup.config.ts. (2) Create `auth.ts` exporting `getAuthStorage()`, `getModelRegistry()`, `getSettingsManager()`, and `shouldRunOnboarding()`. AuthStorage uses `~/.stupid/auth.json` path. shouldRunOnboarding checks `authStorage.list().length === 0` AND `getEnvApiKey('anthropic') === undefined`. (3) Write unit tests using `AuthStorage.inMemory()` and env var manipulation to verify shouldRunOnboarding logic.
  - Verify: `cd packages/cli && npx vitest run src/__tests__/auth.test.ts`
  - Done when: auth.test.ts passes with ≥4 assertions covering shouldRunOnboarding true/false paths and auth bootstrap returning correct instances

- [x] **T02: Build onboarding wizard and wire into CLI entry point** `est:1h`
  - Why: The user-facing feature — turns the auth module into an interactive first-run experience and integrates it into the CLI's no-arg flow.
  - Files: `packages/cli/src/onboarding.ts`, `packages/cli/src/cli.ts`, `packages/cli/src/__tests__/auth.test.ts`
  - Do: (1) Create `onboarding.ts` with `runOnboardingWizard()` using @clack/prompts: intro → select provider from `authStorage.getOAuthProviders()` plus "Paste API key" option → if OAuth: call `authStorage.login(providerId, callbacks)` with `open` for browser; if API key: text input → `authStorage.set(provider, { type: 'api_key', key })` → outro. (2) In `cli.ts` default action, when no task arg: import and call `shouldRunOnboarding()`, if true and `process.stdin.isTTY` run wizard, otherwise show help. (3) Add tests for the wizard's provider list construction and CLI integration (--help still works, no-arg behavior).
  - Verify: `cd packages/cli && npm run build && node dist/cli.js --help` shows all commands; `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` passes; `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` passes
  - Done when: CLI builds cleanly, --help output unchanged, onboarding wizard function exists and is wired into the no-arg path, all existing CLI tests pass

## Files Likely Touched

- `packages/cli/package.json`
- `packages/cli/tsup.config.ts`
- `packages/cli/src/auth.ts`
- `packages/cli/src/onboarding.ts`
- `packages/cli/src/cli.ts`
- `packages/cli/src/__tests__/auth.test.ts`
