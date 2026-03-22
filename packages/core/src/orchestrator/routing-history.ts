import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ComplexityTier, RoutingRecord, ProviderErrorType } from "../types/index.js";
import type { IRoutingHistory } from "./interfaces.js";

/**
 * SQLite-backed routing history for adaptive model selection.
 *
 * Records which model was used for each phase+tier combination,
 * tracks success rates, and recommends the best model based on
 * empirical data. Cold-start protection requires ≥3 samples before
 * making a recommendation.
 *
 * All methods are synchronous (better-sqlite3 is sync), matching
 * the IRoutingHistory interface contract.
 *
 * Observability:
 *   - `.stupid/routing.db` is a standard SQLite file, inspectable with any SQLite tool
 *   - `getStats()` returns record counts per phase for quick health checks
 *   - `errorType` column captures ProviderErrorType for post-hoc failure analysis
 */
export class RoutingHistory implements IRoutingHistory {
  private db: Database.Database;

  constructor(stateDir: string) {
    mkdirSync(stateDir, { recursive: true });
    this.db = new Database(join(stateDir, "routing.db"));
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  // ─── Schema ──────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS routing_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase TEXT NOT NULL,
        complexityTier TEXT NOT NULL,
        model TEXT NOT NULL,
        success INTEGER NOT NULL,
        tokensUsed INTEGER DEFAULT 0,
        costUsd REAL DEFAULT 0,
        durationMs INTEGER DEFAULT 0,
        errorType TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_phase_tier
        ON routing_history(phase, complexityTier);
    `);
  }

  // ─── IRoutingHistory Interface ───────────────────────────

  /**
   * Insert a routing outcome record. Synchronous.
   */
  record(entry: Omit<RoutingRecord, "id">): void {
    const stmt = this.db.prepare(`
      INSERT INTO routing_history
        (phase, complexityTier, model, success, tokensUsed, costUsd, durationMs, errorType, timestamp)
      VALUES
        (@phase, @complexityTier, @model, @success, @tokensUsed, @costUsd, @durationMs, @errorType, @timestamp)
    `);

    stmt.run({
      phase: entry.phase,
      complexityTier: entry.complexityTier,
      model: entry.model,
      success: entry.success ? 1 : 0,
      tokensUsed: entry.tokensUsed,
      costUsd: entry.costUsd,
      durationMs: entry.durationMs,
      errorType: entry.errorType ?? null,
      timestamp: entry.timestamp,
    });
  }

  /**
   * Return the best-performing model for a given phase+tier combination.
   *
   * Requires ≥3 samples per model before considering it (cold-start protection).
   * Ranks by success rate descending, then by lower average cost as tiebreaker.
   * Returns null when no model has enough samples.
   */
  getBestModel(phase: string, tier: ComplexityTier): string | null {
    const stmt = this.db.prepare(`
      SELECT
        model,
        COUNT(*) as total,
        SUM(success) as successes,
        AVG(costUsd) as avgCost
      FROM routing_history
      WHERE phase = ? AND complexityTier = ?
      GROUP BY model
      HAVING total >= 3
      ORDER BY (CAST(successes AS REAL) / total) DESC, avgCost ASC
      LIMIT 1
    `);

    const row = stmt.get(phase, tier) as { model: string } | undefined;
    return row?.model ?? null;
  }

  /**
   * Return aggregate statistics: total records and per-phase counts.
   */
  getStats(): { total: number; byPhase: Record<string, number> } {
    const totalRow = this.db.prepare(
      "SELECT COUNT(*) as cnt FROM routing_history",
    ).get() as { cnt: number };

    const phaseRows = this.db.prepare(
      "SELECT phase, COUNT(*) as cnt FROM routing_history GROUP BY phase",
    ).all() as { phase: string; cnt: number }[];

    const byPhase: Record<string, number> = {};
    for (const row of phaseRows) {
      byPhase[row.phase] = row.cnt;
    }

    return { total: totalRow.cnt, byPhase };
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close();
  }
}
