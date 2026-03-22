import { describe, it, expect } from "vitest";
import { AgentRole } from "../types/index.js";
import type { AgentResult } from "../types/index.js";
import { ResultAggregator } from "../orchestrator/result-aggregator.js";

// ─── Helpers ─────────────────────────────────────────────────

function makeResult(
  overrides?: Partial<AgentResult>,
): AgentResult {
  return {
    role: AgentRole.Research,
    model: "claude-sonnet-4-6",
    success: true,
    output: "Default output",
    tokensUsed: 100,
    costUsd: 0.01,
    durationMs: 500,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("ResultAggregator", () => {
  describe("merge()", () => {
    it("sums tokens, cost, and duration across multiple results", () => {
      const results: AgentResult[] = [
        makeResult({ tokensUsed: 200, costUsd: 0.02, durationMs: 1000 }),
        makeResult({ tokensUsed: 300, costUsd: 0.03, durationMs: 2000 }),
        makeResult({ tokensUsed: 150, costUsd: 0.015, durationMs: 500 }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.totalTokens).toBe(650);
      expect(merged.totalCostUsd).toBeCloseTo(0.065, 5);
      expect(merged.totalDurationMs).toBe(3500);
    });

    it("sets allSucceeded to true when all results succeed", () => {
      const results: AgentResult[] = [
        makeResult({ success: true }),
        makeResult({ success: true }),
        makeResult({ success: true }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.allSucceeded).toBe(true);
    });

    it("sets allSucceeded to false when any result fails", () => {
      const results: AgentResult[] = [
        makeResult({ success: true }),
        makeResult({ success: false, error: "Agent crashed" }),
        makeResult({ success: true }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.allSucceeded).toBe(false);
    });

    it("concatenates outputs with role-labeled headers", () => {
      const results: AgentResult[] = [
        makeResult({
          role: AgentRole.Research,
          model: "claude-haiku-3-5",
          output: "Found 3 relevant files",
        }),
        makeResult({
          role: AgentRole.Spec,
          model: "claude-sonnet-4-6",
          output: "Requirements defined",
        }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.summaryOutput).toContain("── research (claude-haiku-3-5) ──");
      expect(merged.summaryOutput).toContain("Found 3 relevant files");
      expect(merged.summaryOutput).toContain("── spec (claude-sonnet-4-6) ──");
      expect(merged.summaryOutput).toContain("Requirements defined");
    });

    it("shows [FAILED] with error message for failed results", () => {
      const results: AgentResult[] = [
        makeResult({
          role: AgentRole.Research,
          success: false,
          output: "",
          error: "Rate limit exceeded",
        }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.summaryOutput).toContain("[FAILED] Rate limit exceeded");
    });

    it("shows [FAILED] Unknown error when no error message", () => {
      const results: AgentResult[] = [
        makeResult({
          success: false,
          output: "",
          error: undefined,
        }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.summaryOutput).toContain("[FAILED] Unknown error");
    });

    it("handles empty results array", () => {
      const merged = ResultAggregator.merge([]);

      expect(merged.totalTokens).toBe(0);
      expect(merged.totalCostUsd).toBe(0);
      expect(merged.totalDurationMs).toBe(0);
      expect(merged.summaryOutput).toBe("");
      expect(merged.allSucceeded).toBe(true);
    });

    it("handles single result", () => {
      const results = [
        makeResult({
          role: AgentRole.Architect,
          tokensUsed: 500,
          costUsd: 0.05,
          durationMs: 3000,
        }),
      ];

      const merged = ResultAggregator.merge(results);

      expect(merged.totalTokens).toBe(500);
      expect(merged.totalCostUsd).toBe(0.05);
      expect(merged.totalDurationMs).toBe(3000);
      expect(merged.allSucceeded).toBe(true);
    });
  });
});
