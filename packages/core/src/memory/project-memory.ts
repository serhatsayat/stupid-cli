import Database from "better-sqlite3";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { StupidConfig, ProjectMemoryRecord, TaskSpec } from "../types/index.js";
import type { IProjectMemory } from "../orchestrator/interfaces.js";

// Words too common to be useful in FTS queries
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
  "be", "has", "had", "have", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "not", "no", "so",
  "if", "as", "up", "out", "about", "into", "over", "after", "then",
]);

/**
 * Persistent project memory backed by SQLite + FTS5 full-text search.
 *
 * Stores decision records with BM25-ranked retrieval for enriching
 * sub-agent context. Implements the IProjectMemory interface from
 * the orchestrator's dependency-injection contract.
 *
 * Observability: call getStats() for record count, DB size, last updated.
 * Inspection: .stupid/MEMORY.db is a standard SQLite file.
 */
export class ProjectMemory implements IProjectMemory {
  private db: Database.Database;
  private dbPath: string;

  constructor(config: StupidConfig) {
    const stateDir = join(config.projectRoot, ".stupid");
    mkdirSync(stateDir, { recursive: true });
    this.dbPath = join(stateDir, "MEMORY.db");
    this.db = new Database(this.dbPath);

    // Enable WAL for better concurrent read performance
    this.db.pragma("journal_mode = WAL");

    this.initSchema();
  }

