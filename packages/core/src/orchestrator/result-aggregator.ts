import type { AgentResult } from "../types/index.js";

// ─── Aggregated Result ───────────────────────────────────────

export interface AggregatedResult {
  totalTokens: number;
  totalCostUsd: number;
  totalDurationMs: number;
  summaryOutput: string;
  allSucceeded: boolean;
}

// ─── ResultAggregator ────────────────────────────────────────

/**
 * Merges multiple AgentResults into a single summary.
 *
 * Sums tokens, cost, and duration across all results.
 * Concatenates outputs with role headers for traceability.
 * `allSucceeded` is true only if every result has `success: true`.
 */
export class ResultAggregator {
  /**
   * Merge an array of AgentResults into a single aggregated view.
   *
   * @param results - Agent results to merge (order preserved in output)
   * @returns Aggregated totals, concatenated output, and success flag
   */
  static merge(results: AgentResult[]): AggregatedResult {
    let totalTokens = 0;
    let totalCostUsd = 0;
    let totalDurationMs = 0;
    let allSucceeded = true;
    const outputParts: string[] = [];

    for (const result of results) {
      totalTokens += result.tokensUsed;
      totalCostUsd += result.costUsd;
      totalDurationMs += result.durationMs;

      if (!result.success) {
        allSucceeded = false;
      }

      // Role-labeled summary for traceability
      const header = `── ${result.role} (${result.model}) ──`;
      const body = result.success
        ? result.output
        : `[FAILED] ${result.error ?? "Unknown error"}`;
      outputParts.push(`${header}\n${body}`);
    }

    return {
      totalTokens,
      totalCostUsd,
      totalDurationMs,
      summaryOutput: outputParts.join("\n\n"),
      allSucceeded,
    };
  }
}
