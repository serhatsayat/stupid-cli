import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoutingHistory } from "../orchestrator/routing-history.js";
import { ProviderErrorType } from "../types/index.js";
import type { ComplexityTier, RoutingRecord } from "../types/index.js";

// ─── Helpers ─────────────────────────────────────────────

function makeEntry(
  overrides: Partial<Omit<RoutingRecord, "id">> = {},
): Omit<RoutingRecord, "id"> {
  return {
    phase: "implementation",
    complexityTier: "standard" as ComplexityTier,
    model: "sonnet",
    success: true,
    tokensUsed: 1000,
    costUsd: 0.01,
    durationMs: 500,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("RoutingHistory", () => {
  let tmpDir: string;
  let history: RoutingHistory;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "routing-history-test-"));
    history = new RoutingHistory(tmpDir);
  });

  afterEach(() => {
    try {
      history.close();
    } catch {
      // already closed in lifecycle tests
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Record and retrieve ────────────────────────────────

  it("returns the highest-success-rate model after 3+ entries", () => {
    // Record 3 successful entries for sonnet
    for (let i = 0; i < 3; i++) {
      history.record(makeEntry({ model: "sonnet", success: true }));
    }

    const best = history.getBestModel("implementation", "standard");
    expect(best).toBe("sonnet");
  });

  // ── Cold start ─────────────────────────────────────────

  it("returns null on cold start (no entries)", () => {
    const best = history.getBestModel("implementation", "standard");
    expect(best).toBeNull();
  });

  it("returns null when fewer than 3 samples exist", () => {
    history.record(makeEntry({ model: "sonnet", success: true }));
    history.record(makeEntry({ model: "sonnet", success: true }));

    const best = history.getBestModel("implementation", "standard");
    expect(best).toBeNull();
  });

  // ── Exactly 3 samples threshold ────────────────────────

  it("returns model at exactly 3 samples", () => {
    for (let i = 0; i < 3; i++) {
      history.record(makeEntry({ model: "haiku", success: true }));
    }

    expect(history.getBestModel("implementation", "standard")).toBe("haiku");
  });

  it("returns null at exactly 2 samples", () => {
    history.record(makeEntry({ model: "haiku", success: true }));
    history.record(makeEntry({ model: "haiku", success: true }));

    expect(history.getBestModel("implementation", "standard")).toBeNull();
  });

  // ── Multiple models compared ───────────────────────────

  it("returns the model with higher success rate", () => {
    // haiku: 2/3 success = 66.7%
    history.record(makeEntry({ model: "haiku", success: true }));
    history.record(makeEntry({ model: "haiku", success: true }));
    history.record(makeEntry({ model: "haiku", success: false }));

    // sonnet: 3/3 success = 100%
    history.record(makeEntry({ model: "sonnet", success: true }));
    history.record(makeEntry({ model: "sonnet", success: true }));
    history.record(makeEntry({ model: "sonnet", success: true }));

    const best = history.getBestModel("implementation", "standard");
    expect(best).toBe("sonnet");
  });

  // ── Tie-breaking by cost ───────────────────────────────

  it("breaks success-rate ties by lower average cost", () => {
    // haiku: 3/3 success, avgCost = 0.005
    for (let i = 0; i < 3; i++) {
      history.record(
        makeEntry({ model: "haiku", success: true, costUsd: 0.005 }),
      );
    }

    // sonnet: 3/3 success, avgCost = 0.02
    for (let i = 0; i < 3; i++) {
      history.record(
        makeEntry({ model: "sonnet", success: true, costUsd: 0.02 }),
      );
    }

    const best = history.getBestModel("implementation", "standard");
    expect(best).toBe("haiku");
  });

  // ── Error type recording ───────────────────────────────

  it("records entries with errorType without crashing", () => {
    history.record(
      makeEntry({
        success: false,
        errorType: ProviderErrorType.RateLimit,
      }),
    );
    history.record(
      makeEntry({
        success: false,
        errorType: ProviderErrorType.Overloaded,
      }),
    );
    history.record(
      makeEntry({
        success: true,
      }),
    );

    const stats = history.getStats();
    expect(stats.total).toBe(3);
  });

  // ── Stats ──────────────────────────────────────────────

  it("returns correct total and byPhase counts", () => {
    history.record(makeEntry({ phase: "research" }));
    history.record(makeEntry({ phase: "research" }));
    history.record(makeEntry({ phase: "implementation" }));
    history.record(makeEntry({ phase: "review" }));

    const stats = history.getStats();
    expect(stats.total).toBe(4);
    expect(stats.byPhase).toEqual({
      research: 2,
      implementation: 1,
      review: 1,
    });
  });

  // ── Empty DB stats ─────────────────────────────────────

  it("returns empty stats on fresh DB", () => {
    const stats = history.getStats();
    expect(stats).toEqual({ total: 0, byPhase: {} });
  });

  // ── Close lifecycle ────────────────────────────────────

  it("allows new instance after close on same path", () => {
    // Record data, close, reopen, verify data persists
    for (let i = 0; i < 3; i++) {
      history.record(makeEntry({ model: "sonnet", success: true }));
    }
    history.close();

    const history2 = new RoutingHistory(tmpDir);
    expect(history2.getBestModel("implementation", "standard")).toBe("sonnet");
    expect(history2.getStats().total).toBe(3);
    history2.close();
  });

  // ── Multiple phase+tier combinations ───────────────────

  it("isolates getBestModel results by phase and tier", () => {
    // Record for research+light: haiku 3/3
    for (let i = 0; i < 3; i++) {
      history.record(
        makeEntry({
          phase: "research",
          complexityTier: "light",
          model: "haiku",
          success: true,
        }),
      );
    }

    // Record for implementation+heavy: opus 3/3
    for (let i = 0; i < 3; i++) {
      history.record(
        makeEntry({
          phase: "implementation",
          complexityTier: "heavy",
          model: "opus",
          success: true,
        }),
      );
    }

    // Each combo returns its own best model
    expect(history.getBestModel("research", "light")).toBe("haiku");
    expect(history.getBestModel("implementation", "heavy")).toBe("opus");

    // Cross-queries return null (no data for those combos)
    expect(history.getBestModel("research", "heavy")).toBeNull();
    expect(history.getBestModel("implementation", "light")).toBeNull();
  });

  // ── Model below threshold ignored ─────────────────────

  it("ignores models below 3-sample threshold when others qualify", () => {
    // haiku: 2 samples (below threshold)
    history.record(makeEntry({ model: "haiku", success: true }));
    history.record(makeEntry({ model: "haiku", success: true }));

    // sonnet: 3 samples (meets threshold), 2/3 success
    history.record(makeEntry({ model: "sonnet", success: true }));
    history.record(makeEntry({ model: "sonnet", success: true }));
    history.record(makeEntry({ model: "sonnet", success: false }));

    // Even though haiku has 100% success on 2 samples, sonnet qualifies
    expect(history.getBestModel("implementation", "standard")).toBe("sonnet");
  });
});