  // ─── Schema ──────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        sliceName TEXT,
        date TEXT,
        summary TEXT,
        decisions TEXT,
        patterns TEXT,
        bugs TEXT,
        filesChanged TEXT,
        testsAdded INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        model TEXT,
        category TEXT DEFAULT 'decision',
        content TEXT DEFAULT '',
        source TEXT DEFAULT '',
        timestamp TEXT,
        relevance REAL DEFAULT 0.5,
        tags TEXT DEFAULT '[]'
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
        summary,
        decisions,
        patterns,
        content='decisions',
        content_rowid='rowid'
      );
    `);

    // Content-sync triggers: keep FTS5 index in sync with decisions table
    // Use IF NOT EXISTS workaround — SQLite triggers don't support it,
    // so we drop and recreate idempotently.
    this.db.exec(`
      DROP TRIGGER IF EXISTS decisions_ai;
      CREATE TRIGGER decisions_ai AFTER INSERT ON decisions BEGIN
        INSERT INTO decisions_fts(rowid, summary, decisions, patterns)
        VALUES (new.rowid, new.summary, new.decisions, new.patterns);
      END;

      DROP TRIGGER IF EXISTS decisions_ad;
      CREATE TRIGGER decisions_ad AFTER DELETE ON decisions BEGIN
        INSERT INTO decisions_fts(decisions_fts, rowid, summary, decisions, patterns)
        VALUES ('delete', old.rowid, old.summary, old.decisions, old.patterns);
      END;

      DROP TRIGGER IF EXISTS decisions_au;
      CREATE TRIGGER decisions_au AFTER UPDATE ON decisions BEGIN
        INSERT INTO decisions_fts(decisions_fts, rowid, summary, decisions, patterns)
        VALUES ('delete', old.rowid, old.summary, old.decisions, old.patterns);
        INSERT INTO decisions_fts(rowid, summary, decisions, patterns)
        VALUES (new.rowid, new.summary, new.decisions, new.patterns);
      END;
    `);
  }

  // ─── IProjectMemory Interface ────────────────────────────

  async search(query: string, limit = 10): Promise<ProjectMemoryRecord[]> {
    if (!query || !query.trim()) return [];

    const ftsQuery = this.buildFtsQuery(query);
    if (!ftsQuery) return [];

    const stmt = this.db.prepare(`
      SELECT d.*, fts.rank
      FROM decisions_fts fts
      JOIN decisions d ON d.rowid = fts.rowid
      WHERE decisions_fts MATCH ?
      ORDER BY fts.rank
      LIMIT ?
    `);

    const rows = stmt.all(ftsQuery, limit) as Record<string, unknown>[];
    return rows.map((row) => this.rowToRecord(row));
  }

  async getRelevantRecords(taskSpec: TaskSpec): Promise<ProjectMemoryRecord[]> {
    const words = taskSpec.title
      .split(/\s+/)
      .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));

    if (words.length === 0) return [];

    const orQuery = words.join(" OR ");
    return this.search(orQuery);
  }

  // ─── Record Management ───────────────────────────────────

  saveDecisionRecord(record: ProjectMemoryRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO decisions (
        id, sessionId, sliceName, date, summary, decisions, patterns,
        bugs, filesChanged, testsAdded, cost, model, category, content,
        source, timestamp, relevance, tags
      ) VALUES (
        @id, @sessionId, @sliceName, @date, @summary, @decisions, @patterns,
        @bugs, @filesChanged, @testsAdded, @cost, @model, @category, @content,
        @source, @timestamp, @relevance, @tags
      )
    `);

    stmt.run({
      id: record.id,
      sessionId: record.sessionId ?? null,
      sliceName: record.sliceName ?? null,
      date: record.date ?? null,
      summary: record.summary ?? null,
      decisions: JSON.stringify(record.decisions ?? []),
      patterns: JSON.stringify(record.patterns ?? []),
      bugs: JSON.stringify(record.bugs ?? []),
      filesChanged: JSON.stringify(record.filesChanged ?? []),
      testsAdded: record.testsAdded ?? 0,
      cost: record.cost ?? 0,
      model: record.model ?? null,
      category: record.category,
      content: record.content,
      source: record.source,
      timestamp: record.timestamp,
      relevance: record.relevance,
      tags: JSON.stringify(record.tags),
    });
  }

  getPatterns(): ProjectMemoryRecord[] {
    const stmt = this.db.prepare(
      `SELECT * FROM decisions WHERE patterns IS NOT NULL AND patterns != '[]'`
    );
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => this.rowToRecord(row));
  }

  getRecentBugs(limit = 5): ProjectMemoryRecord[] {
    const stmt = this.db.prepare(
      `SELECT * FROM decisions WHERE bugs IS NOT NULL AND bugs != '[]' ORDER BY date DESC LIMIT ?`
    );
    const rows = stmt.all(limit) as Record<string, unknown>[];
    return rows.map((row) => this.rowToRecord(row));
  }

  // ─── Observability ───────────────────────────────────────

  getStats(): { recordCount: number; dbSizeBytes: number; lastUpdated: string | null } {
    const countRow = this.db.prepare("SELECT COUNT(*) as cnt FROM decisions").get() as { cnt: number };
    const dateRow = this.db.prepare("SELECT MAX(date) as maxDate FROM decisions").get() as { maxDate: string | null };

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = statSync(this.dbPath).size;
    } catch {
      // DB file may not exist yet if no writes occurred
    }

    return {
      recordCount: countRow.cnt,
      dbSizeBytes,
      lastUpdated: dateRow.maxDate,
    };
  }

  // ─── Lifecycle ───────────────────────────────────────────

  close(): void {
    this.db.close();
  }

  // ─── Internal Helpers ────────────────────────────────────

  /**
   * Build an FTS5 query string from user input.
   * Appends `*` to short terms (≤5 chars) for prefix matching.
   */
  private buildFtsQuery(query: string): string {
    const terms = query
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (terms.length === 0) return "";

    // If the query already contains OR, pass through as-is with prefix wildcards
    const processed = terms.map((term) => {
      if (term.toUpperCase() === "OR") return "OR";
      // Append wildcard for prefix matching on short terms
      return term.length <= 5 ? `${term}*` : term;
    });

    return processed.join(" ");
  }

  /**
   * Map a raw SQLite row to a ProjectMemoryRecord, parsing JSON array columns.
   */
  private rowToRecord(row: Record<string, unknown>): ProjectMemoryRecord {
    return {
      id: row.id as string,
      category: (row.category as ProjectMemoryRecord["category"]) ?? "decision",
      content: (row.content as string) ?? "",
      source: (row.source as string) ?? "",
      timestamp: (row.timestamp as string) ?? "",
      relevance: (row.relevance as number) ?? 0.5,
      tags: this.parseJsonArray(row.tags),
      sessionId: (row.sessionId as string) ?? undefined,
      sliceName: (row.sliceName as string) ?? undefined,
      date: (row.date as string) ?? undefined,
      summary: (row.summary as string) ?? undefined,
      decisions: this.parseJsonArray(row.decisions),
      patterns: this.parseJsonArray(row.patterns),
      bugs: this.parseJsonArray(row.bugs),
      filesChanged: this.parseJsonArray(row.filesChanged),
      testsAdded: row.testsAdded != null ? (row.testsAdded as number) : undefined,
      cost: row.cost != null ? (row.cost as number) : undefined,
      model: (row.model as string) ?? undefined,
    };
  }

  private parseJsonArray(value: unknown): string[] {
    if (value == null) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  }
}
