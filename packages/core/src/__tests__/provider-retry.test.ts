import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyError,
  RetryableSession,
  DEFAULT_RETRY_CONFIG,
} from "../infrastructure/provider-retry.js";
import { ProviderErrorType } from "../types/index.js";
import type { ProviderError, RetryConfig } from "../types/index.js";

// ─── classifyError ───────────────────────────────────────────

describe("classifyError", () => {
  const cases: Array<{
    label: string;
    input: unknown;
    expectedType: ProviderErrorType;
    retryable: boolean;
  }> = [
    // Transient (retryable)
    {
      label: "rate_limit from message",
      input: new Error("rate limit exceeded"),
      expectedType: ProviderErrorType.RateLimit,
      retryable: true,
    },
    {
      label: "rate_limit from 429",
      input: new Error("HTTP 429 Too Many Requests"),
      expectedType: ProviderErrorType.RateLimit,
      retryable: true,
    },
    {
      label: "overloaded",
      input: new Error("API is overloaded"),
      expectedType: ProviderErrorType.Overloaded,
      retryable: true,
    },
    {
      label: "overloaded from 529",
      input: new Error("529 service overloaded"),
      expectedType: ProviderErrorType.Overloaded,
      retryable: true,
    },
    {
      label: "server_error from 500",
      input: new Error("internal server error"),
      expectedType: ProviderErrorType.ServerError,
      retryable: true,
    },
    {
      label: "server_error from 503",
      input: new Error("503 service unavailable"),
      expectedType: ProviderErrorType.ServerError,
      retryable: true,
    },
    {
      label: "network_error",
      input: new Error("fetch failed"),
      expectedType: ProviderErrorType.NetworkError,
      retryable: true,
    },
    {
      label: "network_error from connection refused",
      input: new Error("connection refused"),
      expectedType: ProviderErrorType.NetworkError,
      retryable: true,
    },
    {
      label: "timeout",
      input: new Error("request timed out"),
      expectedType: ProviderErrorType.Timeout,
      retryable: true,
    },
    {
      label: "timeout variant",
      input: new Error("Connection timeout after 30s"),
      expectedType: ProviderErrorType.Timeout,
      retryable: true,
    },

    // Permanent (not retryable)
    {
      label: "auth_error",
      input: new Error("authentication failed"),
      expectedType: ProviderErrorType.AuthError,
      retryable: false,
    },
    {
      label: "auth_error from invalid key",
      input: new Error("invalid api key provided"),
      expectedType: ProviderErrorType.AuthError,
      retryable: false,
    },
    {
      label: "invalid_request",
      input: new Error("bad request: missing body"),
      expectedType: ProviderErrorType.InvalidRequest,
      retryable: false,
    },
    {
      label: "permission_denied",
      input: new Error("permission denied for resource"),
      expectedType: ProviderErrorType.PermissionDenied,
      retryable: false,
    },
    {
      label: "permission_denied from 403",
      input: new Error("403 Forbidden"),
      expectedType: ProviderErrorType.PermissionDenied,
      retryable: false,
    },
    {
      label: "context_overflow",
      input: new Error("context length exceeded"),
      expectedType: ProviderErrorType.ContextOverflow,
      retryable: false,
    },
    {
      label: "context_overflow from token limit",
      input: new Error("token limit reached for model"),
      expectedType: ProviderErrorType.ContextOverflow,
      retryable: false,
    },

    // Additional transient patterns
    {
      label: "server_error from 502 Bad Gateway",
      input: new Error("502 Bad Gateway"),
      expectedType: ProviderErrorType.ServerError,
      retryable: true,
    },
    {
      label: "auth_error from 401 Unauthorized",
      input: new Error("401 Unauthorized"),
      expectedType: ProviderErrorType.AuthError,
      retryable: false,
    },
    {
      label: "network_error from 'network error' message",
      input: new Error("network error"),
      expectedType: ProviderErrorType.NetworkError,
      retryable: true,
    },

    // Fallback
    {
      label: "unknown error",
      input: new Error("something totally unexpected"),
      expectedType: ProviderErrorType.Unknown,
      retryable: false,
    },
    {
      label: "non-Error thrown value",
      input: "a plain string error",
      expectedType: ProviderErrorType.Unknown,
      retryable: false,
    },
  ];

  for (const { label, input, expectedType, retryable } of cases) {
    it(`classifies "${label}" → ${expectedType} (retryable=${retryable})`, () => {
      const result = classifyError(input);
      expect(result.errorType).toBe(expectedType);
      expect(result.retryable).toBe(retryable);
      expect(result.originalMessage).toBeTruthy();
    });
  }

  it("parses retryAfterMs from 'retry delay: 34s'", () => {
    const result = classifyError(
      new Error("rate limit hit, retry delay: 34s"),
    );
    expect(result.retryAfterMs).toBe(34_000);
    expect(result.errorType).toBe(ProviderErrorType.RateLimit);
  });

  it("parses retryAfterMs from 'retry in 30s'", () => {
    const result = classifyError(new Error("overloaded, retry in 30s"));
    expect(result.retryAfterMs).toBe(30_000);
  });

  it("parses retryAfterMs from 'Retry-After: 5'", () => {
    const result = classifyError(
      new Error("503 service unavailable, Retry-After: 5"),
    );
    expect(result.retryAfterMs).toBe(5_000);
  });

  it("returns undefined retryAfterMs when no hint present", () => {
    const result = classifyError(new Error("rate limit exceeded"));
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("handles null input", () => {
    const result = classifyError(null);
    expect(result.errorType).toBe(ProviderErrorType.Unknown);
    expect(result.retryable).toBe(false);
    expect(result.originalMessage).toBe("null");
  });

  it("handles undefined input", () => {
    const result = classifyError(undefined);
    expect(result.errorType).toBe(ProviderErrorType.Unknown);
    expect(result.retryable).toBe(false);
    expect(result.originalMessage).toBe("undefined");
  });

  it("preserves originalMessage from Error.message", () => {
    const msg = "rate limit exceeded on model claude-3-opus";
    const result = classifyError(new Error(msg));
    expect(result.originalMessage).toBe(msg);
  });
});

// ─── DEFAULT_RETRY_CONFIG ────────────────────────────────────

describe("DEFAULT_RETRY_CONFIG", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 60000,
      jitterFactor: 0.1,
    });
  });
});

