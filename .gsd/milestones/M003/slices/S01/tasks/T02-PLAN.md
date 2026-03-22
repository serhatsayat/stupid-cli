---
estimated_steps: 4
estimated_files: 4
skills_used:
  - test
---

# T02: Build onboarding wizard and wire into CLI entry point

**Slice:** S01 — Auth storage and onboarding wizard
**Milestone:** M003

## Description

Create the interactive onboarding wizard that guides first-time users through provider selection and authentication (OAuth browser login or API key paste). Wire it into `cli.ts` so running `stupid` with no arguments triggers onboarding when no auth is configured. Ensure backward compatibility — `stupid "task"` with env-var auth must continue working unchanged.

## Steps

1. **Create `packages/cli/src/onboarding.ts`**: Export `runOnboardingWizard()` function using `@clack/prompts`:

   ```
   import * as p from '@clack/prompts';
   import { getAuthStorage } from './auth.js';
   ```

   Flow:
   - `p.intro('Welcome to stupid — let\'s set up authentication')` 
   - Get OAuth providers: `const oauthProviders = authStorage.getOAuthProviders()` — returns array of `{ id, name }`.
   - Build select options: map each OAuth provider to `{ value: provider.id, label: provider.name }`, plus a final `{ value: 'api_key', label: 'Paste an API key' }` option.
   - `const provider = await p.select({ message: 'Choose an auth provider', options })`.
   - If user cancels (`p.isCancel(provider)`), call `p.cancel('Setup cancelled')` and return.
   - **If OAuth provider selected**: call `authStorage.login(provider, callbacks)` where callbacks are:
     - `onAuth: ({ url }) => { p.log.info('Opening browser...'); open(url); }` — use dynamic `import('open')` or `child_process.exec('open "url"')` to open the browser.
     - `onPrompt: async ({ message, placeholder }) => { const val = await p.text({ message, placeholder }); if (p.isCancel(val)) throw new Error('cancelled'); return val; }`
     - `onProgress: (msg) => p.log.step(msg)`
   - **If 'api_key' selected**: prompt for provider name with `p.select` (list common providers: anthropic, openai, google), then `p.text({ message: 'Paste your API key', placeholder: 'sk-...' })`, then `authStorage.set(providerName, { type: 'api_key', key })`.
   - `p.outro('Authentication configured! Run stupid "your task" to get started.')`.
   - Wrap the entire flow in try/catch — on error, `p.log.error(error.message)`.

   **Important constraints:**
   - Only run in TTY context — the caller in cli.ts checks `process.stdin.isTTY`.
   - Never log/echo the actual API key value — only the provider name.
   - Import `AuthStorage` type from `@mariozechner/pi-coding-agent` for type annotations.
   - Use `.js` extensions on all local imports (ESM).
   - For opening the browser URL during OAuth, use `import('open')` (dynamic import) with a fallback to `exec('open "${url}"')` on macOS, or just print the URL for the user to copy.

2. **Modify `packages/cli/src/cli.ts`**: Update the default action (when no task arg):

   ```typescript
   .action(async (task: string | undefined, opts) => {
     if (!task) {
       // Check if onboarding needed
       const { shouldRunOnboarding } = await import('./auth.js');
       if (shouldRunOnboarding() && process.stdin.isTTY) {
         const { runOnboardingWizard } = await import('./onboarding.js');
         await runOnboardingWizard();
         return;
       }
       program.help();
       return;
     }
     await runCommand(task, opts);
   });
   ```

   Use dynamic imports to avoid loading auth/onboarding modules when not needed (keeps `stupid "task"` fast). The `process.stdin.isTTY` guard prevents onboarding from running in piped/CI contexts.

3. **Add integration-level tests to `packages/cli/src/__tests__/auth.test.ts`**: Add a new describe block:
   - Test that `runOnboardingWizard` is an exported async function from `onboarding.ts`.
   - Test that the `onboarding.ts` module imports without errors.
   - Test that `cli.ts` still produces valid help output after modification (use `execSync('node dist/cli.js --help')` after rebuilding).

4. **Build and verify**: Run `cd packages/cli && npm run build` to confirm tsup bundles cleanly. Then run existing CLI tests: `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` and `cd packages/cli && npx vitest run src/__tests__/smoke.test.ts` to confirm backward compat.

## Must-Haves

- [ ] `packages/cli/src/onboarding.ts` exports `runOnboardingWizard()` using @clack/prompts
- [ ] Wizard offers OAuth providers from `authStorage.getOAuthProviders()` plus API key paste option
- [ ] OAuth flow calls `authStorage.login()` with proper callbacks (browser open, prompts, progress)
- [ ] API key flow persists credential via `authStorage.set(provider, { type: 'api_key', key })`
- [ ] `cli.ts` default action calls `shouldRunOnboarding()` when no task arg, runs wizard if TTY
- [ ] `stupid "task"` with env-var auth still works (no changes to run.ts or context.ts)
- [ ] `stupid --help` output unchanged

## Verification

- `cd packages/cli && npm run build` — builds without errors
- `node packages/cli/dist/cli.js --help` — shows all commands and options
- `cd packages/cli && npx vitest run src/__tests__/auth.test.ts` — all auth tests pass
- `cd packages/cli && npx vitest run src/__tests__/cli.test.ts` — existing CLI tests pass
- `grep -q "shouldRunOnboarding" packages/cli/src/cli.ts` — onboarding check wired in
- `grep -q "runOnboardingWizard" packages/cli/src/onboarding.ts` — wizard function exists

## Inputs

- `packages/cli/src/auth.ts` — auth module with `shouldRunOnboarding()` and `getAuthStorage()` from T01
- `packages/cli/src/cli.ts` — existing CLI entry point to modify
- `packages/cli/src/__tests__/auth.test.ts` — existing test file to extend
- `packages/cli/tsup.config.ts` — bundler config (already has @clack/prompts externalized from T01)

## Expected Output

- `packages/cli/src/onboarding.ts` — new onboarding wizard module
- `packages/cli/src/cli.ts` — updated with onboarding check in default action
- `packages/cli/src/__tests__/auth.test.ts` — extended with onboarding integration tests

## Observability Impact

- **New runtime signals:** Onboarding wizard prints step-by-step progress via `@clack/prompts` (intro, provider selection, OAuth progress, API key save confirmation, outro). OAuth flow emits progress messages via `onProgress` callback.
- **Inspection surfaces:** `~/.stupid/auth.json` file appears after successful onboarding with persisted credentials. Running `stupid` with no args and no auth triggers the wizard (observable in TTY).
- **Failure visibility:** Errors during onboarding are caught and displayed via `p.log.error()`. User cancellation is handled gracefully via `p.cancel()`. Non-TTY contexts silently skip to `--help`.
- **Redaction:** API keys are never logged — only provider names appear in wizard output.
