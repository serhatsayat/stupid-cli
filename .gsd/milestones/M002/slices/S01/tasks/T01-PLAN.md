---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T01: Implement ProviderError types, classifyError, and RetryableSession

**Slice:** S01 — Provider Error Handling & Retry
**Milestone:** M002

## Description

Create the error classification and retry infrastructure for Anthropic provider errors. This adds `ProviderErrorType` enum, `ProviderError` type, and `RetryConfig` type to the shared types module, then implements `classifyError()` and `RetryableSession` in a new infrastructure module.

`classifyError()` uses regex pattern matching on error message strings (same approach Pi SDK uses internally) to classify errors into 10 types. `RetryableSession` wraps an existing `session.prompt()` call with exponential backoff + jitter, retrying only on transient errors.

The retry formula is: `delay = min(baseDelayMs × 2^attempt + randomJitter, maxDelayMs)` where jitter is `baseDelayMs × jitterFactor × Math.random()`. If a `retryAfterMs` hint is parsed from the error, use `max(calculatedDelay, retryAfterMs)`.

## Steps

1. **Add types to `packages/core/src/types/index.ts`:**
   - Add `ProviderErrorType` enum with values: `rate_limit`, `overloaded`, `server_error`, `auth_error`, `invalid_request`, `permission_denied`, `context_overflow`, `network_error`, `timeout`, `unknown`
   - Add `ProviderError` interface: `{ errorType: ProviderErrorType; retryable: boolean; retryAfterMs?: number; originalMessage: string }`
   - Add `RetryConfig` interface: `{ maxRetries: number; baseDelayMs: number; maxDelayMs: number; jitterFactor: number }`
   - Place these in a new `// ─── Provider Error Types ─────` section after the existing `SessionState` interface

2. **Create `packages/core/src/infrastructure/provider-retry.ts`:**
   - Import `ProviderError`, `ProviderErrorType`, `RetryConfig` from `../types/index.js`
   - Export `DEFAULT_RETRY_CONFIG: RetryConfig` with `{ maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 60000, jitterFactor: 0.1 }`
   - Export `classifyError(err: unknown): ProviderError` function:
     - Extract error message string from Error objects or string coercion
     - Match against patterns (case-insensitive regex):
       - rate_limit: `/rate.?limit|too many requests|429/i` → retryable
       - overloaded: `/overloaded|529/i` → retryable
       - server_error: `/internal.?server|server.?error|500|502|503|504|service.?unavailable/i` → retryable
       - auth_error: `/authentication|unauthorized|401|invalid.?api.?key/i` → NOT retryable
       - invalid_request: `/bad.?request|invalid.?request|400/i` → NOT retryable
       - permission_denied: `/permission.?denied|forbidden|403/i` → NOT retryable
       - context_overflow: `/context.?length|too.?long|token.?limit|context.?window/i` → NOT retryable
       - network_error: `/network.?error|connection.?error|connection.?refused|fetch.?failed|socket.?hang/i` → retryable
       - timeout: `/timed?.?out|timeout/i` → retryable
       - unknown: fallback → NOT retryable (conservative)
     - Parse `retryAfterMs` from patterns like "retry delay: 34s" or "retry in 30s" or "Retry-After: 30"
   - Export `RetryableSession` class:
     - Constructor: `(session: { prompt: (input: string) => Promise<void> }, config?: Partial<RetryConfig>, onRetry?: (attempt: number, error: ProviderError, delayMs: number) => void)`
     - Merge user config with `DEFAULT_RETRY_CONFIG`
     - Method `prompt(input: string): Promise<{ success: boolean; error?: ProviderError; attempts: number }>`
     - Loop: try `session.prompt(input)`, on error → `classifyError(err)` → if retryable and attempts < maxRetries → compute delay → call `onRetry` → `await sleep(delay)` → continue
     - Return `{ success: true, attempts }` on success, `{ success: false, error, attempts }` on exhaustion or permanent error
   - Private `calculateDelay(attempt: number, retryAfterMs?: number): number` method implementing the backoff formula
   - Private `sleep(ms: number): Promise<void>` utility

3. **Verify types compile:** Run `cd packages/core && npx tsc --noEmit` and fix any type errors.

## Must-Haves

- [ ] `ProviderErrorType` enum has all 10 values
- [ ] `ProviderError` interface has `errorType`, `retryable`, `retryAfterMs`, `originalMessage`
- [ ] `RetryConfig` interface has `maxRetries`, `baseDelayMs`, `maxDelayMs`, `jitterFactor`
- [ ] `classifyError()` correctly classifies all 10 error types from string patterns
- [ ] `RetryableSession.prompt()` retries on retryable errors with exponential backoff
- [ ] `RetryableSession.prompt()` aborts immediately on non-retryable errors
- [ ] `DEFAULT_RETRY_CONFIG` exported with sensible defaults (3 retries, 1s base, 60s max, 0.1 jitter)

## Verification

- `cd packages/core && npx tsc --noEmit` — exits 0 with no type errors
- `grep -c "ProviderErrorType\|ProviderError\|RetryConfig" packages/core/src/types/index.ts` — returns 3+
- `grep -c "classifyError\|RetryableSession\|DEFAULT_RETRY_CONFIG" packages/core/src/infrastructure/provider-retry.ts` — returns 3+

## Inputs

- `packages/core/src/types/index.ts` — existing types file to extend with provider error types
- `packages/core/src/infrastructure/activity-logger.ts` — reference for infrastructure module patterns

## Expected Output

- `packages/core/src/types/index.ts` — extended with `ProviderErrorType`, `ProviderError`, `RetryConfig`
- `packages/core/src/infrastructure/provider-retry.ts` — new file with `classifyError()`, `RetryableSession`, `DEFAULT_RETRY_CONFIG`

## Observability Impact

- **New signals:** `RetryableSession` accepts an `onRetry(attempt, error, delayMs)` callback — callers can observe every retry attempt, the classified error, and the calculated delay without coupling to a logging framework.
- **Typed errors:** `ProviderError` objects carry `errorType`, `retryable`, `retryAfterMs`, and `originalMessage` — downstream consumers (S03 routing history, S06 integration) use these structured fields to record outcomes and make routing decisions.
- **Inspection:** A future agent can verify this task by running `npx vitest run src/__tests__/provider-retry.test.ts` (33 tests) and confirming `classifyError()` returns the correct `ProviderErrorType` for any error message string.
- **Failure visibility:** Non-retryable errors surface immediately as `{ success: false, error }` without silent retry loops. Retry exhaustion returns the final classified error with attempt count.
