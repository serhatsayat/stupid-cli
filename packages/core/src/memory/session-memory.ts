import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ActivityEventType, SessionState } from "../types/index.js";

/**
 * Per-session event tracking and snapshot storage backed by SQLite.
 *
 * Stores session events (task starts, completions, failures, cost tracking)
 * and session state snapshots with tiered compression to keep snapshots
 * under a 2 KB threshold.
 *
 * Observability: call getSnapshot(sessionId) for current session state.
 * Inspection: .stupid/sessions.db is a standard SQLite file.
 * Failure visibility: SQLite errors propagate as thrown exceptions.
 */
export class SessionMemory {
  private db: Database.Database;

  constructor(stateDir: string) {
    mkdirSync(stateDir, { recursive: true });
    const dbPath = join(stateDir, "sessions.db");
    this.db = new Database(dbPath);

    // Enable WAL for better concurrent read performance
    this.db.pragma("journal_mode = WAL");

    this.initSchema();
  }

  // ─── Schema ──────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        startedAt TEXT,
        snapshot TEXT,
        snapshotSize INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT,
        eventType TEXT,
        data TEXT,
        timestamp TEXT
      );
    `);
  }

  // ─── Event Recording ─────────────────────────────────────

  /**
   * Record a session event (e.g. task_started, cost_recorded).
   * Data is JSON-stringified for storage.
   */
  recordEvent(
    sessionId: string,
    eventType: ActivityEventType,
    data?: unknown,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (sessionId, eventType, data, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      sessionId,
      eventType,
      data !== undefined ? JSON.stringify(data) : null,
      new Date().toISOString(),
    );
  }

  // ─── Snapshot Management ─────────────────────────────────

  /**
   * Save a session state snapshot with tiered compression.
   *
   * If the serialized snapshot is ≤ 2048 bytes, it is stored as-is.
   * If > 2048 bytes, completedTasks and failedTasks arrays are replaced
   * with their counts to reduce size while preserving essential state.
   */
  saveSnapshot(sessionId: string, state: SessionState): void {
    let json = JSON.stringify(state);

    if (Buffer.byteLength(json, "utf-8") > 2048) {
      // Tiered compression: replace task arrays with counts
      const compressed = {
        ...state,
        completedTasks: state.completedTasks.length,
        failedTasks: state.failedTasks.length,
      };
      json = JSON.stringify(compressed);
    }

    const size = Buffer.byteLength(json, "utf-8");

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (sessionId, startedAt, snapshot, snapshotSize)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(sessionId, state.startedAt, json, size);
  }

  /**
   * Retrieve a session state snapshot, or null if the session doesn't exist.
   */
  getSnapshot(sessionId: string): SessionState | null {
    const stmt = this.db.prepare(
      `SELECT snapshot FROM sessions WHERE sessionId = ?`,
    );
    const row = stmt.get(sessionId) as { snapshot: string } | undefined;
    if (!row) return null;

    return JSON.parse(row.snapshot) as SessionState;
  }

  // ─── Event Retrieval ─────────────────────────────────────

  /**
   * Get events for a session, ordered by insertion (ascending).
   * Optionally limit the number of results.
   */
  getEvents(
    sessionId: string,
    limit?: number,
  ): Array<{ eventType: string; data: unknown; timestamp: string }> {
    const sql = limit
      ? `SELECT eventType, data, timestamp FROM events WHERE sessionId = ? ORDER BY id ASC LIMIT ?`
      : `SELECT eventType, data, timestamp FROM events WHERE sessionId = ? ORDER BY id ASC`;

    const stmt = this.db.prepare(sql);
    const rows = (
      limit ? stmt.all(sessionId, limit) : stmt.all(sessionId)
    ) as Array<{ eventType: string; data: string | null; timestamp: string }>;

    return rows.map((row) => ({
      eventType: row.eventType,
      data: row.data ? JSON.parse(row.data) : null,
      timestamp: row.timestamp,
    }));
  }

  // ─── Lifecycle ───────────────────────────────────────────

  /**
   * Close the underlying SQLite database connection.
   */
  close(): void {
    this.db.close();
  }
}
