---
id: T02
parent: S01
milestone: M003
provides:
  - onboarding.ts wizard with OAuth and API key flows using @clack/prompts
  - cli.ts wired to trigger onboarding when no task arg and no auth configured
  - 4 new integration tests (onboarding module + CLI backward compat)
key_files:
  - packages/cli/src/onboarding.ts
  - packages/cli/src/cli.ts
  - packages/cli/src/__tests__/auth.test.ts
key_decisions:
  - Used child_process.exec for browser opening instead of `open` npm package — avoids adding a dependency for a one-liner that works cross-platform
  - Dynamic imports for auth.js and onboarding.js in cli.ts to keep `stupid "task"` fast path free of auth module loading
patterns_established:
  - Onboarding wizard uses throw/catch with "cancelled" message for user cancellation propagation from nested prompts
  - OAuth callbacks delegate to @clack/prompts text/log methods — single UI library for all interactive output
observability_surfaces:
  - Onboarding wizard prints intro/outro and step-by-step progress via @clack/prompts
  - OAuth flow logs progress via onProgress callback (never logs tokens)
  - API key flow logs only provider name after save — never the key value
  - ~/.stupid/auth.json appears after successful onboarding with persisted credentials
duration: 8m
verification_result: passed
completed_at: 2026-03-22
blocker_discovered: false
---

# T02: Build onboarding wizard and wire into CLI entry point

**Added interactive onboarding wizard with OAuth browser login and API key paste flows, wired into CLI no-arg path with TTY guard and 14 passing tests**

## What Happened

Created `packages/cli/src/onboarding.ts` exporting `runOnboardingWizard()` — an interactive first-run wizard using `@clack/prompts`. The wizard offers all OAuth providers from `authStorage.getOAuthProviders()` (Anthropic, GitHub Copilot, Google, etc.) plus a manual "Paste an API key" option. OAuth flow calls `authStorage.login()` with callbacks that open the browser, prompt for input, display progress, and handle manual code input. API key flow prompts for provider selection (anthropic/openai/google) and key paste, then persists via `authStorage.set()`. All errors are caught and displayed; user cancellation is handled gracefully.

Modified `packages/cli/src/cli.ts` to dynamically import and call `shouldRunOnboarding()` when no task argument is provided. If onboarding is needed and `process.stdin.isTTY` is true, the wizard runs; otherwise, help is shown as before. Dynamic imports keep the `stupid "task"` fast path free of auth module overhead.

Added 4 new tests: 2 for the onboarding module (export verification, clean import), 2 for CLI backward compatibility after the wiring change (--help shows all commands, --version still works). Total test count: 14 in auth.test.ts, 12 in cli.test.ts, 4 in smoke.test.ts — all passing.

## Verification

- Built cleanly with `npm run build` — tsup bundles onboarding as a separate chunk
- `--help` output unchanged — all 7 commands and options present
- Auth tests: 14/14 pass (10 original shouldRunOnboarding + 4 new integration)
- CLI tests: 12/12 pass (all argument parsing tests unchanged)
- Smoke tests: 4/4 pass (including no-args behavior — TTY guard prevents wizard in non-TTY)
- Grep checks: `shouldRunOnboarding` in cli.ts, `runOnboardingWizard` in onboarding.ts

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd packages/cli && npm run build` | 0 | ✅ pass | 0.1s |
| 2 | `node packages/cli/dist/cli.js --help` | 0 | ✅ pass | 0.3s |
| 3 | `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` | 0 | ✅ pass | 1.3s |
| 4 | `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` | 0 | ✅ pass | 4.6s |
| 5 | `cd packages/cli && npx vitest run src/__tests__/smoke.test.ts` | 0 | ✅ pass | 1.8s |
| 6 | `grep -q "shouldRunOnboarding" packages/cli/src/cli.ts` | 0 | ✅ pass | 0.0s |
| 7 | `grep -q "runOnboardingWizard" packages/cli/src/onboarding.ts` | 0 | ✅ pass | 0.0s |
| 8 | `npx vitest run src/__tests__/auth.test.ts --reporter=verbose \| grep -c "✓"` → 14 | 0 | ✅ pass | 1.3s |

## Diagnostics

- **Onboarding trigger inspection:** Run `stupid` with no args in a TTY with no `ANTHROPIC_API_KEY`/`ANTHROPIC_OAUTH_TOKEN` env vars and no `~/.stupid/auth.json` — the wizard should appear.
- **Bypass onboarding:** Set `ANTHROPIC_API_KEY=anything` or create `~/.stupid/auth.json` with credentials to skip the wizard.
- **Non-TTY guard:** Piped or CI contexts (`echo | stupid`) silently show `--help` instead of the wizard.
- **Credential persistence:** After completing the wizard, `~/.stupid/auth.json` contains the saved credential. Inspect with `cat ~/.stupid/auth.json` (keys will be visible in the file — this is by design for the auth storage).
- **OAuth progress:** During OAuth login, step-by-step messages appear via `p.log.step()` — look for "Starting OAuth login for..." and provider-specific progress messages.

## Deviations

- **Browser opening:** Plan suggested `import('open')` with fallback to `exec`. Used `exec` only since the `open` npm package isn't installed and `child_process.exec` with platform-specific commands (open/start/xdg-open) works without an extra dependency.
- **`onManualCodeInput` callback:** Added this callback (not in plan) because the `OAuthLoginCallbacks` interface includes it and some providers (those with `usesCallbackServer: true`) may need it for manual auth code entry.

## Known Issues

- None.

## Files Created/Modified

- `packages/cli/src/onboarding.ts` — new onboarding wizard with OAuth and API key flows using @clack/prompts
- `packages/cli/src/cli.ts` — wired shouldRunOnboarding + runOnboardingWizard into no-arg action with TTY guard
- `packages/cli/src/__tests__/auth.test.ts` — added 4 integration tests for onboarding module and CLI backward compat
- `.gsd/milestones/M003/slices/S01/tasks/T02-PLAN.md` — added Observability Impact section per pre-flight requirement
