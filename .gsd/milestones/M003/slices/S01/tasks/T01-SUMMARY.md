---
id: T01
parent: S01
milestone: M003
provides:
  - auth.ts composition root with getAuthStorage, getModelRegistry, getSettingsManager, shouldRunOnboarding
  - @clack/prompts dependency installed and externalized in tsup
  - auth.test.ts with 10 passing unit tests
key_files:
  - packages/cli/src/auth.ts
  - packages/cli/src/__tests__/auth.test.ts
  - packages/cli/package.json
  - packages/cli/tsup.config.ts
key_decisions:
  - shouldRunOnboarding accepts optional authStorage parameter for testability (DI over mocking)
patterns_established:
  - Auth module uses lazy singleton pattern with resetAuthStorage() for test isolation
  - Tests save/restore env vars in beforeEach/afterEach for ANTHROPIC_API_KEY/ANTHROPIC_OAUTH_TOKEN
observability_surfaces:
  - shouldRunOnboarding is pure logic — returns boolean from persisted creds + env var presence
  - AuthStorage writes to ~/.stupid/auth.json — inspect file to verify credential persistence
  - getEnvApiKey('anthropic') checks ANTHROPIC_API_KEY and ANTHROPIC_OAUTH_TOKEN env vars
duration: 12m
verification_result: passed
completed_at: 2026-03-22
blocker_discovered: false
---

# T01: Create auth module with AuthStorage bootstrap and shouldRunOnboarding logic

**Added auth.ts composition root bootstrapping Pi SDK AuthStorage at ~/.stupid/auth.json with shouldRunOnboarding gate and 10 passing unit tests**

## What Happened

Created `packages/cli/src/auth.ts` as the authentication composition root for the stupid CLI. The module lazily creates and caches an `AuthStorage` instance pointed at `~/.stupid/auth.json` (not the Pi SDK default of `~/.gsd/`), and provides factory functions for `ModelRegistry` and `SettingsManager`. The `shouldRunOnboarding()` function checks two conditions: no persisted credentials in storage AND no env-var auth via `getEnvApiKey('anthropic')`.

Added `@clack/prompts ^0.9.0` to dependencies and externalized it in tsup.config.ts for T02's onboarding wizard.

Wrote 10 unit tests covering: shouldRunOnboarding true/false paths (no auth, api_key persisted, ANTHROPIC_API_KEY env var, ANTHROPIC_OAUTH_TOKEN env var, both sources), AuthStorage singleton caching/reset, and ModelRegistry/SettingsManager instance construction.

## Verification

- `npx vitest run src/__tests__/auth.test.ts` — 10/10 tests pass
- `npx vitest run src/__tests__/cli.test.ts` — 12/12 existing CLI tests pass (backward compat)
- `npm run build` — builds cleanly with auth module
- `node dist/cli.js --help` — shows all commands including task argument
- `grep -q "@clack/prompts" package.json` — dependency present
- `grep -q "@clack/prompts" tsup.config.ts` — externalized

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` | 0 | ✅ pass | 0.5s |
| 2 | `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` | 0 | ✅ pass | 4.2s |
| 3 | `cd packages/cli && npm run build` | 0 | ✅ pass | 0.1s |
| 4 | `node packages/cli/dist/cli.js --help` | 0 | ✅ pass | 0.3s |
| 5 | `grep -q "@clack/prompts" packages/cli/package.json` | 0 | ✅ pass | 0.0s |
| 6 | `grep -q "@clack/prompts" packages/cli/tsup.config.ts` | 0 | ✅ pass | 0.0s |

## Diagnostics

- **shouldRunOnboarding inspection:** Call with `AuthStorage.inMemory({})` to test in isolation. Returns boolean — no side effects.
- **Auth file:** Check `~/.stupid/auth.json` existence and contents to verify credential persistence after onboarding (T02).
- **Env var fallback:** Set `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` to bypass onboarding — `shouldRunOnboarding()` returns false.
- **Singleton reset:** Call `resetAuthStorage()` in tests to prevent cross-test leakage.

## Deviations

- **shouldRunOnboarding parameter injection:** Plan suggested either (a) accept optional `authStorage` param or (b) export separate `shouldRunOnboardingWith()`. Chose (a) — cleaner API, single function with optional DI for tests, default to singleton for production.
- **Built packages/core in worktree:** The `--help` runtime check required `@serhatsayat/stupid-core` dist to exist. Built it in the worktree to make the verification pass. This is a pre-existing worktree setup gap, not caused by T01 changes.

## Known Issues

- None.

## Files Created/Modified

- `packages/cli/src/auth.ts` — new auth composition root with getAuthStorage, getModelRegistry, getSettingsManager, shouldRunOnboarding, resetAuthStorage
- `packages/cli/src/__tests__/auth.test.ts` — 10 unit tests covering shouldRunOnboarding logic and auth bootstrap instances
- `packages/cli/package.json` — added @clack/prompts ^0.9.0 dependency
- `packages/cli/tsup.config.ts` — added @clack/prompts to external array
