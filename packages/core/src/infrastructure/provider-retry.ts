import {
  ProviderErrorType,
  type ProviderError,
  type RetryConfig,
} from "../types/index.js";

// ─── Default Configuration ───────────────────────────────────

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  jitterFactor: 0.1,
};

// ─── Error Classification ────────────────────────────────────

/**
 * Pattern → classification mapping. Order matters: more specific patterns
 * are checked before generic ones so that e.g. "rate_limit" matches before
 * a bare status-code "429" that might appear in a different context.
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  errorType: ProviderErrorType;
  retryable: boolean;
}> = [
  {
    pattern: /rate.?limit|too many requests|429/i,
    errorType: ProviderErrorType.RateLimit,
    retryable: true,
  },
  {
    pattern: /overloaded|529/i,
    errorType: ProviderErrorType.Overloaded,
    retryable: true,
  },
  {
    pattern:
      /internal.?server|server.?error|500|502|503|504|service.?unavailable/i,
    errorType: ProviderErrorType.ServerError,
    retryable: true,
  },
  {
    pattern: /authentication|unauthorized|401|invalid.?api.?key/i,
    errorType: ProviderErrorType.AuthError,
    retryable: false,
  },
  {
    pattern: /bad.?request|invalid.?request|400/i,
    errorType: ProviderErrorType.InvalidRequest,
    retryable: false,
  },
  {
    pattern: /permission.?denied|forbidden|403/i,
    errorType: ProviderErrorType.PermissionDenied,
    retryable: false,
  },
  {
    pattern: /context.?length|too.?long|token.?limit|context.?window/i,
    errorType: ProviderErrorType.ContextOverflow,
    retryable: false,
  },
  {
    pattern:
      /network.?error|connection.?error|connection.?refused|fetch.?failed|socket.?hang/i,
    errorType: ProviderErrorType.NetworkError,
    retryable: true,
  },
  {
    pattern: /timed?.?out|timeout/i,
    errorType: ProviderErrorType.Timeout,
    retryable: true,
  },
];

/**
 * Extracts a `Retry-After`-style hint from the error message.
 * Recognised formats:
 *   - "retry delay: 34s"
 *   - "retry in 30s"
 *   - "Retry-After: 30"
 *   - "retry after 5s"
 * Returns milliseconds, or `undefined` when no hint is found.
 */
function parseRetryAfterMs(message: string): number | undefined {
  const match = message.match(
    /retry[\s_-]*(?:after|delay|in)[:\s]*(\d+)\s*s?/i,
  );
  if (!match) return undefined;
  const seconds = parseInt(match[1], 10);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

/**
 * Classifies an unknown thrown value into a typed `ProviderError`.
 *
 * The function extracts a message string from `Error` instances (including
 * nested `cause` chains) or falls back to `String(err)`. It then matches
 * against known Anthropic / network error patterns.
 *
 * Unknown errors default to `retryable: false` (conservative — avoids
 * burning budget on errors that won't resolve).
 */
export function classifyError(err: unknown): ProviderError {
  const message = extractMessage(err);
  const retryAfterMs = parseRetryAfterMs(message);

  for (const { pattern, errorType, retryable } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return { errorType, retryable, retryAfterMs, originalMessage: message };
    }
  }

  // Fallback: unknown → non-retryable
  return {
    errorType: ProviderErrorType.Unknown,
    retryable: false,
    retryAfterMs,
    originalMessage: message,
  };
}

/** Recursively extract a message string from an error value. */
function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    // Include nested cause if present (common in fetch wrappers)
    const causeMsg =
      err.cause instanceof Error ? ` [cause: ${err.cause.message}]` : "";
    return err.message + causeMsg;
  }
  return String(err);
}

// ─── Retry Session ───────────────────────────────────────────

export interface RetryResult {
  success: boolean;
  error?: ProviderError;
  attempts: number;
}

/**
 * Wraps a session's `prompt()` call with exponential backoff + jitter.
 *
 * Retry formula:
 *   `delay = min(baseDelayMs × 2^attempt + randomJitter, maxDelayMs)`
 * where jitter = `baseDelayMs × jitterFactor × Math.random()`.
 *
 * If the classified error carries a `retryAfterMs` hint (parsed from the
 * error message), the actual delay is `max(calculatedDelay, retryAfterMs)`.
 *
 * Observability: callers can pass an `onRetry` callback that fires before
 * each wait, enabling external logging / metrics without coupling the
 * retry loop to any particular logging framework.
 */
export class RetryableSession {
  private readonly config: RetryConfig;
  private readonly session: { prompt: (input: string) => Promise<void> };
  private readonly onRetry?: (
    attempt: number,
    error: ProviderError,
    delayMs: number,
  ) => void;

  constructor(
    session: { prompt: (input: string) => Promise<void> },
    config?: Partial<RetryConfig>,
    onRetry?: (
      attempt: number,
      error: ProviderError,
      delayMs: number,
    ) => void,
  ) {
    this.session = session;
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.onRetry = onRetry;
  }

  /**
   * Attempt `session.prompt(input)` with automatic retries on transient
   * errors. Returns a structured result indicating success/failure,
   * the classified error (on failure), and how many attempts were made.
   */
  async prompt(input: string): Promise<RetryResult> {
    let attempts = 0;

    while (true) {
      attempts++;
      try {
        await this.session.prompt(input);
        return { success: true, attempts };
      } catch (err) {
        const classified = classifyError(err);

        // Non-retryable → abort immediately
        if (!classified.retryable) {
          return { success: false, error: classified, attempts };
        }

        // Exhausted retries → return last error
        if (attempts > this.config.maxRetries) {
          return { success: false, error: classified, attempts };
        }

        // Calculate backoff delay
        const delay = this.calculateDelay(
          attempts - 1, // 0-indexed for exponent
          classified.retryAfterMs,
        );

        // Notify observer before sleeping
        this.onRetry?.(attempts, classified, delay);

        await sleep(delay);
      }
    }
  }

  /**
   * Exponential backoff with jitter, capped at `maxDelayMs`.
   * If the error provides a `retryAfterMs` hint, we honour it as a floor.
   */
  private calculateDelay(attempt: number, retryAfterMs?: number): number {
    const { baseDelayMs, maxDelayMs, jitterFactor } = this.config;

    const exponential = baseDelayMs * Math.pow(2, attempt);
    const jitter = baseDelayMs * jitterFactor * Math.random();
    const calculated = Math.min(exponential + jitter, maxDelayMs);

    // Honour server-provided retry-after as a floor
    if (retryAfterMs !== undefined) {
      return Math.max(calculated, retryAfterMs);
    }
    return calculated;
  }
}

// ─── Utilities ───────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
