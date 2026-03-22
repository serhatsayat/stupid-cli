---
id: S01
parent: M003
milestone: M003
provides:
  - auth.ts composition root with AuthStorage at ~/.stupid/auth.json
  - shouldRunOnboarding gate checking persisted creds + env vars
  - onboarding wizard with OAuth browser login and API key paste flows
  - CLI entry point wired to trigger onboarding on no-arg TTY invocation
requires: []
affects:
  - S02
  - S03
key_files:
  - packages/cli/src/auth.ts
  - packages/cli/src/onboarding.ts
  - packages/cli/src/cli.ts
  - packages/cli/src/__tests__/auth.test.ts
key_decisions:
  - shouldRunOnboarding accepts optional authStorage parameter for testability (DI over mocking)
  - Used child_process.exec for browser opening instead of open npm package
  - Dynamic imports for auth.js and onboarding.js in cli.ts to keep fast path lean
patterns_established:
  - Auth module uses lazy singleton pattern with resetAuthStorage() for test isolation
  - Onboarding wizard uses throw/catch with "cancelled" for user cancellation propagation
  - Tests save/restore env vars in beforeEach/afterEach for credential env vars
observability_surfaces:
  - ~/.stupid/auth.json appears after successful onboarding with persisted credentials
  - shouldRunOnboarding returns boolean from persisted creds + env var presence
  - Non-TTY invocations silently show help instead of wizard
drill_down_paths:
  - .gsd/milestones/M003/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T02-SUMMARY.md
duration: 20m
verification_result: passed
completed_at: 2026-03-22
---

# S01: Auth storage and onboarding wizard

**Added Pi SDK AuthStorage bootstrap at ~/.stupid/auth.json with interactive onboarding wizard (OAuth + API key paste) wired into CLI no-arg path — 14 auth tests passing**

## What Happened

T01 created `auth.ts` as the authentication composition root — lazy singleton `AuthStorage` pointed at `~/.stupid/auth.json`, factory functions for `ModelRegistry` and `SettingsManager`, and a `shouldRunOnboarding()` gate that checks both persisted credentials and env vars (`ANTHROPIC_API_KEY`, `ANTHROPIC_OAUTH_TOKEN`). Added `@clack/prompts` dependency and 10 unit tests.

T02 built `onboarding.ts` — an interactive wizard using `@clack/prompts` offering OAuth providers from `authStorage.getOAuthProviders()` plus manual API key paste. Modified `cli.ts` to dynamically import and call `shouldRunOnboarding()` when no task argument is provided, with a TTY guard. Added 4 integration tests. Total: 14 auth tests, all passing.

## Verification

- 14/14 auth tests pass (shouldRunOnboarding logic + onboarding integration)
- 12/12 CLI tests pass (backward compatibility)
- 4/4 smoke tests pass (no-args behavior unchanged in non-TTY)
- Build clean, --help output unchanged

## Deviations

- Used `child_process.exec` for browser opening instead of `import('open')` — avoids unnecessary dependency.
- Added `onManualCodeInput` callback not in plan — required by `OAuthLoginCallbacks` interface.

## Known Limitations

- Onboarding wizard requires TTY — CI/piped contexts get help text instead.

## Follow-ups

None.

## Files Created/Modified

- `packages/cli/src/auth.ts` — auth composition root with AuthStorage, ModelRegistry, SettingsManager, shouldRunOnboarding
- `packages/cli/src/onboarding.ts` — interactive onboarding wizard with OAuth and API key flows
- `packages/cli/src/cli.ts` — wired onboarding into no-arg path with TTY guard
- `packages/cli/src/__tests__/auth.test.ts` — 14 tests for auth and onboarding
- `packages/cli/package.json` — added @clack/prompts dependency
- `packages/cli/tsup.config.ts` — externalized @clack/prompts

## Forward Intelligence

### What the next slice should know
- `shouldRunOnboarding()` and `getAuthStorage()` are the public API from auth.ts — import from `../auth.js`
- Dynamic import pattern in cli.ts action handlers keeps startup fast

### What's fragile
- Session directory path encoding replicates Pi SDK internal logic — if SDK changes encoding, both interactive.ts and sessions.ts break

### Authoritative diagnostics
- `~/.stupid/auth.json` existence confirms onboarding completed
- `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` env var bypasses onboarding entirely
