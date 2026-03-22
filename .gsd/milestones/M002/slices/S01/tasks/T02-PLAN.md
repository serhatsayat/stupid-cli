---
estimated_steps: 4
estimated_files: 2
skills_used:
  - test
---

# T02: Add unit tests and wire exports

**Slice:** S01 — Provider Error Handling & Retry
**Milestone:** M002

## Description

Write comprehensive vitest unit tests for `classifyError()` and `RetryableSession`, then wire all new symbols into the package barrel export (`index.ts`). Tests use `vi.useFakeTimers()` for deterministic backoff verification and mock `session.prompt()` to throw specific error messages. This task proves R027 (provider error handling and retry) is satisfied.

## Steps

1. **Create `packages/core/src/__tests__/provider-retry.test.ts`:**
   - Import `classifyError`, `RetryableSession`, `DEFAULT_RETRY_CONFIG` from `../infrastructure/provider-retry.js`
   - Import `ProviderErrorType` from `../types/index.js`
   - Use `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach` for deterministic timing

   **Error classification tests** (one `describe("classifyError")` block):
   - `classifies "429 Too Many Requests" as rate_limit (retryable)`
   - `classifies "rate limit exceeded" as rate_limit (retryable)`
   - `classifies "overloaded" as overloaded (retryable)`
   - `classifies "529" as overloaded (retryable)`
   - `classifies "Internal Server Error" as server_error (retryable)`
   - `classifies "502 Bad Gateway" as server_error (retryable)`
   - `classifies "503 Service Unavailable" as server_error (retryable)`
   - `classifies "Authentication failed" as auth_error (NOT retryable)`
   - `classifies "401 Unauthorized" as auth_error (NOT retryable)`
   - `classifies "invalid api key" as auth_error (NOT retryable)`
   - `classifies "Bad Request" as invalid_request (NOT retryable)`
   - `classifies "Permission denied" as permission_denied (NOT retryable)`
   - `classifies "403 Forbidden" as permission_denied (NOT retryable)`
   - `classifies "context length exceeded" as context_overflow (NOT retryable)`
   - `classifies "token limit" as context_overflow (NOT retryable)`
   - `classifies "network error" as network_error (retryable)`
   - `classifies "connection refused" as network_error (retryable)`
   - `classifies "fetch failed" as network_error (retryable)`
   - `classifies "request timed out" as timeout (retryable)`
   - `classifies "timeout" as timeout (retryable)`
   - `classifies unrecognized error as unknown (NOT retryable)`
   - `extracts retryAfterMs from "retry delay: 34s"` — expects `retryAfterMs: 34000`
   - `extracts retryAfterMs from "Please retry in 30s"` — expects `retryAfterMs: 30000`
   - `handles non-Error inputs (string, null, undefined)`
   - `preserves originalMessage from Error.message`

   **RetryableSession tests** (one `describe("RetryableSession")` block):
   - Create a mock session: `{ prompt: vi.fn() }`
   - `returns success on first attempt when prompt succeeds` — prompt resolves, result has `success: true, attempts: 1`
   - `retries on transient error and succeeds on 2nd attempt` — prompt throws "429" once then resolves, result has `success: true, attempts: 2`
   - `retries up to maxRetries then fails` — prompt always throws "overloaded", config `{ maxRetries: 2 }`, result has `success: false, attempts: 3, error.errorType: overloaded`
   - `does NOT retry on permanent error (auth)` — prompt throws "401 Unauthorized", result has `success: false, attempts: 1, error.errorType: auth_error`
   - `does NOT retry on permanent error (invalid_request)` — prompt throws "Bad Request", result has `success: false, attempts: 1`
   - `uses exponential backoff timing` — use `vi.useFakeTimers()`, mock prompt to throw "429" 3 times. After each throw, check `setTimeout` was called with expected delays: ~1000ms, ~2000ms, ~4000ms (with jitter). Advance timers accordingly. Use `vi.advanceTimersByTimeAsync()`.
   - `respects maxDelayMs ceiling` — config `{ maxRetries: 10, baseDelayMs: 1000, maxDelayMs: 5000 }`, verify delay never exceeds 5000ms
   - `respects retryAfterMs from error` — prompt throws error with "retry delay: 10s", verify delay is at least 10000ms
   - `calls onRetry callback on each retry` — provide onRetry spy, verify called with (attempt, providerError, delayMs) on each retry
   - `handles zero maxRetries (no retry)` — config `{ maxRetries: 0 }`, prompt throws "429", result has `success: false, attempts: 1`
   - `adds jitter within expected bounds` — verify delay includes jitter component between 0 and `baseDelayMs × jitterFactor`

2. **Add exports to `packages/core/src/index.ts`:**
   - In the `// ─── Types ───` section, add to the type export block: `ProviderErrorType` (enum, value export), `ProviderError` (type), `RetryConfig` (type)
   - In the `// ─── Infrastructure ───` section, add: `RetryableSession`, `classifyError`, `DEFAULT_RETRY_CONFIG` from `./infrastructure/provider-retry.js`

3. **Run full test suite:** `cd packages/core && npx vitest run src/__tests__/provider-retry.test.ts` — all tests pass.

4. **Verify exports work:** `cd packages/core && npx tsc --noEmit` — clean compile including new exports.

## Must-Haves

- [ ] All 10 error type classifications tested with at least one error message pattern each
- [ ] Retry-on-transient test passes (prompt fails then succeeds)
- [ ] Abort-on-permanent test passes (auth_error, invalid_request abort immediately)
- [ ] maxRetries ceiling test passes (exhaustion returns failure)
- [ ] Exponential backoff timing verified with fake timers
- [ ] onRetry callback invoked correctly
- [ ] All new symbols exported from `packages/core/src/index.ts`

## Verification

- `cd packages/core && npx vitest run src/__tests__/provider-retry.test.ts` — all tests pass, 12+ test cases
- `cd packages/core && npx tsc --noEmit` — exits 0
- `grep -q "RetryableSession" packages/core/src/index.ts && grep -q "classifyError" packages/core/src/index.ts && grep -q "ProviderErrorType" packages/core/src/index.ts && echo "exports ok"` — prints "exports ok"

## Inputs

- `packages/core/src/infrastructure/provider-retry.ts` — the module to test (created by T01)
- `packages/core/src/types/index.ts` — types to import in tests (extended by T01)
- `packages/core/src/__tests__/base-agent.test.ts` — reference for vitest mock patterns and test structure
- `packages/core/src/index.ts` — barrel export file to extend

## Expected Output

- `packages/core/src/__tests__/provider-retry.test.ts` — comprehensive test file with 12+ test cases
- `packages/core/src/index.ts` — updated with all new exports