// ─── RetryableSession ────────────────────────────────────────

describe("RetryableSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns success on first attempt when prompt succeeds", async () => {
    const session = { prompt: vi.fn().mockResolvedValue(undefined) };
    const retryable = new RetryableSession(session);

    const result = await retryable.prompt("hello");
    expect(result).toEqual({ success: true, attempts: 1 });
    expect(session.prompt).toHaveBeenCalledOnce();
  });

  it("retries on transient errors then succeeds", async () => {
    const session = {
      prompt: vi
        .fn()
        .mockRejectedValueOnce(new Error("rate limit exceeded"))
        .mockRejectedValueOnce(new Error("overloaded"))
        .mockResolvedValue(undefined),
    };
    const onRetry = vi.fn();
    const retryable = new RetryableSession(
      session,
      { baseDelayMs: 10, maxDelayMs: 1000, jitterFactor: 0 },
      onRetry,
    );

    const promise = retryable.prompt("hello");

    // Advance past first retry delay
    await vi.advanceTimersByTimeAsync(10);
    // Advance past second retry delay (20ms = 10 * 2^1)
    await vi.advanceTimersByTimeAsync(20);

    const result = await promise;
    expect(result).toEqual({ success: true, attempts: 3 });
    expect(session.prompt).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("aborts immediately on non-retryable error", async () => {
    const session = {
      prompt: vi.fn().mockRejectedValue(new Error("authentication failed")),
    };
    const onRetry = vi.fn();
    const retryable = new RetryableSession(session, undefined, onRetry);

    const result = await retryable.prompt("hello");
    expect(result.success).toBe(false);
    expect(result.error?.errorType).toBe(ProviderErrorType.AuthError);
    expect(result.error?.retryable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(session.prompt).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("aborts immediately on invalid_request error", async () => {
    const session = {
      prompt: vi.fn().mockRejectedValue(new Error("Bad Request: missing required field")),
    };
    const onRetry = vi.fn();
    const retryable = new RetryableSession(session, undefined, onRetry);

    const result = await retryable.prompt("hello");
    expect(result.success).toBe(false);
    expect(result.error?.errorType).toBe(ProviderErrorType.InvalidRequest);
    expect(result.error?.retryable).toBe(false);
    expect(result.attempts).toBe(1);
    expect(session.prompt).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("enforces maxRetries ceiling", async () => {
    const session = {
      prompt: vi.fn().mockRejectedValue(new Error("rate limit exceeded")),
    };
    const onRetry = vi.fn();
    const retryable = new RetryableSession(
      session,
      { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 1000, jitterFactor: 0 },
      onRetry,
    );

    const promise = retryable.prompt("hello");

    // Advance past all retry delays
    await vi.advanceTimersByTimeAsync(10);   // attempt 2 delay
    await vi.advanceTimersByTimeAsync(20);   // attempt 3 delay

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error?.errorType).toBe(ProviderErrorType.RateLimit);
    // 1 initial + 2 retries = 3 attempts total
    expect(result.attempts).toBe(3);
    expect(session.prompt).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff delays", async () => {
    const session = {
      prompt: vi.fn().mockRejectedValue(new Error("overloaded")),
    };
    const delays: number[] = [];
    const onRetry = vi.fn((_attempt: number, _error: ProviderError, delayMs: number) => {
      delays.push(delayMs);
    });
    const retryable = new RetryableSession(
      session,
      { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 10000, jitterFactor: 0 },
      onRetry,
    );

    const promise = retryable.prompt("hello");

    // Run through all retries
    await vi.advanceTimersByTimeAsync(100);   // 100 * 2^0 = 100
    await vi.advanceTimersByTimeAsync(200);   // 100 * 2^1 = 200
    await vi.advanceTimersByTimeAsync(400);   // 100 * 2^2 = 400

    await promise;
    expect(delays).toEqual([100, 200, 400]);
  });

  it("caps delay at maxDelayMs", async () => {
    const session = {
      prompt: vi.fn().mockRejectedValue(new Error("server error")),
    };
    const delays: number[] = [];
    const onRetry = vi.fn((_attempt: number, _error: ProviderError, delayMs: number) => {
      delays.push(delayMs);
    });
    const retryable = new RetryableSession(
      session,
      { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 50, jitterFactor: 0 },
      onRetry,
    );

    const promise = retryable.prompt("hello");

    // All delays should be capped at 50ms
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(50);

    await promise;
    // All delays should be capped at maxDelayMs=50
    for (const d of delays) {
      expect(d).toBeLessThanOrEqual(50);
    }
  });

  it("respects retryAfterMs from error as floor", async () => {
    const session = {
      prompt: vi
        .fn()
        .mockRejectedValueOnce(new Error("rate limit, retry delay: 10s"))
        .mockResolvedValue(undefined),
    };
    const delays: number[] = [];
    const onRetry = vi.fn((_attempt: number, _error: ProviderError, delayMs: number) => {
      delays.push(delayMs);
    });
    const retryable = new RetryableSession(
      session,
      { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 60000, jitterFactor: 0 },
      onRetry,
    );

    const promise = retryable.prompt("hello");
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await promise;
    expect(result.success).toBe(true);
    // Delay should be at least 10000ms (from retryAfterMs)
    expect(delays[0]).toBeGreaterThanOrEqual(10_000);
  });

  it("calls onRetry callback with correct args", async () => {
    const session = {
      prompt: vi
        .fn()
        .mockRejectedValueOnce(new Error("overloaded"))
        .mockResolvedValue(undefined),
    };
    const onRetry = vi.fn();
    const retryable = new RetryableSession(
      session,
      { baseDelayMs: 10, maxDelayMs: 1000, jitterFactor: 0 },
      onRetry,
    );

    const promise = retryable.prompt("hello");
    await vi.advanceTimersByTimeAsync(10);

    await promise;
    expect(onRetry).toHaveBeenCalledWith(
      1, // attempt number
      expect.objectContaining({
        errorType: ProviderErrorType.Overloaded,
        retryable: true,
      }),
      10, // delay ms
    );
  });

  it("handles zero maxRetries (no retry)", async () => {
    const session = {
      prompt: vi.fn().mockRejectedValue(new Error("rate limit exceeded")),
    };
    const onRetry = vi.fn();
    const retryable = new RetryableSession(
      session,
      { maxRetries: 0, baseDelayMs: 100, maxDelayMs: 1000, jitterFactor: 0 },
      onRetry,
    );

    const result = await retryable.prompt("hello");
    expect(result.success).toBe(false);
    expect(result.error?.errorType).toBe(ProviderErrorType.RateLimit);
    expect(result.attempts).toBe(1);
    expect(session.prompt).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("applies jitter within expected bounds", async () => {
    // Seed Math.random to produce predictable jitter
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const session = {
      prompt: vi
        .fn()
        .mockRejectedValueOnce(new Error("overloaded"))
        .mockResolvedValue(undefined),
    };
    const delays: number[] = [];
    const onRetry = vi.fn((_attempt: number, _error: ProviderError, delayMs: number) => {
      delays.push(delayMs);
    });
    const retryable = new RetryableSession(
      session,
      {
        maxRetries: 1,
        baseDelayMs: 100,
        maxDelayMs: 60000,
        jitterFactor: 0.1,
      },
      onRetry,
    );

    const promise = retryable.prompt("hello");
    // jitter = 100 * 0.1 * 0.5 = 5, exponential = 100 * 2^0 = 100, total = 105
    await vi.advanceTimersByTimeAsync(105);

    await promise;
    expect(delays[0]).toBe(105);

    randomSpy.mockRestore();
  });
});
