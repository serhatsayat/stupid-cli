# S01 — Research: Auth storage and onboarding wizard

**Date:** 2026-03-22

## Summary

This slice bootstraps Pi SDK auth infrastructure (`AuthStorage`, `ModelRegistry`, `SettingsManager`) into the `stupid` CLI and builds a first-run onboarding wizard. The Pi SDK already provides all the building blocks — `AuthStorage.create(customPath)` accepts a custom path (confirmed via runtime test), `ModelRegistry` wraps it, and `AuthStorage.login()` handles the full OAuth browser flow with callbacks. The `getEnvApiKey()` function in `@mariozechner/pi-ai` already falls back to env vars (`ANTHROPIC_OAUTH_TOKEN || ANTHROPIC_API_KEY`), so backward compat is free.

The main work is: (1) a new `auth.ts` module in `packages/cli/src/` that wires `AuthStorage.create(~/.stupid/auth.json)` + `ModelRegistry` + `SettingsManager`, (2) a `shouldRunOnboarding()` function checking whether any auth is configured, (3) an onboarding wizard using `@clack/prompts` (not yet installed) for provider selection → OAuth browser login or API key paste → credential persistence, and (4) wiring the onboarding check into `cli.ts`'s default action.

## Recommendation

Use `AuthStorage.create()` with `~/.stupid/auth.json` path — don't create custom auth code. Wire `ModelRegistry` and `SettingsManager` using the same `~/.stupid/agent/` directory as `agentDir`. Build the onboarding wizard with `@clack/prompts` (clean, minimal TUI prompts library). The wizard should offer OAuth providers from `authStorage.getOAuthProviders()` plus a manual API key option. After onboarding, persist credentials via `authStorage.set()`. The `shouldRunOnboarding()` check is: no `auth.json` file OR `authStorage.list()` returns empty AND no env-var auth is detected.

## Implementation Landscape

### Key Files

- `packages/cli/src/cli.ts` — Entry point. Currently shows help when no task arg. Needs: (1) import + call `shouldRunOnboarding()`, (2) if true run wizard, (3) after auth is available, proceed to interactive TUI (S02) or help
- `packages/cli/src/auth.ts` — **NEW**. Composition root for auth: creates `AuthStorage`, `ModelRegistry`, `SettingsManager` pointed at `~/.stupid/`. Exports `shouldRunOnboarding()`, `runOnboardingWizard()`, `getAuthStorage()`, `getModelRegistry()`, `getSettingsManager()`
- `packages/cli/src/commands/run.ts` — Existing single-shot command. Uses `buildContext()` which is env-var only. Needs no changes for backward compat since `getEnvApiKey()` already checks `ANTHROPIC_OAUTH_TOKEN || ANTHROPIC_API_KEY` as fallback inside `AuthStorage.getApiKey()`
- `packages/cli/src/context.ts` — Composition root for `OrchestratorContext`. Currently env-var auth only. May need minor update to accept `AuthStorage` for API key resolution in the single-shot flow
- `packages/cli/package.json` — Needs `@clack/prompts` added as dependency
- `packages/cli/tsup.config.ts` — Needs `@clack/prompts` added to externals list

### Pi SDK API Surface (confirmed via type inspection + runtime tests)

```
AuthStorage.create(authPath?: string)   → AuthStorage  (default: ~/.gsd/agent/auth.json)
AuthStorage.create('~/.stupid/auth.json') → works (runtime-verified)
authStorage.list()                      → string[] of provider names with creds
authStorage.has(provider)               → boolean (checks auth.json only)
authStorage.hasAuth(provider)           → boolean (auth.json + env vars, no token refresh)
authStorage.set(provider, credential)   → void (persists to auth.json)
authStorage.login(providerId, callbacks) → Promise<void> (OAuth browser flow)
authStorage.getApiKey(provider)         → Promise<string | undefined> (priority: runtime → auth.json → oauth refresh → env var → fallback)
authStorage.getOAuthProviders()         → OAuthProviderInterface[] (5 providers: anthropic, github-copilot, google-gemini-cli, google-antigravity, openai-codex)

ModelRegistry(authStorage, modelsJsonPath?) → ModelRegistry
modelRegistry.getAvailable()            → Model[] (models with auth configured)
modelRegistry.getAll()                  → Model[] (all known models)

SettingsManager.create(cwd?, agentDir?) → SettingsManager
SettingsManager.inMemory(settings?)     → SettingsManager (for tests)

getEnvApiKey('anthropic')               → process.env.ANTHROPIC_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY
```

### OAuth Login Callbacks Shape

```typescript
interface OAuthLoginCallbacks {
  onAuth: (info: { url: string; instructions?: string }) => void;  // Open browser
  onPrompt: (prompt: { message: string; placeholder?: string }) => Promise<string>;
  onProgress?: (message: string) => void;
  onManualCodeInput?: () => Promise<string>;
  signal?: AbortSignal;
}
```

### Build Order

