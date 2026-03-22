# S01: Provider Error Handling & Retry

**Goal:** BaseAgent can retry on Anthropic rate_limit/overloaded/server_error with exponential backoff. Error classification produces typed `ProviderError` objects usable by downstream slices (S03 routing history, S06 integration).
**Demo:** Unit tests prove: transient errors (rate_limit, overloaded, server_error, network_error, timeout) are retried with exponential backoff + jitter; permanent errors (auth_error, invalid_request, permission_denied) abort immediately; retry ceiling is enforced; `classifyError()` correctly maps error message patterns to `ProviderErrorType` enum values.

## Must-Haves

- `ProviderErrorType` enum with all 9 error types (rate_limit, overloaded, server_error, auth_error, invalid_request, permission_denied, context_overflow, network_error, timeout, unknown)
- `ProviderError` type with `errorType`, `retryable`, `retryAfterMs`, `originalMessage` fields
- `classifyError(err: unknown): ProviderError` function using regex pattern matching on error messages
- `RetryableSession` class wrapping a `session.prompt()` call with configurable exponential backoff + jitter
- `RetryConfig` type with `maxRetries`, `baseDelayMs`, `maxDelayMs`, `jitterFactor`
- Unit tests covering all error types, retry behavior, backoff timing, ceiling enforcement, and permanent-error abort
- All new types and classes exported from `packages/core/src/index.ts`

## Proof Level

- This slice proves: contract (error classification + retry logic, all mock-tested)
- Real runtime required: no (mocked session — real API exercised in S06)
- Human/UAT required: no

## Verification

- `cd packages/core && npx vitest run src/__tests__/provider-retry.test.ts` — all tests pass
- `cd packages/core && npx tsc --noEmit` — no type errors
- `node -e "import('@stupid/core').then(m => { console.log(typeof m.RetryableSession, typeof m.classifyError) })"` — prints "function function"

## Observability / Diagnostics

- Runtime signals: `RetryableSession` accepts an optional `onRetry(attempt, error, delayMs)` callback for retry observability
- Failure visibility: `ProviderError` carries `errorType`, `retryable`, `retryAfterMs`, and `originalMessage` — downstream consumers (S03 routing history) use these to record outcomes

## Integration Closure

- Upstream surfaces consumed: none (first slice in M002)
- New wiring introduced in this slice: none — `RetryableSession` is built and tested in isolation; wiring into `BaseAgent` happens in S06
- What remains before the milestone is truly usable end-to-end: S02 (file selector), S03 (complexity routing), S04 (worktree), S05 (doctor), S06 (integration assembly)

## Tasks

- [ ] **T01: Implement ProviderError types, classifyError, and RetryableSession** `est:45m`
  - Why: Creates the core error classification and retry logic that R027 requires. Everything downstream (S03 routing history, S06 integration) depends on these types and this module existing.
  - Files: `packages/core/src/types/index.ts`, `packages/core/src/infrastructure/provider-retry.ts`
  - Do: Add `ProviderErrorType` enum and `ProviderError`/`RetryConfig` types to types/index.ts. Create provider-retry.ts with `classifyError()` (regex-based error message classification matching Anthropic error patterns) and `RetryableSession` class (wraps session.prompt() with exponential backoff, jitter, retry-after support, onRetry callback). Use `delay = min(baseDelay × 2^attempt + jitter, maxDelay)` formula. Default config: maxRetries=3, baseDelayMs=1000, maxDelayMs=60000, jitterFactor=0.1.
  - Verify: `cd packages/core && npx tsc --noEmit` — no type errors
  - Done when: `provider-retry.ts` exports `classifyError` and `RetryableSession`, types compile cleanly, and error classification covers all 10 Anthropic error types

- [ ] **T02: Add unit tests and wire exports** `est:45m`
  - Why: Proves R027 works — every error type classified correctly, retry logic honors backoff timing and ceiling, permanent errors abort immediately. Wires exports so downstream slices can import.
  - Files: `packages/core/src/__tests__/provider-retry.test.ts`, `packages/core/src/index.ts`
  - Do: Write vitest tests following the mock pattern from base-agent.test.ts (vi.mock Pi SDK, mock session.prompt to throw errors). Test all 10 error classifications, retry-on-transient, abort-on-permanent, backoff timing with fake timers, maxRetries ceiling, jitter bounds, retryAfterMs respect, onRetry callback invocation. Add exports to index.ts: `RetryableSession`, `classifyError`, `ProviderErrorType` enum, `ProviderError` type, `RetryConfig` type.
  - Verify: `cd packages/core && npx vitest run src/__tests__/provider-retry.test.ts` — all tests pass
  - Done when: 12+ test cases pass covering error classification, retry, backoff, ceiling, permanent-error abort, and callback; all new symbols importable from `@stupid/core`

## Files Likely Touched

- `packages/core/src/types/index.ts`
- `packages/core/src/infrastructure/provider-retry.ts`
- `packages/core/src/__tests__/provider-retry.test.ts`
- `packages/core/src/index.ts`