1. **Add `@clack/prompts` dependency** — `npm install @clack/prompts` in CLI package, add to tsup externals. This unblocks the wizard.
2. **Create `packages/cli/src/auth.ts`** — Bootstrap `AuthStorage.create(~/.stupid/auth.json)`, `ModelRegistry`, `SettingsManager`. Export `shouldRunOnboarding()` and `getAuth*()` accessors. This is the foundation everything else depends on.
3. **Create onboarding wizard in `auth.ts`** (or separate `packages/cli/src/onboarding.ts`) — `@clack/prompts` intro → select provider (OAuth list + "Paste API key" option) → OAuth browser login or API key text input → `authStorage.set()` → outro. This is the core user-facing feature.
4. **Wire into `cli.ts`** — In the default action (when no task arg), check `shouldRunOnboarding()`. If true, run wizard. After wizard or if auth exists, either show help (for now — S02 adds interactive mode) or print a success message.
5. **Verify backward compat** — `stupid "some task"` must still work with only `ANTHROPIC_API_KEY` env var set. This should already work because `run.ts` → `buildContext()` → orchestrator uses Pi SDK's `getEnvApiKey()` fallback chain.

### Verification Approach

1. **Unit tests for `shouldRunOnboarding()`**:
   - Returns `true` when `AuthStorage.inMemory({})` and no env vars
   - Returns `false` when `AuthStorage.inMemory({ anthropic: { type: 'api_key', key: 'sk-...' } })`
   - Returns `false` when `ANTHROPIC_API_KEY` env var is set
2. **Unit tests for auth bootstrap**:
   - `getAuthStorage()` returns an `AuthStorage` instance
   - `getModelRegistry()` returns a `ModelRegistry` instance
   - `getSettingsManager()` returns a `SettingsManager` instance
3. **CLI integration test**: `node dist/cli.js --help` still shows all commands (existing test in `cli.test.ts`)
4. **Manual verification**: Run `stupid` with no args → onboarding wizard starts (requires TTY)

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Credential storage + OAuth refresh + file locking | `AuthStorage` from Pi SDK | Full credential lifecycle, auto-refresh, lock-safe concurrent access |
| Model discovery + availability check | `ModelRegistry` from Pi SDK | Knows all built-in providers, checks which have auth configured |
| OAuth browser login flow | `authStorage.login(providerId, callbacks)` | Handles token exchange, browser redirect, credential persistence |
| Env var auth fallback | `getEnvApiKey()` from `@mariozechner/pi-ai` | Already handles `ANTHROPIC_OAUTH_TOKEN > ANTHROPIC_API_KEY` precedence |
| Interactive TUI prompts | `@clack/prompts` | Clean intro/outro/select/text prompts, used by Pi SDK's onboarding |

## Constraints

- **Auth path must be `~/.stupid/auth.json`** — not `~/.gsd/agent/auth.json` (Pi default). Pass explicit path to `AuthStorage.create()`.
- **Pi SDK's `getAgentDir()` returns `~/.gsd/agent`** — because `pi-coding-agent` package.json has `piConfig.configDir: ".gsd"`. For stupid, we must always pass explicit paths, never rely on `getAgentDir()`.
- **`@clack/prompts` is NOT installed** — it's mentioned in the roadmap but not in `package.json` or `node_modules`. Must be added.
- **`tsup.config.ts` externals** — Any new runtime dependency must be added to the externals list (D033: externalize all runtime deps).
- **ESM only** — Entire codebase is ESM (`"type": "module"`). All imports must use `.js` extensions.

## Common Pitfalls

- **Not externalizing `@clack/prompts` in tsup** — Will cause dynamic require failures at runtime (same issue as D033 with `@inquirer/prompts`). Must add to `tsup.config.ts` externals.
- **Using `getAgentDir()` from Pi SDK** — Returns `~/.gsd/agent`, NOT `~/.stupid`. Always construct paths manually with `join(homedir(), '.stupid', ...)`.
- **Blocking on OAuth in non-TTY** — `authStorage.login()` opens a browser and waits for callback. Must only run in interactive TTY context (`process.stdin.isTTY`). Single-shot `stupid "task"` should never trigger onboarding.
- **Forgetting env-var fallback in `shouldRunOnboarding()`** — Must check both `authStorage.list()` AND `getEnvApiKey()` for common providers. If env vars are set, skip onboarding.

## Open Risks

- **`@clack/prompts` version compatibility** — Not yet tested with current Node.js 22 + ESM setup. Low risk since it's a pure JS package, but tsup bundling quirks are possible.
- **OAuth callback server port conflicts** — `authStorage.login()` starts a local HTTP server for OAuth redirect. If port is in use, login fails. Pi SDK handles this internally but worth knowing.

## Sources

- Pi SDK `AuthStorage` API confirmed via type inspection of `node_modules/@mariozechner/pi-coding-agent/dist/core/auth-storage.d.ts`
- `getEnvApiKey()` env var mapping confirmed by reading `node_modules/@mariozechner/pi-ai/dist/env-api-keys.js`
- OAuth providers confirmed via runtime: `getOAuthProviders()` returns 5 providers (anthropic, github-copilot, google-gemini-cli, google-antigravity, openai-codex)
- `AuthStorage.create(customPath)` works with `~/.stupid/auth.json` — runtime-verified
